# Trạng thái module

Thang trạng thái: **Planned → In Progress → Demo → Implemented → Tested → Production Ready**.
"Demo" nghĩa là chạy được để xem/thử nhưng **chưa** đủ điều kiện nghiệm thu thương mại.

Cập nhật: 30/10/2026 — sau **Sprint 1** (v0.2.0).

| Module | Trạng thái | Đã hoạt động thật | Còn thiếu để nghiệm thu |
|---|---|---|---|
| Khung ứng dụng Tauri 2 | **Tested** (Linux) | Build release, mở/đóng 3 lần qua kịch bản e2e trên Linux; CI build bộ cài Windows (giai đoạn 1–2) | Chạy checklist trên Windows thật |
| Lưu cấu hình SQLite | **Tested** | Migration v1, 4 bảng, transaction, whitelist key, sao lưu DB hỏng, flush khi đóng cửa sổ — 10 test Rust + 10 test TS + e2e desktop | Kiểm tra trên Windows; backup/restore thủ công (sprint sau) |
| Loading / Error / Empty state | **Implemented** | Màn hình chờ khởi động, màn hình lỗi (Thử lại / Mở tạm), empty state ở thư viện & quy tắc | — |
| Hộp thoại xác nhận | **Implemented** | Xoá media, nhóm, quy tắc, trang, nút, profile, toàn bộ dữ liệu | — |
| Sidebar thu gọn | **Tested** | Thu gọn/mở rộng, nhớ sau khi mở lại (đã thử trên app desktop) | — |
| Design tokens Sweet Pastel | **Implemented** | Light/Dark, giảm chuyển động, tương phản AA | Kiểm tra tương phản tự động (axe) |
| Profile + xuất/nhập | **Tested** (unit + UI) | Tạo/đổi/nhân bản/xoá, xuất JSON, nhập có kiểm tra schema | Hộp thoại lưu file native |
| Dashboard | **Demo** | Trạng thái thật (đều "chưa kết nối"), số liệu phiên, giả lập sự kiện | Trạng thái OBS/TikTok/license thật |
| Media Center | **Demo** | Thêm file thật, phát, fade, cắt đoạn, playlist, phím tắt, lỗi codec; metadata lưu SQLite | Nhớ file sau khi mở lại app, chọn thiết bị âm thanh |
| Gift Effect Studio | **Demo** | Rule engine thật với sự kiện giả lập | Nguồn sự kiện hợp lệ, overlay ra OBS |
| Stream Deck | **Demo** | Lưới, trang, kéo thả, macro an toàn; bố cục lưu SQLite | Phím tắt toàn hệ thống |
| Settings | **Demo** | Giao diện, hiệu năng, phím tắt, profile, xoá dữ liệu, thông tin DB | Mục OBS/TikTok/License/Cập nhật (dự kiến) |
| Interface Media Engine / OBS / Event Adapter | **Implemented** (chỉ interface) | `MediaEngine`, `ObsClient` + `NotConnectedObsClient`, `EventSourceAdapter` + `MockEventSource` | Bản cài đặt thật (GĐ 3–4) |
| Mini-game, NPC, TTS, OBS Control, Overlay | Planned | — | GĐ 4–5 |
| License client / server / Admin | Planned | — | GĐ 6 |
