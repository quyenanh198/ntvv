# Redesign UI theo mockup "Nông Trại Vui Vẻ" (asset pack individual)

Ngày: 2026-08-31. Mục tiêu: giao diện in-game giống ảnh mockup (HUD gỗ, cảnh nông trại vẽ tay), gameplay + server giữ nguyên 100%.

## Phạm vi

- Chỉ client: `public/style.css` (viết lại), `public/app.js` (phần render HUD/scene), copy asset tốt từ `asset/png` → `public/assets/pack/`.
- Không đổi API, không đổi `server/*`, không đổi luật chơi.

## Asset dùng (đã duyệt bằng mắt — nhiều crop trong pack bị lệch bbox, chỉ lấy cái sạch)

- Logo: `map_logo_dialogue/farm_logo.png`
- Nhà cửa: `farm_house`, `red_barn`, `greenhouse`, `windmill`, `market_shop`, `tiny_house`, `well`
- Nhân vật: `farmer_female_full`, `pet_dogs`
- Thú: `sheep_adult`, `pig_adult`, `chicken_brown`, `fish_pond`
- Cây: `tree_02` (nhân bản/lật), `tree_01`
- Bị loại (bbox hỏng): grass/dirt tiles, cow_adult (dính nhãn), silo, storage_shed, wood_sign, fence pngs, crop cells → ô cây trồng tiếp tục dùng SVG sẵn có `public/assets/crops/*`.

## Layout (bám mockup)

- **Trời + đồi**: CSS gradient, mây, mặt trời (giữ scenery cũ, tinh chỉnh).
- **HUD trên-trái**: khung avatar gỗ tròn + tên + huy hiệu cấp (sao vàng) + thanh EXP.
- **HUD trên-giữa/phải**: pill gỗ vàng (coin), pill kim cương, pill sao; nút ＋ xanh. Góc phải: nút tròn ✉️ Bản tin, 🎁 Lễ hội, 🏆 Hạng.
- **Cột trái** (nút gỗ tròn + nhãn): Nhiệm vụ (chấm đỏ khi xong), Cửa hàng, Kho đồ.
- **Cột phải**: Thu hoạch, Đơn hàng (Lv≥5), Sự kiện/Sao.
- **Logo** `farm_logo.png` treo dưới HUD trái như mockup.
- **Cảnh giữa**: barn+greenhouse+windmill+house đặt quanh ruộng; chuồng gà = `tiny_house`+gà (mở sheet coop, Lv≥3); cối xay = windmill (mở sheet mill, Lv≥10); shop building = `market_shop` (mở sheet shop); chuồng cừu/heo bằng hàng rào CSS; ao cá `fish_pond` góc dưới-trái; nông dân + chó giữa cảnh.
- **Ruộng**: nền đất nâu bo tròn + viền rào gỗ CSS; ô đất kiểu luống; crop SVG như cũ.
- **Dưới-giữa**: quickbar kho kiểu `inventory_panel` (ô gỗ, icon + số).
- **Dưới-trái**: bảng gỗ "Chào mừng đến với Nông Trại Vui Vẻ!".
- **Sheet/modal**: skin gỗ-kem đồng bộ.
- Family strip + search giữ nguyên chức năng, nén gọn dưới HUD.

## Không làm

- Không thêm năng lượng ⚡ (mockup có, gameplay không có).
- Không nút "Chơi Ngay" (mockup là màn hình home).
- Không đổi flow sheet/logic client.

## Kiểm tra

1. Chạy local: stub Chat `/api/me` ở :8082, `FARM_FAST=1`, cookie giả → chơi thật trong browser.
2. Screenshot desktop + mobile so với mockup.
3. Đối chiếu gameplay với `docs/gameplay-spec.md` (bản user gửi trùng 100% sau CRLF) — báo cáo lệch nếu có.
