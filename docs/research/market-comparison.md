# Nghiên cứu sản phẩm thị trường (bản nháp)

> ⚠️ **Lưu ý độ tin cậy:** bảng dưới được tổng hợp từ hiểu biết chung về các sản phẩm tính đến thời điểm soạn, **chưa được đối chiếu lại với website/tài liệu chính thức trong phiên làm việc này**. Tính năng của các sản phẩm thay đổi thường xuyên — mọi ô đánh dấu "?" hoặc "cần kiểm chứng" phải được xác minh trước khi dùng cho tài liệu bán hàng. Không sao chép giao diện, mã nguồn hay tài nguyên của sản phẩm nào.

## Bảng so sánh (định hướng)

| Tiêu chí | TikFinity | Tikmo | NamStudio | Streamer.bot | TikTok LIVE Studio | OBS Studio | **KB Studio Pro (mục tiêu)** |
|---|---|---|---|---|---|---|---|
| Loại sản phẩm | Web/app tương tác TikTok LIVE | Công cụ tương tác TikTok (cần kiểm chứng) | Công cụ của creator VN (cần kiểm chứng) | Tự động hoá stream đa nền tảng | Phần mềm phát LIVE chính thức của TikTok | Phần mềm phát/ghi hình mã nguồn mở | Trung tâm điều khiển LIVE cho idol & agency VN |
| Hiệu ứng theo quà | Có | Có (?) | Có (?) | Có (qua action/trigger) | Hạn chế | Không (cần plugin) | Có — rule TRIGGER → CONDITION → ACTION |
| TTS đọc bình luận | Có | ? | ? | Có (qua tích hợp) | ? | Không | Có — ưu tiên tiếng Việt (GĐ 4) |
| Overlay / Browser Source | Có | ? | ? | Gián tiếp | Có sẵn một số widget | Là nơi hiển thị | Có (GĐ 4) |
| Mini-game / Gift jar | Một số | ? | ? | Tự dựng | Không | Không | Có (GĐ 5) |
| Điều khiển OBS | Có (qua WebSocket) | ? | ? | Mạnh | — | — | Có (GĐ 4) |
| Giao diện tiếng Việt | Không đầy đủ (?) | ? | Có (?) | Không | Có | Có | **Có, mặc định** |
| Dễ dùng cho người không rành công nghệ | Trung bình | ? | ? | Khó (cho người kỹ thuật) | Dễ | Trung bình | **Ưu tiên số 1** (chế độ Cơ bản/Nâng cao) |
| Quản lý license / khách hàng cho agency | Không | ? | ? | Không | Không | Không | **Có (GĐ 6)** |

## Giới hạn nền tảng TikTok (quan trọng)
- TikTok không công bố API sự kiện LIVE công khai cho mọi nhà phát triển; nhiều công cụ dùng nguồn không chính thức. Việc này có rủi ro bị thay đổi/chặn bất cứ lúc nào và có thể vi phạm điều khoản.
- **Chính sách của KB Studio Pro:** không yêu cầu mật khẩu TikTok, không vượt cơ chế xác thực/hạn chế truy cập. Event Engine được thiết kế theo **Adapter**: khi có nguồn hợp lệ (API chính thức, đối tác, hoặc nguồn khách hàng tự chịu trách nhiệm theo điều khoản) chỉ cần viết thêm một adapter.
- Không tuyên bố "kết nối TikTok thành công" cho đến khi kiểm chứng với nguồn hợp lệ.

## Đề xuất khác biệt cho KB Studio
1. **Thuần Việt & dễ thương**: ngôn ngữ, thông báo lỗi, giọng đọc tiếng Việt, từ điển phát âm tên người xem.
2. **Chế độ Cơ bản/Nâng cao** + hướng dẫn 3 phút: phục vụ idol không rành kỹ thuật.
3. **Profile theo kịch bản** (Idol nữ/nam, PK, Bán hàng…) chuyển 1 chạm, xuất/nhập để agency nhân bản cho nhiều idol.
4. **Hiệu năng cho máy LIVE**: Tauri nhẹ, chế độ hiệu năng thấp, giới hạn hiệu ứng đồng thời.
5. **Công cụ cho agency/đơn vị setup**: license nhiều thiết bị, quản lý khách hàng, hỗ trợ chuyển máy.
6. **Gift Jar / mini-game nguyên bản** gắn với văn hoá LIVE Việt (PK, thả tim, quà).

## Việc cần làm tiếp
- [ ] Đối chiếu từng ô "?" với website/tài liệu chính thức (ghi link + ngày truy cập).
- [ ] Phỏng vấn 5–10 idol/agency đang dùng các công cụ trên (điểm đau, mức giá chấp nhận).
- [ ] Đánh giá các nguồn sự kiện LIVE hợp lệ và điều khoản sử dụng.
