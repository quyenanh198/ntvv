# Hand-off: Nông Trại Vui Vẻ (NTVV)

> Ngày cập nhật: 2026-09-22  
> Trạng thái kho lưu trữ: **Đồng bộ 100% với `origin/master` (commit `7965978`)**  
> Định hướng sản phẩm: **Sản phẩm web game nông trại xã hội thư giãn, tinh tế và gây nghiện cho Lazybutts Hub**

---

## 1. Trạng Thái Hiện Tại (Repository Status)

- **Git Remote**: `https://github.com/quyenanh198/ntvv.git`
- **Branch**: `master` (tracking `origin/master`)
- **Working Tree**: Sạch (clean), không có conflict hoặc uncommitted files.
- **Node Environment**: Node.js `>=22`, Fastify 5, better-sqlite3 13.
- **Kiểm thử tự động**:
  - `npm test`: **9/9 tests pass** (`test/game.test.js`, `test/client-regressions.test.js`).

---

## 2. Tổng Quan Kiến Trúc & Số Liệu Codebase

```
c:\Users\quyen.nguyen\Documents\Quyen\NTVV\
  ├── server/
  │    └── src/
  │         ├── server.js     (23 dòng, bootstrap Fastify & SQLite)
  │         ├── db.js         (308 dòng, SQLite schema & migrations)
  │         ├── game.js       (1,480 dòng, công thức cân bằng, crops, animals, xp)
  │         └── app.js        (2,322 dòng — KHỐI MONOLITH CẦN TÁCH)
  ├── public/
  │    ├── index.html         (50 dòng, shell tải app.js & style.css)
  │    ├── app.js             (1,933 dòng — CLIENT MONOLITH CẦN TÁCH)
  │    ├── style.css          (67.5 KB — STYLESHEET MONOLITH)
  │    └── assets/            (crops SVG, pack PNG, UI icons)
  ├── test/                   (9 tests hồi quy)
  └── docs/
       ├── gameplay-spec.md   (Đặc tả gameplay 1.0)
       └── release-stabilization-roadmap.md (Roadmap ổn định release)
```

### Điểm mạnh:
1. **Xác thực mượn Chat không cần đăng ký**: Người dùng truy cập qua cookie `lb_session`, server proxy sang `GET /api/me` của Chat, lấy đúng ID nông dân.
2. **Kiến trúc Scale-to-Zero tiết kiệm tài nguyên**: Container tự động ngủ sau 15 phút không có người chơi; Caddy + Sablier đánh thức khi có truy cập mới.
3. **Cơ chế Hái trộm (Poaching) độc đáo**: Người chơi hái trộm của nhau không làm mất cây của chủ ruộng, kích hoạt web-push thông báo tới Chat.

### Điểm yếu cốt lõi (Phát hiện qua Steve Jobs Audit):
1. **Quá tải thông tin (HUD Clutter)**: 3 dải thông báo nợ nần, thuế đất, phạt tiền chó cắn chiếm trọn nửa trên màn hình ngay khi mở game, làm mất đi tính thư giãn, ấm cúng.
2. **Monolith Server & Client khổng lồ**: `server/src/app.js` (2,322 dòng) và `public/app.js` (1,933 dòng) gộp chung mọi tính năng vào một khối, cực kỳ khó bảo trì và dễ vỡ khi thêm tính năng mới.
3. **Thiếu hụt kiểm thử (Chỉ có 9 test chuỗi string)**: Chưa có bộ unit & integration tests thực thụ chạy qua database và API endpoints.
4. **Thế giới im lặng (Mute World)**: Game hoàn toàn không có âm thanh (Web Audio SFX) và thiếu micro-animation xúc giác khi thu hoạch.

---

## 3. Bản Đồ Kế Hoạch Triển Khai Tiếp Theo (Actionable Roadmap)

### Giai đoạn 1: Tinh Gọn Giao Diện & Tách Kiến Trúc (P0)
1. **Gom gọn thanh trạng thái & nợ nần**:
   - Chuyển 3 banner nợ thuế/tiền phạt vào một ngăn kéo (Drawer/Modal) "Sổ Nông Thôn", trả lại khung cảnh xanh tươi yên bình cho nông trại.
2. **Tách module Backend `server/src/app.js`**:
   - `routes/crops.js`: Gieo hạt, tưới nước, thu hoạch, cày đất.
   - `routes/animals.js`: Mua gà, bò, cừu, cho ăn, thu trứng, sữa, len.
   - `routes/machines.js`: Xếp mẻ chế biến cối xay, lò bánh, máy chế biến thức ăn.
   - `routes/social.js`: Danh sách hàng xóm, thăm ruộng, tưới giúp, hái trộm.
   - `routes/market.js`: Cửa hàng, bán nông sản, mở rộng đất, mua kim cương.
3. **Viết bộ kiểm thử toàn diện (`test/api-*.test.js`)**:
   - Xây dựng tối thiểu 40–50 tests kiểm tra logic cộng trừ vàng, kho đồ, giới hạn hái trộm và thời gian lớn của cây trồng.

### Giai đoạn 2: Xúc Giác & Âm Thanh (Web Audio SFX) (P1)
1. **Tích hợp Web Audio Engine**:
   - Tiếng *bụp* giòn tan khi nhổ củ cải/lúa mì.
   - Tiếng xu rơi leng keng khi bán nông sản trong kho.
   - Tiếng gà cục tác, bò kêu khi cho ăn và thu hoạch.
   - Tiếng sủa báo động hài hước của chú chó giữ vườn khi bắt được kẻ trộm.
2. **Micro-animations**:
   - Nông sản chín nhấp nhô nhẹ báo hiệu sẵn sàng thu hoạch.
   - Hiệu ứng nảy số vàng `+150 🌾` bay lên khi thu hoạch.

### Giai đoạn 3: Tính Năng Xã Hội "Ăn Trộm Vui Vẻ 2.0" (P2)
1. **Dấu chân kẻ trộm & Phục kích**:
   - Khi thăm ruộng có chó canh, xuất hiện thanh đo độ cảnh giác (Stealth Gauge).
   - Nút "Đi trả thù" (Revenge) dẫn thẳng tới nông trại kẻ vừa hái trộm cây của mình.
2. **Hội Làng Hợp Tác (Village Co-op)**:
   - Cả xóm cùng đóng góp nông sản hoàn thành mục tiêu tuần nhận quà chung.

---

## 4. Hướng Dẫn Vận Hành & Lệnh Phát Triển

### Khởi chạy môi trường Dev:
```bash
cd c:\Users\quyen.nguyen\Documents\Quyen\NTVV
npm install
npm run dev
# hoặc
CHAT_API_URL=http://localhost:8082 DATA_DIR=./data FARM_FAST=1 npm start
```

### Chạy kiểm thử:
```bash
npm test
```

### Git Workflow:
```bash
git pull origin master
git add .
git commit -m "refactor: ..."
git push origin master
```
