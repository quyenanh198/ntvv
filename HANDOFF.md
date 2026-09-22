# Hand-off: Nông Trại Vui Vẻ (NTVV)

> Ngày cập nhật: 2026-09-22  
> Trạng thái kho lưu trữ: **Đã triển khai thành công 4 Giai đoạn & đồng bộ origin/master**  
> Định hướng sản phẩm: **Sản phẩm web game nông trại xã hội thư giãn, hiện đại và gây nghiện (Neo-Cozy Farm Game)**

---

## 1. Trạng Thái Hiện Tại (Repository Status)

- **Git Remote**: `https://github.com/quyenanh198/ntvv.git`
- **Branch**: `master` (tracking `origin/master`)
- **Working Tree**: Sạch (clean)
- **Node Environment**: Node.js `>=22`, Fastify 5, Web Audio API
- **Kiểm thử tự động**: `npm test` **pass 40/40 tests** (<450ms).

---

## 2. Các Giai Đoạn Đã Hoàn Thành (Completed Upgrades)

### ✅ Giai đoạn 1: Đập tan giao diện "phèn" — Neo-Cozy UI Overhaul (Đã hoàn thành)
1. **Loại bỏ 2 cột phụ `.side-left` và `.side-right`**: Trả lại toàn bộ không gian cho `.stage-center` (max-width 680px full-bleed responsive).
2. **Thanh điều hướng đáy nổi `.bottom-dock`**: 5 nút tác vụ cốt lõi (Trại, Thu hoạch nổi bật, Cửa hàng, Kho đồ, Thêm).
3. **Sổ Nông Thôn & Tài Chính (Drawer sheet)**: Thay thế 3 banner đập vào mắt bằng modal gọn gàng kích hoạt qua icon 📋 trên HUD (có badge cảnh báo nợ khi đến hạn).
4. **Trang tính năng phụ `✨ Tính Năng Nông Trại` (`more-sheet`)**: Gom Nhiệm vụ, Đơn hàng, Lễ hội, Kỹ năng, Chuồng trại, Cối xay, Hồ câu, Chợ trời, Hàng hiệu thành lưới thẻ trực quan.
5. **Micro-animations**: Hiệu ứng nhịp thở `@keyframes crop-ready-bounce` cho cây trái đến vụ thu hoạch.

### ✅ Giai đoạn 2: Mở Rộng Bộ Test Toàn Diện (Đã hoàn thành)
- Thêm `test/game-rules.test.js` với 31 bộ test suites kiểm thử chuyên sâu logic `server/src/game.js`:
  - Cân bằng hạt giống, cây trồng, vật nuôi, máy chế biến, công thức XP, mốc kim cương.
  - Cơ chế tính phạt chó canh vườn, chu kỳ lễ hội, hồ câu cá, tỷ giá kinh tế làng và chợ đen.
  - Tổng số lượng test đạt 40 tests, 100% passed.

### ✅ Giai đoạn 3: Âm Thanh Web Audio & Xúc Giác (Đã hoàn thành)
1. **Bộ tổng hợp âm thanh Web Audio (`public/audio.js`)**:
   - Hoàn toàn thủ tục (procedural synthesis), zero file MP3 nặng nề, tải tức thì.
   - Âm thanh thu hoạch giòn tan: `playHarvest()`
   - Âm thanh tiếng vàng leng keng metallic: `playCoin()`
   - Âm thanh giọt nước tưới cây bong bóng: `playWater()`
   - Âm thanh thăng cấp & nhận thưởng mốc sao: `playLevelUp()`
   - Âm thanh hoàn thành đơn hàng / nhiệm vụ: `playSuccess()`
   - Nút bật/tắt âm thanh 🔊/🔇 trên HUD lưu trạng thái vào `localStorage`.

### ✅ Giai đoạn 4: Vòng Lặp Xã Hội & Trả Thù Kẻ Trộm (Đã hoàn thành)
1. **Giao diện "Đạo tặc" vắng mặt nâng cấp**:
   - Báo cáo vắng mặt liệt kê từng tên trộm kèm số lượng và số lần trộm.
2. **Nút "🎯 Trả thù" tức thì (Instant Revenge Loop)**:
   - Bấm trực tiếp từ thẻ tên trộm để đột nhập ngay vào nông trại của kẻ đó trả đũa mà không cần tìm kiếm thủ công.

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
