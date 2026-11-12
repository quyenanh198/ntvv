# Đặc tả NTVV 3D

> Phiên bản 1.0 · 12/11/2026 · dựa trên `master` tại `f22acff`
> Phạm vi: thay toàn bộ client 2D (`public/`) bằng client 3D. Server, luật chơi và dữ liệu người chơi giữ nguyên.
> Tài liệu liên quan: luật chơi ở [`gameplay-spec.md`](gameplay-spec.md), phong cách hình ảnh ở [`art-direction.md`](art-direction.md), bản thử 3D ở [`../prototype/3d/`](../prototype/3d/).

## 1. Mục tiêu

### 1.1. Vì sao chuyển sang 3D

Client hiện tại vẽ trang trại bằng HTML và ảnh PNG: các ô đất là danh sách thẻ, mọi tương tác diễn ra trong các bảng (sheet). Bản thử 3D (PR #131) cho thấy cùng vòng chơi đó trở nên sống động hơn khi người chơi nhìn thấy cô nông dân đi tới ô đất, cây lớn và đung đưa, máy xay quay, xe tải tới lấy hàng. Mục tiêu của bản 3D là giữ nguyên chiều sâu kinh tế đã cân bằng của game, nhưng biến mỗi hành động thành một khoảnh khắc nhìn thấy được.

### 1.2. Mục tiêu đo được

| # | Mục tiêu | Cách đo | Ngưỡng nghiệm thu |
|---|---|---|---|
| M1 | Đủ tính năng | Mỗi route trong §3.2 có điểm chạm trong 3D hoặc trong sheet | 59/59 POST, 8/8 GET |
| M2 | Mượt trên điện thoại tầm trung | Chrome, CPU throttle 4×, 390×844 @3x, cảnh bận (xe tải, máy chạy, 12 ô đang lớn) | thời gian script mỗi khung p50 ≤ 10 ms, p95 ≤ 18 ms; ≥ 55 fps trung bình |
| M3 | Không giật trên máy yếu | throttle 6× | ≥ 30 fps nhờ hạ chất lượng tự động (§7.3) |
| M4 | Tải nhanh | dung lượng truyền khi mở lần đầu, nén | ≤ 1,0 MB (hiện CI giới hạn 1,2 MB cho bản 2D) |
| M5 | Trang trại lớn vẫn mượt | trang trại 400 ô (tối đa), 15 loại vật nuôi, 12 máy | ≤ 160 draw call, ≤ 350 nghìn tam giác |
| M6 | Dùng được mà không cần nhìn hình 3D | UI audit (§9.3) ở 320/390/768/1280 px; mọi hành động có nút trong sheet | 0 lỗi tràn, chạm ≥ 44 px, tương phản ≥ 4,5:1 |
| M7 | Không mất dữ liệu | toàn bộ test server hiện có | 43/43 file test vẫn qua, không migration dữ liệu |

### 1.3. Không làm

- Không đổi luật chơi, giá, thời gian hay công thức. Mọi số liệu vẫn nằm ở `server/src/game.js`.
- Không làm 3D tự do (đi bộ góc nhìn thứ nhất, xoay camera 360°). Camera giữ góc ba phần tư như tranh tham chiếu.
- Không vẽ 186 sản phẩm thành mô hình 3D. Sản phẩm vẫn dùng sprite vẽ tay trong kho, đơn hàng và hiệu ứng bay.
- Không giữ song song client 2D sau khi chuyển xong (§8, giai đoạn P6).

## 2. Hiện trạng (kết quả audit)

### 2.1. Số liệu codebase

| Phần | File | Quy mô |
|---|---|---|
| Server | `server/src/app.js` | 2.829 dòng, toàn bộ route trong một hàm `buildApp` |
| Luật chơi | `server/src/game.js` | 984 dòng, chỉ cấu hình và hàm thuần |
| Dữ liệu | `server/src/db.js` | SQLite WAL, 29 bảng, migration bằng `ALTER TABLE` có kiểm tra cột |
| Client 2D | `public/app.js`, `public/style.css` | 3.248 + 2.476 dòng, dựng HTML bằng chuỗi |
| Test | `test/*.test.js` | 43 file, chạy bằng `node --test` |
| Nội dung | `game.js` | 36 cây trồng, 13 cây ăn quả, 15 vật nuôi, 12 máy / 137 công thức, 186 sản phẩm, 52 món cá nhân hóa (15 danh hiệu, 8 khung, 22 đồ trang trí, 7 thú cưng), 12 kỹ năng, 97 lần mở rộng đất (12 → 400 ô) |

### 2.2. Kiến trúc đang chạy (giữ nguyên)

- Xác thực mượn Chat: server chuyển cookie `lb_session` sang `GET /api/me` của Chat, cache 30 giây.
- Server là trọng tài: thời gian chín, vàng, giới hạn trộm và tưới đều tính ở server; client chỉ vẽ và đếm ngược.
- Mọi POST đi qua `runJournaledMutation`: có `Idempotency-Key` thì gửi lại không bị tính hai lần; mỗi lần ghi tăng `mutation_version`.
- Chống CSRF: POST phải là `application/json`, `Sec-Fetch-Site` và `Origin` phải cùng nguồn.
- Giới hạn tần suất: 180 GET và 90 POST mỗi phút mỗi người.
- Scale-to-zero: container ngủ sau 15 phút không ai chơi; client thử lại mỗi 2 giây khi server đang thức dậy.

### 2.3. Các điểm cần xử lý

| # | Mức | Vấn đề | Chứng cứ | Việc cần làm |
|---|---|---|---|---|
| A1 | Cao | `GET /state` gửi kèm toàn bộ catalog mỗi lần, client gọi lại mỗi 20 giây | khối `config` trong route `/state`: 61 KB JSON (13 KB gzip) | Tách `GET /catalog` có ETag; `/state` chỉ còn trạng thái (P0) |
| A2 | Cao | Mỗi `GET /state` gọi `GET /api/users` của Chat | `app.js`, route `/state` | Cache danh sách gia đình 60 giây (P0) |
| A3 | Trung bình | Mọi request, kể cả GET, đều ghi DB: upsert nông dân, quà hỗ trợ, thuế, nợ, `touchSeen` | `requireFarmer`, `touchSeen` | Chỉ ghi `last_seen_at` khi đã cũ hơn 60 giây; bỏ ghi thừa ở GET (P0) |
| A4 | Trung bình | `SELECT MAX(xp) FROM farmers` chạy ở mọi request | `requireFarmer` | Cache cấp cao nhất của làng trong bộ nhớ, làm mới khi có người lên cấp (P0) |
| A5 | Thấp | Cache phiên bị xóa sạch khi đủ 300 mục, khóa là nguyên chuỗi cookie | `meCache` | Đổi sang LRU, khóa bằng hash của cookie (P0) |
| A6 | Thấp | Hai mốc đổi ngày khác nhau: nhiệm vụ ngày theo nửa đêm giờ VN, thuế đất và bảng trộm theo 9:00 sáng Los Angeles; comment ở `game.js` ghi nhầm "giờ VN" | `todayVN`, `thiefDayKey` | Sửa comment; UI 3D hiển thị đúng giờ chốt của từng loại (P5) |
| A7 | Thấp | `POACH_DAILY_LIMIT` không còn dùng nhưng vẫn được gửi cho client | `game.js` dòng 699 | Bỏ khỏi catalog (P0) |
| A8 | Trung bình | Kiểm tra trình duyệt (`scripts/browser-smoke.mjs`) và giới hạn 1,2 MB dựa trên DOM và ảnh của bản 2D | `docs/performance-baseline.md` | Viết lại cho 3D (§9) trước khi xóa 2D (P6) |
| A9 | Thấp | `app.js` 2.829 dòng một khối | — | Không bắt buộc. Chỉ tách theo miền khi đang sửa phần đó |
| A10 | Thấp | Giới hạn tần suất (180 GET / 90 POST mỗi phút) chưa có test nào | không file test nào kiểm tra `rate_limited` | Thêm test trước khi client 3D gọi API dày hơn (P0) |

Không phát hiện lỗ hổng bảo mật mới. Xác thực, chống CSRF (`csrf-boundary.test.js`), kiểm tra input (`mutation-target-validation.test.js`, `quantity-validation.test.js`) và idempotency (32 file test replay) đều đã có test; riêng giới hạn tần suất thì chưa (A10).

## 3. Kiến trúc mục tiêu

### 3.1. Tổng quan

```
Trình duyệt
 ├─ DOM: HUD, dock, sheet, thông báo        (ui/)
 ├─ WebGL: trang trại 3D                     (scene/)
 └─ Store: trạng thái + catalog + đồng hồ    (state/)
        │  fetch JSON, Idempotency-Key
        ▼
Server Fastify (giữ nguyên luật) ── SQLite
        │
        └─ Chat: /api/me, /api/users, push
```

Nguyên tắc:

1. **Server quyết định, client diễn.** Client không bao giờ tự cộng vàng, kho hay EXP. Hoạt cảnh bắt đầu ngay khi bấm (nông dân đi tới ô đất), nhưng kết quả chỉ hiện sau khi server trả về. Nếu server báo lỗi, hoạt cảnh dừng lại, cảnh trở về trạng thái cũ và hiện thông báo.
2. **Mọi POST có `Idempotency-Key`.** Bản 2D chỉ gắn khóa cho một số route (`REPLAY_SAFE_POSTS`). Bản 3D gắn cho tất cả, để thử lại khi mạng chập chờn không bao giờ tính hai lần.
3. **Mọi hành động có hai đường.** Chạm vào vật thể trong 3D, hoặc mở sheet tương ứng và bấm nút. Đường sheet bảo đảm bàn phím, trình đọc màn hình và máy không có WebGL vẫn chơi được.
4. **3D chỉ là lớp hiển thị.** Logic giao diện (định dạng, lọc, xác nhận) dùng chung, không phụ thuộc three.js.

### 3.2. Hợp đồng với server

**Giữ nguyên:** 59 route POST và 8 route GET dưới `/farm/api`, kèm toàn bộ mã lỗi hiện có (`state_changed`, `not_ready`, `rate_limited`...).

**Thêm mới trong P0:**

| Route | Nội dung | Cache |
|---|---|---|
| `GET /farm/api/catalog` | Khối `config` hiện có trong `/state`: cây, sản phẩm, vật nuôi, máy, công thức, kỹ năng, đồ trang trí, mở rộng đất | `ETag` theo hash nội dung, `Cache-Control: private, max-age=86400` |
| `GET /farm/api/state?slim=1` | `me`, `family`, `boot`, sự kiện làng; không có `config` | không cache |

Client 2D vẫn gọi `/state` không có `slim`, nên hai client chạy song song được trong lúc chuyển đổi. Đến P6, `slim` thành mặc định và tham số bị bỏ.

**Nhịp đồng bộ:** gọi `/state?slim=1` khi mở trang, sau mỗi POST thành công nếu phản hồi không kèm trạng thái mới, mỗi 20 giây khi tab đang hiển thị, và khi tab hiện lại. Giữa hai lần gọi, client tự chuyển ô sang "chín" dựa trên `readyAt` như bản 2D đang làm.

### 3.3. Cấu trúc thư mục client

Không thêm bước build. Dùng ES module gốc và import map; three.js được cài bằng npm và phục vụ trực tiếp từ `node_modules`.

```
public/
  index.html            import map: "three" → /farm/vendor/three.module.min.js
  main.js               khởi động, vòng lặp khung hình, chọn chất lượng
  net/api.js            fetch, Idempotency-Key, thử lại khi server thức, reload khi đổi boot
  state/store.js        catalog + state + đồng hồ cục bộ, phát sự kiện thay đổi
  scene/
    world.js            mặt đất, đường đá, viền hoa, hồ, đồi, mây
    land.js             lưới đất, mở rộng đất, ô khóa
    crops.js            mô hình cây theo họ (§4.3), InstancedMesh theo loại và giai đoạn
    trees.js            cây ăn quả
    buildings.js        nhà chính, kho, chuồng, ao, sạp chợ, bảng đơn
    animals.js          vật nuôi theo khung chung (§4.4)
    machines.js         12 máy và hoạt cảnh vào/chạy/ra (§4.5)
    farmer.js           cô nông dân chibi, hàng đợi hành động
    vehicles.js         xe tải bán hàng, xe giao đơn
    fx.js               hạt, ripple, vật phẩm bay
    camera.js           kéo, chụm, quán tính, giới hạn
    batch.js            gộp mesh tĩnh, bake mesh màu đỉnh, chọn chất lượng
  ui/
    hud.js  dock.js  toast.js  sheets/*.js   (một file cho mỗi sheet ở §5)
  assets/               giữ sprite hiện có cho cây, sản phẩm, icon
```

Server thêm một static root: `/farm/vendor/` → `node_modules/three/build/`. Ghim phiên bản `three` chính xác trong `package.json`.

## 4. Thế giới 3D

### 4.1. Bố cục

Bản thử 3D đã chốt góc nhìn và phong cách: camera nghiêng khoảng 48° nhìn xuống, ánh nắng từ góc trên bên trái, toon shading ba dải, đường đá lát có kerb, viền lavender và cỏ lau. Bố cục chính thức gồm các khu sau:

| Khu | Vị trí | Nội dung |
|---|---|---|
| Nhà chính | góc trên trái | nhà nông dân, hộp thư (sự kiện làng, báo cáo vắng nhà) |
| Đất trồng | giữa | lưới ô đất, mở rộng dần (§4.2) |
| Chuồng trại | bên trái | một công trình cho mỗi nhóm vật nuôi đã mở |
| Ao | phía trên, gần hồ | ao cá, chỗ câu cá |
| Khu chế biến | bên phải, dọc đường | 12 máy xếp hàng, máy chưa mở hiện là bãi xây dựng có biển cấp mở |
| Chợ | dưới, sát đường cái | sạp chợ, bảng đơn hàng; xe tải chạy trên đường |
| Đường cái | mép dưới | xe tải, khách ghé thăm từ trang trại khác đi bộ vào |

Mọi khu nối với nhau bằng đường đá như bản thử.

### 4.2. Đất trồng từ 12 tới 400 ô

- Ô đất xếp thành lưới 20 × 20. Lần mở rộng thứ *k* (`EXPANSIONS[k]`) mở thêm 4 ô kế tiếp theo vòng xoắn từ khối 3 × 4 ban đầu ra ngoài, để trang trại luôn gọn quanh tâm.
- Lần mở rộng kế tiếp hiện thành dải đất có cọc rào và biển giá (cấp yêu cầu, vàng). Chạm vào thì mở sheet xác nhận.
- Hiệu năng: mỗi tổ hợp (loại cây, giai đoạn) là một `InstancedMesh`. Số draw call phụ thuộc số loại cây đang trồng, không phụ thuộc số ô. Đất, luống và viền dùng chung một instanced mesh.
- Nhãn đếm ngược HTML chỉ hiện cho các ô gần tâm màn hình, tối đa 24 nhãn; ô chín thì cây nảy lên kèm vài đốm lấp lánh, không cần nhãn.

### 4.3. Cây trồng: 36 loại, 10 họ mô hình

Không làm 108 mô hình riêng (36 loại × 3 giai đoạn). Mỗi cây thuộc một họ dựng bằng code, khác nhau ở bảng màu, kích thước và hình quả. Mỗi họ có ba giai đoạn: mầm (dùng chung), đang lớn và chín.

| Họ | Hình dạng | Cây |
|---|---|---|
| Bông hạt | thân mảnh, bông hạt ở ngọn | `luami`, `gao`, `me` |
| Thân cao | thân thẳng, lá dài, trái hoặc hoa ở thân | `ngo`, `mia`, `huongduong` |
| Củ | lá ngọn trên mặt đất, phần củ ló lên | `carot`, `khoaitay`, `hanhtay`, `toi`, `gung`, `khoailang`, `dauphong` |
| Quả bò đất | lá rộng, quả lớn nằm trên đất | `bingo`, `duahau` |
| Giàn leo | cọc tre, dây leo, chùm quả treo | `nho`, `dualeo`, `vani` |
| Bụi quả | bụi lá, quả nhỏ rải trên bụi | `cachua`, `catim`, `ot`, `dautay`, `caphe`, `cacao`, `oliu`, `dauxanh` |
| Bụi lá | lá xếp tầng thành bụi | `tra`, `rauthom`, `cansa`, `sa` |
| Bắp rau | búp lá cuộn tròn | `bapcai`, `bongcai` |
| Hoa | thân, lá, hoa | `hoahong`, `bongvai` |
| Đặc biệt | dựng riêng | `nam` (cụm nấm), `thom` (dứa giữa vòng lá) |

13 cây ăn quả (`cam`, `tao`, `xoai`, `thanhlong`, `chanh`, `dua`, `saurieng`, `quabo`, `dao`, `anhdao`, `coc`, `chuoi`, `quame`) dùng ba khung: tán tròn (cam, táo, chanh, đào, anh đào, bơ, cóc, me), tán xòe nhiệt đới (dừa, chuối) và tán dày (xoài, sầu riêng, thanh long). Số quả treo trên cây bằng `fruits` server trả về. Quả luôn nằm trên mặt tán, không lơ lửng.

Mỗi họ có một ảnh chụp chuẩn từ góc camera game, đặt cạnh sprite 2D để duyệt. Nghiệm thu khi người xem nhận ra loại cây mà không cần nhãn.

### 4.4. Vật nuôi: 15 loại, 4 khung chung

Tất cả theo tỉ lệ chibi đã chốt (đầu 1,2–1,35×; lý do ở [`prototype/3d/README.md`](../prototype/3d/README.md)).

| Khung | Loại |
|---|---|
| Chim | `ga`, `vit`, `cut`, `ngong`, `gatay` |
| Thú nhỏ | `tho` |
| Thú bốn chân | `bo`, `trau`, `heo`, `de`, `cuu`, `alpaca`, `huou` |
| Công trình | `ong` (tổ ong có ong bay quanh), `tam` (nong tằm có tằm bò) |

Trạng thái lấy từ server: đói, đang làm ra sản phẩm, có sản phẩm. Vật nuôi đói đứng yên, có bong bóng xin ăn. Khi có sản phẩm, bong bóng hiện sprite sản phẩm. Vật nuôi trong cùng chuồng giữ khoảng cách và không ra khỏi rào, như bản thử đã sửa.

### 4.5. Máy chế biến: 12 máy, một khung trạng thái

Mỗi máy có một hình dáng nhận ra được, dựng từ bộ khung chung (bàn gỗ, mái, ống khói) và một chi tiết đặc trưng chuyển động khi máy chạy:

| Máy | Chi tiết chuyển động |
|---|---|
| `coixay` Cối xay bột | thớt đá, tay quay, bánh răng (đã có trong bản thử) |
| `bepan` Bếp gia đình | nồi sôi, hơi nước |
| `lonuong` Lò nướng cá | lửa trong lò, khói |
| `lobanh` Lò bánh | cửa lò sáng, khói thơm |
| `mayep` Máy ép nước | trục vít quay, nước chảy xuống ca |
| `noimut` Nồi mứt | muôi khuấy, bọt sủi |
| `nhamaysua` Nhà máy sữa | thùng khuấy bơ lên xuống |
| `mayrang` Máy rang cà phê | trống rang xoay, khói nâu |
| `xuongdet` Xưởng dệt | khung cửi, thoi chạy qua lại |
| `quanvat` Quán ăn vặt | chảo đảo, mái sọc |
| `quanoc` Quán ốc | nồi hấp, đèn lồng |
| `xuongcaocap` Xưởng cao cấp | búa gõ, tia lấp lánh |

Mọi máy dùng chung một máy trạng thái, đúng như bản thử đã kiểm tra với cối xay:

| Trạng thái | Hoạt cảnh |
|---|---|
| Khóa | bãi xây dựng: cọc, dây căng, gỗ, đá, biển "Mở ở cấp *n*" |
| Mở khóa | camera lướt tới, máy dựng lên từng phần, pháo giấy |
| Nạp nguyên liệu | sprite nguyên liệu bay từ nút Kho vào máy |
| Đang chạy | chi tiết đặc trưng chuyển động, thân máy rung nhẹ, khói hoặc bụi, thanh tiến độ của hàng đợi (`machineQueueProgress`) |
| Xong | thành phẩm nảy nhẹ dưới nhãn xanh "Xong! Chạm để lấy" |
| Lấy hàng | thành phẩm bay vào Kho, +EXP nổi lên |

Hàng đợi tối đa 50 mẻ (`MACHINE_QUEUE_MAX`) hiển thị bằng chồng thùng nhỏ cạnh máy, tối đa 5 thùng, kèm số.

### 4.6. Nhân vật và giao thông

- **Nông dân:** chibi, nón lá. Mỗi chạm vào ô đất thêm một việc vào hàng đợi; cô đi tới ô gần nhất trước. Hoạt cảnh cuốc, tưới, gặt lấy từ bản thử. Nhiều việc liên tiếp (gieo hết, thu hết) thì cô đi theo đường ngắn, mỗi ô tối đa 0,35 giây.
- **Xe tải bán hàng:** đến sạp, chất thùng, chạy đi; vàng cộng vào khi xe rời đi (đúng hoạt cảnh bản thử). Giá trị vàng lấy từ phản hồi `POST /sell`.
- **Khách ghé thăm:** khi người khác đang ở trang trại mình (dựa trên sự kiện làng), một nhân vật đi bộ vào từ đường cái.
- **Chó canh vườn** (`dog-hire`): chạy quanh ruộng khi đang được thuê.
- **Côn trùng** (`critter`): xuất hiện trên ô đất đúng thời điểm server báo, chạm để bắt.

### 4.7. Trang trại người khác

`GET /farm/:id` trả trang trại của người khác. Bản 3D dựng cùng cảnh với dữ liệu đó, thêm dải màu và tên chủ ở HUD để không nhầm với nhà mình. Các hành động được phép theo đúng server: hái ké (`poach`, `poach-all`, `poach-animal`, `poach-machine`), tưới giúp, trồng giúp, thu giúp, khám xét (`inspect`). Ô có thể hái ké được viền vàng nhấp nháy.

## 5. Giao diện DOM

Giữ hệ thiết kế của bản thử (HUD một hàng, vòng EXP, nút icon, sheet trượt lên, chạm ≥ 44 px). Mỗi sheet của bản 2D chuyển thành một module, mở được từ dock hoặc bằng cách chạm vào vật thể:

| Sheet | Mở từ vật thể | Route chính |
|---|---|---|
| Kho | nút Kho, nhà kho | `sell`, `buy`, `collection-claim` |
| Chợ / cửa hàng | sạp chợ | `buy`, `buy-animal`, `buy-energy`, `buy-gems`, `want-*` |
| Đơn hàng | bảng đơn | `order-deliver`, `order-discard` |
| Máy (một sheet chung theo máy) | từng máy | `machine-run`, `machine-run-all`, `machine-collect`, `machine-collect-all`, `machine-upgrade`, `mill`, `mill-collect`, `speedup` |
| Chuồng | từng chuồng | `feed`, `collect`, `upgrade-barn`, `upgrade-coop`, `buy-chicken` |
| Ao cá | ao | `fish-stock`, `fish-harvest`, `fish`, `upgrade-pond` |
| Hạt giống | ô đất trống | `plant`, `plant-all`, `plant-tree`, `remove-tree` |
| Nhiệm vụ ngày và rương | hộp thư | `quest-chest` |
| Sao, lễ hội | hộp thư | `star-claim`, `fest-claim` |
| Kỹ năng | nhà chính | `skill-learn`, `skill-respec` |
| Trang trí | nhà chính | `luxury-buy`, `luxury-equip` |
| Vàng (cho, xin, nợ) | dock | `gold-give`, `gold-ask`, `gold-request-act`, `GET /gold-requests` |
| Xổ số | dock | `lottery-buy`, `GET /lottery` |
| Bảng xếp hạng, bảng trộm | dock | `GET /leaderboard`, `GET /thief-board` |
| Báo cáo vắng nhà | tự mở khi có | `away-ack` |
| Mở rộng đất | biển giá ở mép đất | `expand` |
| Thuê chó | chuồng chó | `dog-hire` |

Bản 2D có các thông báo chặn trước khi tiêu tiền lớn (`confirmAction`). Bản 3D giữ đúng các điểm xác nhận đó.

## 6. Âm thanh, chuyển động, trợ năng

- Âm thanh tổng hợp bằng Web Audio, port từ `public/audio.js`. Thêm tiếng cho xe tải, máy chạy, vật nuôi.
- `prefers-reduced-motion`: tắt quán tính camera, rung máy, hạt bay; vật phẩm chuyển thẳng vào Kho.
- Vùng `aria-live` hiện có (`#farm-announcer`) đọc kết quả mỗi hành động, ví dụ "Thu 12 Lúa mì, +18 EXP".
- Canvas có `aria-label` mô tả trang trại; mọi thao tác có nút tương đương trong sheet (nguyên tắc 3 ở §3.1).
- Máy không có WebGL: hiện thông báo ngắn kèm chế độ chỉ có sheet, vẫn chơi đủ tính năng.

## 7. Hiệu năng

### 7.1. Ngân sách

| Chỉ số | Ngân sách | Ghi chú |
|---|---|---|
| Truyền tải lần đầu (nén) | ≤ 1,0 MB | three.module.min.js khoảng 160 KB brotli; JS game ≤ 150 KB; sprite tải khi cần |
| Draw call | ≤ 160 | tính cả shadow pass |
| Tam giác | ≤ 350 nghìn | bản thử hiện khoảng 287 nghìn |
| Script mỗi khung, throttle 4× | p50 ≤ 10 ms, p95 ≤ 18 ms | đo bằng vòng đệm `perf` như bản thử |
| Bộ nhớ JS heap | ≤ 120 MB | trang trại 400 ô |

### 7.2. Kỹ thuật bắt buộc

Các kỹ thuật này đã đo được hiệu quả trên bản thử:

- Gộp mesh tĩnh cùng vật liệu thành một draw call; đóng băng ma trận vật tĩnh (`mergeStatic`).
- Bake phần cứng của vật thể chuyển động thành một mesh màu đỉnh; chỉ chi tiết chuyển động là mesh riêng (`bakeVC`).
- `InstancedMesh` cho cỏ, hoa, đá lát, viền hoa, ô đất, cây trồng.
- Bóng đổ vẽ lại cách một khung; vật nhỏ không đổ bóng.
- Nhãn HTML chỉ ghi DOM khi vị trí thay đổi.
- Không vẽ khung mới khi không có gì chuyển động và người chơi không chạm (tiết kiệm pin).

### 7.3. Hạ chất lượng tự động

Khi trung vị thời gian khung vượt 22 ms trong 2 giây, hạ lần lượt: độ phân giải (pixel ratio 2 → 1,5 → 1), bản đồ bóng 2048 → 1024, tắt bóng, giảm mật độ cỏ còn một nửa. Lựa chọn được lưu trong `localStorage` cho lần mở sau.

## 8. Kế hoạch triển khai

Mỗi giai đoạn là một nhánh và một PR riêng, có tiêu chí nghiệm thu. Client 3D bật bằng `?view=3d` từ P1 tới P5, thành mặc định ở P6.

| Giai đoạn | Nội dung | Nghiệm thu |
|---|---|---|
| **P0** Chuẩn bị server | `GET /catalog`, `/state?slim=1`, cache `/api/users`, cache cấp cao nhất, LRU phiên, giảm ghi ở GET, test giới hạn tần suất (A1–A5, A7, A10) | test server cũ qua; test mới cho `/catalog` (ETag, 304) và `slim`; payload `/state?slim=1` nhỏ hơn 25 KB với nông dân cấp 30 |
| **P1** Khung 3D | `net`, `store`, cảnh tĩnh từ bản thử, đất và cây đọc từ trạng thái thật, HUD | mở trang trại thật ở `?view=3d`, đúng số ô, đúng cây, đúng giai đoạn; UI audit sạch |
| **P2** Vòng chơi chính | gieo, tưới, thu (lẻ và tất cả), bán, mua hạt, mở rộng đất, nông dân, xe tải | toàn bộ vòng gieo → thu → bán qua route thật; lỗi server đưa cảnh về đúng trạng thái |
| **P3** Sản xuất | 15 vật nuôi và chuồng, 12 máy với máy trạng thái §4.5, đơn hàng, ao cá, tăng tốc | mỗi máy chạy một công thức từ đầu tới lúc lấy hàng trong test trình duyệt |
| **P4** Xã hội | xem trang trại người khác, hái ké, giúp, khám xét, vàng, xếp hạng, bảng trộm, khách ghé thăm | kịch bản hai trình duyệt (đã có cho 2D) chạy lại trên 3D |
| **P5** Hệ thống phụ | nhiệm vụ, sao, lễ hội, kỹ năng, trang trí đặt trong cảnh, bộ sưu tập, xổ số, năng lượng, thuế và nợ, côn trùng, chó | M1 đạt 59/59 POST, 8/8 GET |
| **P6** Chuyển hẳn | 3D thành mặc định, xóa client 2D (§10), viết lại `browser-smoke` và giới hạn tải, cập nhật README và tài liệu | M1–M7 đạt; chạy đủ Chromium, Firefox, WebKit |

## 8a. Trạng thái triển khai (cập nhật 12/11/2026)

| Giai đoạn | Trạng thái | Ghi chú |
|---|---|---|
| P0 Chuẩn bị server | Xong | `/catalog` có ETag, `/state?slim=1` (5,9 KB so với 66,6 KB), cache gia đình, cấp cao nhất, LRU phiên, giảm ghi khi đọc, test giới hạn tần suất |
| P1 Khung 3D | Xong | `/farm/?view=3d` tải đồ họa một lần khi mở trang (three.js ghim 0.149.0 phục vụ cùng nguồn, không cần CDN, không cần nới CSP); `net.js`, `store.js`, `art.js`, `main.js` |
| P2 Vòng chơi chính | Xong | gieo, tưới, thu (lẻ và hàng loạt), bán qua xe tải, mua hạt (36 loại, khóa theo cấp), mở rộng đất, nông dân, hoạt cảnh; mọi kết quả do server trả về, client không tự cộng vàng hay EXP |
| P3 Sản xuất | Làm một phần | Xong: sheet Chế biến cho cả 12 máy (xếp mẻ, lấy thành phẩm, mở theo cấp) và sheet Chuồng (mua, cho ăn, thu; server tự cho ăn và tự thu khi kho còn thức ăn), cối xay trong cảnh quay theo job thật của server. Sheet Đơn hàng (giao, bỏ đơn) cũng xong. Chưa làm: mô hình 3D cho 11 máy còn lại và chuồng, vật nuôi trong cảnh theo trạng thái server, ao cá, tăng tốc |
| P4 Xã hội | Chưa làm | |
| P5 Hệ thống phụ | Chưa làm | |
| P6 Chuyển hẳn | Chưa làm | client 2D còn nguyên và vẫn là mặc định |

Giới hạn đã biết của bản hiện tại:
- Cảnh 3D vẽ tối đa 60 ô (ruộng chính 12 ô và 4 khối mở rộng ở phía đông). Người có nhiều đất hơn thấy phần còn lại ở client 2D; cần mở rộng khung thế giới trước P6.
- Cây trồng dùng 4 họ mô hình cộng cây ăn quả, nhuộm màu quả theo từng loại; 10 họ ở §4.3 chưa đủ.
- Cây ăn quả có thể xem và thu hoạch, nhưng chưa có thao tác trồng cây ăn quả (`plant-tree`).
- Vật nuôi trong cảnh chỉ để trang trí, chưa phản ánh trạng thái từ server.

## 9. Kiểm thử

### 9.1. Server

Toàn bộ 43 file test hiện có phải qua ở mọi giai đoạn. P0 thêm test cho `/catalog` và `/state?slim=1`.

### 9.2. Client

- **Logic thuần** (`state/`, định dạng, xác nhận): `node --test`, không cần trình duyệt.
- **Trình duyệt**: Playwright điều khiển game qua móc `window.__farm` (chỉ bật với `#debug`, như bản thử) để đặt trạng thái và chụp ảnh từng giai đoạn của máy, cây, xe tải.
- **Hiệu năng**: script đo của bản thử (`perf` ring buffer, `renderer.info`) chạy trong CI. Headless thường không có GPU thật, nên CI chỉ chặn theo số draw call, số tam giác và thời gian script khi throttle CPU; fps trên GPU thật đo tay trước mỗi bản phát hành.

### 9.3. UI audit

Script audit dùng trong phiên làm bản thử được đưa vào `scripts/ui-audit.mjs` và chạy trong CI ở 320, 390, 768, 1280 px. Nó kiểm tra tràn ngang, vùng chạm dưới 44 px, chữ bị cắt hoặc bị ép xuống dòng, phần tử ra ngoài màn hình, và tương phản dưới 4,5:1.

## 10. Phần 2D bị loại bỏ ở P6

| Xóa | Lý do |
|---|---|
| `public/app.js` (3.248 dòng) | thay bằng `main.js`, `net/`, `state/`, `scene/`, `ui/` |
| `public/style.css` (2.476 dòng) | thay bằng CSS của HUD và sheet mới |
| Ảnh cảnh 2D trong `public/assets/scene-v3/`, `public/assets/pack/` và ảnh nền `.scenery` | cảnh vẽ bằng 3D |
| Phép đo `docs/performance-baseline.md` dựa trên ảnh cảnh | thay bằng ngân sách §7.1 |

Giữ lại: sprite cây trồng (`crops-v3`), sản phẩm (`products-v3`), icon giao diện (`ui/`), thú cưng và đồ trang trí dùng trong sheet; `public/audio.js` được port vào module mới.

Trước khi xóa phải có: kịch bản kiểm tra trình duyệt mới đã qua trên ba engine, và một bản phát hành 3D chạy ổn với nhóm người chơi nhỏ ít nhất một tuần.

## 11. Rủi ro và quyết định còn mở

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Điện thoại cũ nóng máy, hao pin | người chơi bỏ game | không vẽ khi cảnh đứng yên; giới hạn 30 fps khi pin yếu nếu trình duyệt cho biết |
| Trang trại 400 ô quá rộng cho màn hình điện thoại | khó tìm ô | nút "tới ô chín" và "tới máy xong" trong dock đưa camera tới đúng chỗ |
| Hai phong cách (sprite vẽ tay trong sheet, low-poly trong cảnh) lệch nhau | cảm giác thiếu đồng bộ | ảnh chụp chuẩn từng họ cây đặt cạnh sprite để duyệt (§4.3) |
| Server thức dậy chậm hơn vì client nặng hơn | màn chờ lâu | cache catalog và three.js; trang chờ hiện ngay từ HTML tĩnh |
| Trình duyệt không có WebGL | không xem được cảnh | chế độ chỉ có sheet (§6) |

**Quyết định cần chủ dự án chốt trước P1:**

1. Thứ tự ưu tiên giữa P3 (sản xuất) và P4 (xã hội), vì hái ké là tính năng đặc trưng của làng.
2. Có đặt đồ trang trí tự do trong cảnh không, hay vào vị trí cố định. Đặt tự do cần thêm route lưu vị trí trên server.
3. Thời điểm xóa client 2D sau khi 3D thành mặc định (đề xuất: sau một tuần ổn định).
