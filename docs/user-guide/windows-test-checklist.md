# Checklist kiểm thử Sprint 1 trên Windows

> Dành cho người nghiệm thu. Mỗi mục ghi ✅ / ❌ và chụp màn hình nếu ❌.
> Máy thử: Windows 10/11 x64, có WebView2 (Windows 11 có sẵn).

## 0. Chuẩn bị
- Cài bằng bộ cài `KB Studio Pro_0.2.0_x64-setup.exe` (lấy từ GitHub Actions → Artifacts), **hoặc** chạy từ mã nguồn: `pnpm install` rồi `pnpm tauri dev`.
- Nơi lưu dữ liệu: `%APPDATA%\vn.kbstudio.pro\kb-studio.db` (dán đường dẫn này vào thanh địa chỉ File Explorer để mở).

## 1. Mở ứng dụng
| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1.1 | Mở KB Studio Pro từ Start Menu | Cửa sổ mở trong ≤ 5 giây, thấy màn hình chờ “Đang mở dữ liệu của bạn…” rồi tới hướng dẫn lần đầu |
| 1.2 | Mở `%APPDATA%\vn.kbstudio.pro` | Có file `kb-studio.db` |

## 2. Điều hướng & giao diện
| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 2.1 | Bấm lần lượt 5 màn hình: Trang chủ, Video & âm thanh, Hiệu ứng quà, Stream Deck, Cài đặt | Mỗi màn hình hiện đúng tiêu đề, có nhãn “Bản demo” |
| 2.2 | Bấm nút thu gọn (biểu tượng ở cạnh logo) | Sidebar chỉ còn icon; di chuột lên icon thấy tên; bấm icon vẫn chuyển trang |
| 2.3 | Bấm biểu tượng mặt trăng ở thanh trên | Chuyển giao diện tối; chữ vẫn đọc rõ |
| 2.4 | Thu nhỏ cửa sổ tới cỡ tối thiểu (1100×700) | Không có chữ đè lên nhau, không có thanh cuộn ngang |

## 3. Toast, hộp thoại xác nhận, empty / loading / error state
| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 3.1 | Hiệu ứng quà → bấm 🗑 trên một quy tắc | Hiện hộp thoại “Xoá quy tắc?”; bấm **Huỷ** → không xoá |
| 3.2 | Làm lại 3.1, bấm **Xoá** | Quy tắc biến mất, hiện toast có nút **Hoàn tác**; bấm Hoàn tác → quy tắc quay lại |
| 3.3 | Tạo profile “Tùy chỉnh” rồi vào Video & âm thanh | Thấy màn hình trống (empty state) “Thư viện đang trống” |
| 3.4 | Cài đặt → Thông tin phần mềm | Thoáng thấy “Đang đọc thông tin…”, sau đó hiện đường dẫn file DB và “schema v1” |

## 4. Profile
| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 4.1 | Cài đặt → Profile & sao lưu → **Tạo profile**, gõ tên có dấu “Bán hàng sáng” | Tên hiển thị đúng dấu, app chuyển sang profile mới |
| 4.2 | Đổi profile bằng ô chọn ở thanh trên | Dữ liệu (media, quy tắc, Stream Deck) đổi theo profile |

## 5. Lưu & khôi phục cấu hình (quan trọng nhất)
| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 5.1 | Bật giao diện tối, thu gọn sidebar, đổi lưới Stream Deck thành 4×5, chọn profile “Bán hàng sáng” | Chỉ báo ở thanh trên hiện “Đã lưu” (cửa sổ rộng ≥ 1536px mới thấy chữ) |
| 5.2 | Đóng app bằng nút **X** ngay sau khi đổi thêm một cài đặt | App đóng bình thường, không treo |
| 5.3 | Mở lại app | Giữ nguyên: giao diện tối, sidebar thu gọn, lưới 4×5, profile “Bán hàng sáng” |
| 5.4 | Mở Task Manager → kết thúc tiến trình KB Studio Pro khi đang chạy, rồi mở lại | App mở bình thường, tối đa chỉ mất thay đổi trong ~0,4 giây cuối |
| 5.5 | Đóng app, đổi tên `kb-studio.db` thành file rác (ví dụ ghi đè bằng file .txt bất kỳ, đặt tên `kb-studio.db`), mở lại | App vẫn mở; toast báo DB cũ bị lỗi đã được sao lưu thành `kb-studio.corrupt-….db` |

## 6. Ghi kết quả
Gửi lại: bảng trên (✅/❌), phiên bản Windows, ảnh chụp các mục ❌.
