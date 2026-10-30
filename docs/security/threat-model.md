# Threat model & checklist bảo mật (bản đầu — giai đoạn 1–2)

## Tài sản cần bảo vệ
1. Cấu hình của khách hàng (profile, quy tắc, Stream Deck).
2. Máy tính LIVE của khách hàng (không để KB Studio thành đường chạy mã độc).
3. License key và private key ký license (giai đoạn 6).
4. Dữ liệu người xem nhận được từ sự kiện LIVE (tên hiển thị, bình luận).

## Mối đe doạ & biện pháp

| Mối đe doạ | Biện pháp đã có | Việc còn lại |
|---|---|---|
| File profile độc hại (chia sẻ trên mạng) chèn script / đường dẫn | Kiểm tra bằng zod: giới hạn độ dài, số lượng, giới hạn 5 MB; `fileName` cấm `\`, `/`, `..`; tên icon chỉ cho phép `[A-Za-z0-9]` và tra bảng có sẵn; luôn cấp ID profile mới | Fuzz test schema |
| XSS từ tên người xem / bình luận | React tự escape; không dùng `dangerouslySetInnerHTML`; CSP chặn script ngoài | Kiểm tra lại khi làm Overlay Browser Source |
| Macro chạy lệnh hệ thống | Macro chỉ gồm hành động nội bộ (discriminated union), không có kiểu "chạy lệnh" | Giữ nguyên nguyên tắc khi thêm plugin |
| Lệnh Tauri bị lạm dụng | Lệnh ứng dụng khai báo tường minh trong `build.rs` (AppManifest) và cấp từng quyền `allow-*`; capability core chỉ thêm `set-always-on-top` và `destroy` (đóng cửa sổ sau khi lưu). `storage_save` kiểm tra lại dữ liệu phía Rust | Review mỗi lệnh mới |
| Lưu nhầm secret vào DB | Bảng `settings` chỉ nhận key trong whitelist (test: từ chối `obsPassword`); không có cột nào chứa mật khẩu/token | Secret ở sprint sau → Windows Credential Manager |
| DB bị sửa tay / hỏng | Ràng buộc CHECK trong schema (tên file không chứa đường dẫn, giới hạn độ dài, JSON hợp lệ), transaction + rollback, DB hỏng được sao lưu rồi tạo mới; frontend kiểm tra lại bằng zod khi nạp | — |
| Dữ liệu cấu hình hỏng làm treo app | Kiểm tra khi nạp; dữ liệu hỏng được sao lưu riêng, app khởi động bằng mặc định | — |
| Quá tải khi nhiều quà cùng lúc (DoS cục bộ) | Hàng đợi giới hạn 50, chống trùng, cooldown, giới hạn hiệu ứng & âm thanh đồng thời | Rate limit theo nguồn sự kiện (GĐ 4) |
| Lộ secret trong mã nguồn | Không có secret nào trong repo; `.env*` bị gitignore | Thêm secret scanning trong CI |
| Mở cổng mạng ngoài ý muốn | Chưa mở cổng nào. Dev server chỉ nghe `127.0.0.1` | Overlay/OBS (GĐ 4): chỉ bind localhost + token + kiểm tra Origin |
| Mật khẩu TikTok | Không bao giờ yêu cầu / lưu | — |

## Ghi chú đã kiểm chứng
- **`freezePrototype` của Tauri đang tắt.** Đã thử bật và giả lập trong trình duyệt: một thư viện phụ thuộc gán `toString` lên object → giao diện không khởi động được. Sẽ xem xét lại khi nâng cấp thư viện. CSP vẫn bật.

## Checklist trước khi phát hành (theo dõi đến giai đoạn 8)
- [x] Không hardcode API key / mật khẩu
- [x] Input validation cho dữ liệu nhập từ file
- [x] CSP cho WebView
- [x] Không mở dịch vụ mạng công khai mặc định
- [x] Lệnh xoá toàn bộ dữ liệu cá nhân trên máy (Cài đặt → Bảo mật & dữ liệu)
- [ ] Lưu secret bằng Windows Credential Manager (khi có license/OBS password)
- [ ] TLS + xác thực cho License Server
- [ ] Signed updates (Tauri updater + khoá ký riêng, không nằm trong repo)
- [ ] Code signing installer
- [ ] `pnpm audit` / `cargo audit` trong CI
- [ ] Kiểm tra WebSocket Origin + token cho overlay
- [ ] Audit log & RBAC phía server (GĐ 6)
