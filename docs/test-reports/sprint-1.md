# Báo cáo kiểm thử — Sprint 1 (v0.2.0)

Ngày: 30/10/2026 · Môi trường kiểm thử: Linux x64 (container), Node 22.22, pnpm 10.28, Rust 1.97, Tauri 2.12.5, WebKitGTK 2.52.

> **Giới hạn quan trọng:** môi trường kiểm thử là **Linux**, không có máy Windows. App desktop đã được build và chạy thật trên Linux (WebKitGTK). Trên Windows, app dùng WebView2 — **chưa được chạy thử** trong Sprint này. Bộ cài Windows chỉ được tạo qua GitHub Actions sau khi có quyền push. Việc nghiệm thu trên Windows làm theo [windows-test-checklist.md](../user-guide/windows-test-checklist.md).

## Phiên bản & tương thích đã kiểm tra

| Thành phần | Phiên bản | Ghi chú tương thích |
|---|---|---|
| tauri (Rust) / @tauri-apps/api / cli | 2.12.5 / 2.12.4 / 2.12.4 | Cùng nhánh 2.12 |
| rusqlite | 0.41 (`bundled`) | SQLite được biên dịch kèm, không phụ thuộc máy |
| React / TypeScript | 19.3 / 5.9 (strict) | |
| Vite / Vitest | 7.3 / 3.2 | |
| Tailwind CSS | 4.3 | |
| ESLint / typescript-eslint | 9.39 / 8.72 | typescript-eslint hỗ trợ TS < 6.1 |

## Kết quả

| # | Hạng mục | Lệnh | Kết quả |
|---|---|---|---|
| 1 | Typecheck (7 package) | `pnpm typecheck` | ✅ 0 lỗi |
| 2 | Lint TS/React | `pnpm lint` (`--max-warnings 0`) | ✅ 0 lỗi, 0 cảnh báo |
| 2b | Lint Rust | `cargo clippy --all-targets -- -D warnings` | ✅ |
| 3 | Unit test TS | `pnpm test` | ✅ **84/84** (event-engine 19, desktop 65) |
| 3b | Unit test Rust | `cargo test` | ✅ **10/10** |
| 4 | Migration DB | `cargo test` (db::tests) | ✅ tạo đủ 4 bảng, chạy lại không lỗi, lưu/đọc khớp 100%, xoá dây chuyền, từ chối key `obsPassword`, ràng buộc chặn tên file có đường dẫn + rollback, đóng/mở lại file DB, DB hỏng được sao lưu & tạo mới |
| 5 | Giao diện | Vitest + Testing Library; Playwright (trình duyệt) | ✅ 5 màn hình + 5 màn "Dự kiến" điều hướng được; không tràn ngang ở 1100px; không có lỗi JS |
| 6 | Build | `pnpm build`; `pnpm tauri build --no-bundle` | ✅ web; ✅ file chạy desktop **Linux** (release). ⚠️ **Windows: chưa build trong Sprint 1** (cần CI/máy Windows) |
| 7 | Đóng/mở app | `tests/e2e/desktop-persistence-linux.sh` (Xvfb + openbox) | ✅ mở/đóng 3 lần, app tự thoát sau khi bấm đóng |
| 8 | Lưu & khôi phục cấu hình | cùng kịch bản e2e + test `persistence.test.tsx` | ✅ xem chi tiết dưới |

### Chi tiết kịch bản e2e desktop (app thật, SQLite thật)
```
── Lần mở 1: chạy lần đầu
✅ Đã tạo file DB
✅ Migration v1 đã áp dụng
✅ Đã ghi profile mặc định
✅ Đóng app bình thường (exit)
── Sửa cấu hình trực tiếp trong DB: theme tối + sidebar thu gọn + onboarding xong
── Lần mở 2: phải khôi phục cấu hình
✅ Theme tối vẫn giữ sau khi mở lại
── Bấm nút mở rộng sidebar, đóng app sau 0,2 giây (ngắn hơn thời gian chờ lưu 0,4 giây)
✅ Đóng app (lưu nốt thay đổi trước khi thoát)
✅ Thay đổi từ giao diện đã được lưu vào SQLite khi đóng cửa sổ
── Lần mở 3
✅ Mở/đóng lần 3 ổn định
TẤT CẢ ĐẠT
```

### Chức năng bắt buộc của Sprint 1
| Chức năng | Kiểm chứng bằng |
|---|---|
| Mở ứng dụng | e2e desktop (Linux) |
| Sidebar thu gọn | test UI + e2e desktop (bấm thật trên app) |
| Chuyển trang | test UI (10 màn hình) |
| Đổi theme | test UI + e2e (khôi phục theme tối) |
| Lưu / khôi phục cấu hình | 8 test persistence + 10 test Rust + e2e |
| Tạo & đổi profile | test UI (tạo profile tên có dấu, đổi từ thanh trên) |
| Toast | test UI (toast hoàn tác, toast lỗi lưu) |
| Dialog xác nhận | test UI (Huỷ không xoá / Xoá có xoá) |
| Empty state | test UI (thư viện trống, chưa có quy tắc) |
| Loading state | test AppGate (màn hình chờ khi nạp DB) |
| Error state | test AppGate (lỗi nạp → Thử lại / Mở tạm không lưu); ErrorBoundary theo màn hình |

## Lỗi phát hiện & đã sửa trong Sprint 1
1. **Trùng khoá media giữa các profile** (test Rust phát hiện): profile nhân bản / profile mới dùng cùng ID media mẫu → vi phạm khoá chính. Sửa: khoá chính `(profile_id, id)`.
2. **Gõ chữ trong hộp thoại bị đảo lộn** (test UI phát hiện: "Bán hàng sáng" thành "Bá àgsn"): Modal kéo focus ra/vào sau mỗi phím. Sửa: effect chỉ chạy khi mở/đóng hộp thoại.
3. Lint: ref dùng trong cleanup của khung phát video — đã sửa.
4. Tên phiên bản dưới logo bị cắt khi có nút thu gọn — nới rộng sidebar.

## Vấn đề còn tồn tại
| Mức | Vấn đề | Hướng xử lý |
|---|---|---|
| Cao | Chưa chạy thử trên Windows thật trong Sprint 1 | Push → CI build bộ cài → chạy checklist Windows |
| Trung bình | File media vẫn phải "Gắn file" lại sau khi mở lại app (metadata đã lưu, file thì chưa) | Sprint 2: lưu đường dẫn qua Rust + asset protocol, kiểm tra path traversal |
| Trung bình | Bộ cài chưa ký số → Windows SmartScreen cảnh báo | Mua chứng thư code signing (giai đoạn 8) |
| Thấp | GitHub Actions cảnh báo Node.js 20 sắp ngừng hỗ trợ | Nâng phiên bản các action |
| Thấp | Kill tiến trình đột ngột có thể mất thay đổi trong ~0,4 giây cuối | Chấp nhận được; có thể giảm thời gian chờ nếu cần |
| Thấp | `freezePrototype` của Tauri đang tắt (thư viện không tương thích) | Xem lại khi nâng cấp thư viện |
