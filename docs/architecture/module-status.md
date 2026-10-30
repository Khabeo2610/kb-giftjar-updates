# Trạng thái module

Thang trạng thái: **Planned → In Progress → Demo → Implemented → Tested → Production Ready**.
"Demo" nghĩa là chạy được để xem/thử nhưng **chưa** đủ điều kiện nghiệm thu thương mại.

Cập nhật: 30/10/2026 — sau giai đoạn 1–2.

| Module | Trạng thái | Đã hoạt động thật | Còn thiếu để nghiệm thu |
|---|---|---|---|
| Khung ứng dụng (Tauri 2 + React) | **Demo** | Build web, `cargo check/test/clippy` đạt trên Linux | Build & chạy thử trên Windows x64 thật |
| Design tokens Sweet Pastel | **Implemented** | Light/Dark, giảm chuyển động, tương phản AA cho chữ chính | Kiểm tra tương phản tự động (axe) |
| Navigation, tìm kiếm, onboarding | **Demo** | Tìm không dấu, Ctrl+K, hướng dẫn 4 bước | Test e2e trên app desktop |
| Hoàn tác / tự động lưu | **Tested** (unit) | 50 bước, kiểm tra dữ liệu khi nạp | Chuyển storage sang SQLite (GĐ 3) |
| Profile + xuất/nhập | **Tested** (unit) | Tạo/đổi tên/nhân bản/xoá, xuất JSON, nhập có kiểm tra schema | Hộp thoại lưu file native (GĐ 3) |
| Dashboard | **Demo** | Trạng thái thật (đều "chưa kết nối"), số liệu phiên, giả lập sự kiện | Trạng thái OBS/TikTok/license thật |
| Media Center | **Demo** | Thêm file thật, kéo thả, nhóm, tag, phát/dừng, fade, cắt đoạn, playlist, phím tắt, lỗi codec | Ghi nhớ file sau khi khởi động lại, chọn thiết bị âm thanh |
| Gift Effect Studio | **Demo** | Rule engine thật, thêm/sửa/nhân bản/bật-tắt/thử/sắp xếp/xác suất/cooldown, hàng đợi | Nguồn sự kiện TikTok hợp lệ, overlay ra OBS |
| Stream Deck | **Demo** | Lưới tuỳ chỉnh, nhiều trang, kéo thả, icon/màu, phím tắt, macro an toàn, Mini Controller | Phím tắt toàn hệ thống, cửa sổ Mini riêng |
| Settings | **Demo** | Giao diện, âm lượng tổng, hiệu năng thấp, phím tắt, profile, xoá dữ liệu | Các mục OBS/TikTok/License/Cập nhật (dự kiến) |
| Event Engine (package) | **Tested** (unit) | Rule engine, queue, dedupe, mock provider — 17 test | Reconnect/backoff/heartbeat (cần provider thật) |
| Mini-game & Gift Jar | Planned | — | GĐ 5 |
| NPC Studio | Planned | — | GĐ 5 |
| TTS & Chat | Planned (có TTS tạm bằng giọng hệ điều hành nếu máy có giọng tiếng Việt) | — | GĐ 4 |
| OBS Control | Planned | — | GĐ 4 |
| Overlay Designer | Planned | — | GĐ 4 |
| License client / server / Admin | Planned | — | GĐ 6 |
