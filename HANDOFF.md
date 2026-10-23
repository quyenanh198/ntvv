# Hand-off: Nông Trại Vui Vẻ (NTVV)

> Cập nhật: 2026-10-23
> Nhánh chính: `master` (nhánh `main` cũ dừng ở `6129526`, 2026-09-24 — đừng dùng nữa).
> Đang chạy trên hub: `master` `d3217a9` tại https://chat.lazybutts.com/farm/

---

## 1. Tình trạng

| Mục | Hiện tại |
|---|---|
| Code | `master` gồm toàn bộ đợt nâng cấp (PR #1 → #129). Không có PR hay issue nào đang mở. |
| Test | `npm test`: 92/92 (Node 22). Không còn TODO/FIXME trong code. |
| CI (`.github/workflows/verify.yml`) | Mỗi lần push/PR: cài sạch, test, báo cáo sinh tự động, audit dependency, build Docker, chạy thử image (health, metrics, trang, ảnh, giữ dữ liệu qua restart), walkthrough trình duyệt đầy đủ trên **Chromium, Firefox và WebKit** ở 320–1280px kèm quét accessibility. |
| Triển khai | Image build từ submodule `apps/ntvv` của hub (`scripts/deploy.sh farm --build`), giữ `:live` + `:previous` để lùi bằng `scripts/deploy.sh farm --rollback`. |
| Dữ liệu thật | 10 nông dân, 800 ô, 804 dòng kho, 1.775 vật nuôi trong `farm2.sqlite3`. Migration đã rehearsal trên bản sao trước khi deploy (xem `docs/operations.md`). |
| Sao lưu | Bản đã kiểm tra trước đợt deploy này: `$DATA_ROOT/backups/farm/farm2-2026-10-23-before-master.sqlite3` trên Mac mini. |

## 2. Việc đã làm ngày 2026-10-23

1. **PR #128 — hai bản sửa bị rơi khi chuyển từ `main` sang `master`:**
   - Hộp thoại bảng xếp hạng và "Trong lúc bạn vắng mặt" tự đóng khi bấm bên trong (không đổi được tab Làng/Trộm): `onclick="event.stopPropagation()"` bị CSP chặn. Nền mờ giờ chỉ đóng khi bấm trúng chính nó; ảnh avatar hỏng gỡ bằng listener thay cho `onerror` trong thẻ. Có test canh: cấm thuộc tính `on...` trong markup.
   - Ruộng trên màn rộng: từ 1180px trở lên không còn khoá 720px, ruộng chiếm hết phần bên trái bảng người nhà (2560px → ~2200px, 20 cột), tranh nông trại giữ khổ 760px, thanh nút canh giữa ruộng.
2. **PR #129 — rehearsal database thật:** sao lưu, kiểm tra toàn vẹn, migrate bản sao, nạp trạng thái cả 10 nông dân, và chạy code cũ trên database đã migrate (lùi bản an toàn).
3. **PR #126 — walkthrough trên Firefox/WebKit:** lỗi Firefox duy nhất nằm ở chính script (Firefox từ chối `decode()` với ảnh `loading="lazy"` chưa tải); sửa ở `4ad0d91`, cả ba trình duyệt xanh.
4. **PR #127 — bảng đánh giá phát hành** (`docs/release-readiness.md`) và ghi chú bản ứng viên (`docs/release-notes.md`); đã cập nhật theo các bước trên.
5. **Deploy `master` lên hub** (`d3217a9`, hub commit `a9d3180`).

### Sự cố khi deploy (đã xử lý)

Ngay sau deploy, mọi thao tác ghi (thu hoạch, gieo, bán…) trả `403 cross_origin_request`. Nguyên nhân: kiểm tra same-origin mới so `Origin` (https) với scheme server tự nhận; cloudflared nói HTTP với Caddy nên Caddy báo `X-Forwarded-Proto: http`. Đã lùi bản trong vài phút (không có thao tác của người chơi nào bị mất — chỉ một request thử bị từ chối), sửa route farm trong Caddyfile của hub (`header_up X-Forwarded-Proto https`) rồi đưa bản mới lên lại. Đã ghi lại cách kiểm tra trong `docs/operations.md`. Bài học: CI chạy image trực tiếp bằng HTTP nên không bắt được lỗi chỉ xuất hiện sau proxy.

## 3. Còn mở (cần người thật hoặc thời gian)

Chi tiết từng mục trong `docs/release-readiness.md`. Tóm tắt:

- Quan sát 5 người chơi mới và người chơi quay lại theo `docs/player-session-script.md`.
- Kiểm tra thủ công bằng bàn phím, trình đọc màn hình và điện thoại thật.
- Duyệt nguồn gốc/bản quyền và độ đồng bộ của toàn bộ tranh vẽ.
- Theo dõi số liệu thật sau deploy (funnel, kinh tế, lỗi) và đặt cảnh báo; chọn việc tiếp theo từ dữ liệu đó.
- Nợ kỹ thuật (không chặn): `server/src/app.js` (~2.800 dòng) và `public/app.js` (~3.200 dòng) vẫn là file lớn; `AUDIT.md` đề xuất tách module là ảnh chụp ngày 2026-09-22.

## 4. Lệnh thường dùng

```bash
npm ci
npm test                                   # test server + client (node --test)
npm run dev                                # farm dev với Chat giả lập
CHAT_API_URL=http://localhost:8082 DATA_DIR=./data FARM_FAST=1 npm start
npx playwright install --with-deps chromium firefox webkit
NTVV_BROWSER=firefox npm run browser:smoke # walkthrough đầy đủ (mặc định chromium)
npm run db:rehearse -- <data-dir> <backup-mới>.sqlite3   # trước mỗi deploy đổi schema
```

Deploy trên Mac mini (repo hub `macmini-hub`):

```bash
cd apps/ntvv && git fetch && git checkout origin/master && cd ../..
scripts/deploy.sh farm --build     # build + thay container, tự kiểm tra route
scripts/deploy.sh farm --rollback  # lùi về bản trước nếu cần
```

Trước khi deploy bản đổi schema: chạy `npm run db:rehearse` trên bản sao database lúc farm đang ngủ (Sablier tắt container sau 15 phút không ai chơi), cất bản sao lưu ra ngoài thư mục dữ liệu.
