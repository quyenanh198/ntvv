# Nông trại vui vẻ 🌾

Web game nông trại cho cả nhà, chạy trong Lazybutts hub và **dùng chung tài khoản Chat** —
mở từ nút 🌾 trong Chat là chơi luôn, không cần đăng ký gì thêm.

## Chơi thế nào

- **Trồng trọt**: chạm ô đất trống → chọn hạt giống → chờ cây lớn theo thời gian thật → thu hoạch bán lấy xu.
- **Thăm nhà nhau**: chạm avatar người nhà để sang ruộng của họ.
  - 💧 **Tưới giúp** cây đang lớn: giảm 10% thời gian còn lại, người tưới được +2 xu +1 XP (mỗi người 1 lần/vụ).
  - 😈 **Trộm** cây đã chín: mỗi kẻ trộm hái 1 đơn vị, tối đa 40% sản lượng mỗi ô — chủ ruộng luôn giữ ≥60%.
    Chủ ruộng nhận **push notification qua Chat** ngay khi bị trộm.
- **Quà mỗi ngày** 🎁: +50 xu +10 XP (theo ngày giờ VN).
- **Mở rộng đất**: 6 ô ban đầu, mua dần tới 12 ô (giá tăng, kèm mốc level).
- **Bảng xếp hạng** 🏆: đua XP với cả nhà.

## Kinh tế cây trồng

| Cây | Giá | Thời gian | Sản lượng × giá bán | Lãi | XP | Level |
|---|---|---|---|---|---|---|
| 🌾 Lúa | 10 | 3 phút | 3 × 5 = 15 | +5 | 2 | 1 |
| 🥕 Cà rốt | 25 | 15 phút | 3 × 13 = 39 | +14 | 5 | 2 |
| 🍅 Cà chua | 60 | 45 phút | 4 × 25 = 100 | +40 | 10 | 3 |
| 🍓 Dâu tây | 120 | 2 giờ | 5 × 40 = 200 | +80 | 18 | 5 |
| 🌽 Ngô | 250 | 5 giờ | 5 × 90 = 450 | +200 | 35 | 7 |
| 🎃 Bí ngô | 500 | 10 giờ | 4 × 240 = 960 | +460 | 70 | 9 |

Level L cần `20·(L−1)·L` XP tích lũy. Xu khởi điểm: 200.

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
