# Nông trại vui vẻ 🌾

Web game nông trại cho cả nhà, chạy trong Lazybutts hub và **dùng chung tài khoản Chat** —
mở từ nút 🌾 trong Chat là chơi luôn, không cần đăng ký gì thêm.

## Chơi thế nào (v2 — theo đặc tả gameplay 1.0)

- **Trồng trọt**: 11 loại cây theo bảng cân bằng (Lúa mì 1 phút → Bí ngô 3 giờ), thu hoạch vào **Kho**, bán từ kho lấy vàng. Cây chín không bao giờ chết — chỉ đứng chờ.
- **Tưới nước**: không đổi thời gian, nhưng cho trạng thái *Tươi tốt* (thưởng EXP khi thu). Tưới giúp nhà người khác được trả công nhỏ.
- **Chuồng gà** (cấp 3): mua gà, cho ăn, 15 phút ra trứng.
- **Đơn hàng** (cấp 5): 4 đơn, giao sản phẩm từ kho lấy vàng + EXP + **Sao Nông Trại** (mốc sao có thưởng lớn).
- **Cối xay** (cấp 10): 2 lúa mì → bột mì, 2 ngô → 3 thức ăn gà. Chế biến luôn lời hơn bán thô.
- **Nhiệm vụ ngày**: 6 nhiệm vụ, xong 3 mở **rương ngày** (vàng + EXP + cơ hội kim cương).
- **Kim cương**: tăng tốc cây/máy (1 💎 mỗi 5 phút còn lại).
- **Mở rộng đất**: 12 ô khởi điểm, mua dần tới 32 ô.
- **Hái ké** 😋: ô chín nhà người khác hái ké được 1 sản phẩm — *chủ ruộng không mất gì* (tối đa 10 lần/ngày), chủ nhận push notification qua Chat.
- EXP lên cấp theo công thức `100 + 12L + 3,36L²` (làm tròn 10) — đúng tài liệu thiết kế.

Toàn bộ số liệu nằm trong `server/src/game.js`, bám tài liệu đặc tả (bảng cây trồng mục 6, vật nuôi mục 7, chế biến mục 8, đơn hàng mục 10, cấu hình nền mục 19).

## Kiến trúc

```
Trình duyệt ── chat.lazybutts.com/farm/* ──► caddy ──(sablier đánh thức)──► farm:8090
                                              │
                                              └── mọi path khác ──► chat:8082
```

- **Server là trọng tài**: thời gian chín, ví xu, giới hạn trộm/tưới đều tính ở server
  (Fastify + better-sqlite3, WAL) — client chỉ vẽ và đếm ngược.
- **Xác thực mượn Chat**: farm chuyển tiếp cookie `lb_session` sang `GET /api/me` của Chat;
  Chat bảo ai thì người đó là nông dân. Không mật khẩu, không secret dùng chung cho session.
- **Avatar** lấy thẳng từ Chat qua proxy `/farm/api/avatar/:id` (cùng cookie).
- **Push khi bị trộm**: farm gọi `POST /internal/farm/notify` của Chat với header
  `x-farm-secret` (env `FARM_INTERNAL_SECRET` hai bên phải khớp) → Chat bắn web-push.
- **Scale-to-zero**: container ngủ khi 15 phút không ai chơi, caddy+sablier đánh thức khi
  có người mở. Client chỉ poll khi tab đang hiển thị để không giữ farm thức oan.

## Env

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8090` | Cổng lắng nghe |
| `DATA_DIR` | `/data` | Chỗ để `farm.sqlite3` |
| `CHAT_API_URL` | `http://chat:8082` | Gốc URL của Chat (auth + push) |
| `FARM_INTERNAL_SECRET` | *(trống = tắt push)* | Secret gọi endpoint nội bộ của Chat |
| `FARM_FAST` | *(trống)* | `1` = cây lớn nhanh ×60 (chỉ để test) |

## Chạy dev nhanh

```bash
npm install
CHAT_API_URL=http://localhost:8082 DATA_DIR=./data FARM_FAST=1 npm start
# rồi mở http://localhost:8090/farm/ (cần đăng nhập Chat cùng host để có cookie)
```
