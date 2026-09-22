# Hand-off: Nông Trại Vui Vẻ (NTVV)

> Ngày cập nhật: 2026-09-22  
> Trạng thái kho lưu trữ: **Đồng bộ với `origin/master` (commit `1a5d99c`)**  
> Định hướng sản phẩm: **Sản phẩm web game nông trại xã hội thư giãn, hiện đại và gây nghiện (Neo-Cozy Farm Game)**

---

## 1. Trạng Thái Hiện Tại (Repository Status)

- **Git Remote**: `https://github.com/quyenanh198/ntvv.git`
- **Branch**: `master` (tracking `origin/master`)
- **Working Tree**: Sạch (clean)
- **Node Environment**: Node.js `>=22`, Fastify 5, better-sqlite3 13
- **Kiểm thử tự động hiện tại**: `npm test` pass 9/9 tests.

---

## 2. Kế Hoạch Nâng Cấp Tổng Thể (Actionable Roadmap)

### Giai đoạn 1: Đập tan giao diện "phèn" — Neo-Cozy UI Overhaul (P0)
1. **Xoá bỏ 2 cột phụ `.side-left` và `.side-right`**:
   - Trả lại không gian cho `.stage-center` mở rộng 100% (căn giữa max-width 680px), không còn cảm giác bị bóp nghẹt như trước.
2. **Dock điều hướng nổi ở đáy màn hình (`.bottom-dock`)**:
   - Thay thế toàn bộ các nút bấm dàn trải hai bên bằng dock hiện đại ở dưới cùng (Home, Thu hoạch, Cửa hàng, Kho đồ, Thêm).
   - Thao tác 1 tay trên điện thoại cực kỳ dễ dàng.
3. **Thu gọn 3 banner nợ nần & thuế đất vào Sổ Nông Thôn**:
   - Chuyển thông báo nợ đất, phạt chó cắn vào drawer/modal thông tin tài chính kích hoạt bằng biểu tượng chuông/sổ sách trên HUD.
4. **Hiện đại hoá Design Tokens**:
   - Squircle bo góc mượt mà (14–18px), bóng mờ ambient mềm mại, tông màu pastel ấm áp thay cho viền nâu thô ráp 4px.

### Giai đoạn 2: Tách Module Server & Xây dựng Bộ Test Toàn Diện (P0)
1. **Chia nhỏ `server/src/app.js`**:
   - Tách thành các route plugins độc lập: `crops.js`, `animals.js`, `machines.js`, `social.js`, `economy.js`.
   - Giữ nguyên các hàm cốt lõi phục vụ kiểm thử hồi quy (`createHash('sha256')`, `machineTime(...)`).
2. **Bộ test toàn diện**:
   - Mở rộng từ 9 tests lên 40+ tests kiểm thử cơ chế trồng trọt, tính toán vàng, giới hạn hái trộm và hàng đợi máy móc.

### Giai đoạn 3: Âm Thanh Web Audio & Hiệu Ứng Xúc Giác (P1)
1. **Bộ tổng hợp âm thanh Web Audio (`public/audio.js`)**:
   - Âm thanh thu hoạch giòn tan (pop/pluck).
   - Âm thanh tiếng vàng leng keng (coin chime).
   - Âm thanh tưới nước, thăng cấp và chó sủa.
2. **Micro-animations**:
   - Cây chín nhấp nhô nhẹ nhàng, số vàng nổi `+50 🌾` bay lên có hiệu ứng mượt mà.

### Giai đoạn 4: Tính Năng Xã Hội & Chống Trộm (P2)
1. **Đi trả thù (Revenge shortcut)**: Nút trả đũa nhanh từ thông báo mất cắp.
2. **Cảnh báo chó canh & Stealth gauge**.

---

## 3. Hướng Dẫn Vận Hành & Lệnh Phát Triển

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

### Triển khai & Đẩy code:
```bash
git push origin master
```
