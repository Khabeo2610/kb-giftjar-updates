# Hướng dẫn chạy KB Studio Pro (dành cho người mới)

## A. Xem thử nhanh trên trình duyệt (không cần Rust)

1. Cài **Node.js 22 LTS**: https://nodejs.org → tải bản LTS → cài đặt mặc định.
2. Mở **PowerShell**, cài pnpm:
   ```powershell
   npm install -g pnpm
   ```
3. Tải mã nguồn và cài thư viện:
   ```powershell
   git clone https://github.com/Khabeo2610/kb-giftjar-updates.git
   cd kb-giftjar-updates
   git checkout claude/kb-studio-pro-sweet-pastel-guz60k
   pnpm install
   ```
4. Chạy giao diện:
   ```powershell
   pnpm dev
   ```
5. Mở trình duyệt vào **http://127.0.0.1:1420**.

> Trên trình duyệt, nút "Luôn trên cùng" của Mini Controller sẽ báo chỉ dùng được trong bản desktop — đây là hành vi đúng.

## B. Chạy bản desktop Windows (Tauri)

1. Cài **Rust**: https://rustup.rs → chạy `rustup-init.exe` → chọn mặc định.
2. Cài **Microsoft C++ Build Tools** (Visual Studio Installer → "Desktop development with C++").
3. Windows 10/11 thường đã có **WebView2**. Nếu chưa: tải "Evergreen Bootstrapper" từ Microsoft.
4. Trong thư mục dự án:
   ```powershell
   pnpm tauri dev          # chạy thử, tự tải lại khi sửa code
   pnpm tauri build        # tạo bộ cài .exe (NSIS) và .msi
   ```
   Bộ cài nằm ở `apps\desktop\src-tauri\target\release\bundle\`.

## C. Kiểm tra code

```powershell
pnpm check     # typecheck + test + build
```

## D. Thử nhanh các chức năng (3 phút)

1. **Video & âm thanh** → bấm **Thêm file** (hoặc kéo thả file MP3/MP4) → bấm ▶ để nghe.
2. Bấm ✏️ trên một file → chỉnh âm lượng, fade, gán phím tắt (ví dụ `F1`).
3. **Hiệu ứng quà** → bảng **Thử nghiệm** → **Gửi quà thử** → xem hiệu ứng ở khung "Xem trước overlay".
4. Bấm **10 quà cùng lúc** → xem hàng đợi xử lý lần lượt theo độ ưu tiên.
5. **Stream Deck** → bật **Chế độ chỉnh sửa** → bấm ô trống để tạo nút → kéo thả để đổi chỗ.
6. **Mini Controller** (góc trên phải) → bảng nút nổi để bấm khi đang LIVE.
7. Lỡ tay xoá? Bấm **Hoàn tác** trên thông báo hoặc `Ctrl+Z`.

## E. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `pnpm: command not found` | Chạy lại `npm install -g pnpm`, đóng/mở lại PowerShell. |
| Cổng 1420 đang bị dùng | Tắt cửa sổ `pnpm dev` cũ, hoặc khởi động lại máy. |
| "là media mẫu, chưa có file" | Media mẫu chỉ để minh hoạ. Bấm 🔗 **Gắn file** để chọn file thật. |
| "Cần gắn lại file" sau khi mở lại app | Giới hạn của bản demo — bấm 🔗 để gắn lại. Giai đoạn 3 sẽ tự nhớ file. |
| "Định dạng/codec chưa được hỗ trợ" | Chuyển file sang MP4 (H.264 + AAC) hoặc MP3. |
| `tauri build` báo thiếu `link.exe` | Chưa cài C++ Build Tools (bước B.2). |
