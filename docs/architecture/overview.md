# Kiến trúc KB Studio Pro

> Trạng thái tài liệu: **Giai đoạn 1–2** (Foundation + Sweet Pastel UI). Cập nhật lần cuối: 30/10/2026.

## 1. Lựa chọn công nghệ (đã xác nhận)

| Lớp | Công nghệ | Lý do |
|---|---|---|
| Vỏ desktop | **Tauri 2** (Rust) | Bộ cài nhỏ (~vài MB so với ~80 MB+ của Electron), dùng WebView2 có sẵn trên Windows 10/11, RAM thấp — quan trọng vì máy LIVE còn chạy OBS. Mô hình quyền (capabilities) chặt. |
| Giao diện | **React 19 + TypeScript (strict)** | Hệ sinh thái lớn, dễ tuyển người, kiểm thử tốt. |
| Style | **Tailwind CSS 4 + CSS Variables** | Token màu nằm ở CSS variables → đổi Light/Dark chỉ bằng `data-theme`. |
| Icon / animation | **lucide-react**, **framer-motion** | Icon rõ, animation 150–250ms, tôn trọng "giảm chuyển động". |
| State | **zustand** + persist | Nhẹ, không boilerplate, có middleware lưu tự động. |
| Kiểm tra dữ liệu | **zod** | Mọi dữ liệu nạp lại / nhập từ file đều được kiểm tra schema. |
| Font | **Be Vietnam Pro** (đóng gói offline qua `@fontsource`) | Không phụ thuộc Google Fonts khi chạy. |
| Test | **Vitest + Testing Library + jsdom**, `cargo test` | Chạy nhanh, cùng cấu hình Vite. |

### Cơ sở dữ liệu (Sprint 1)

- **SQLite** cục bộ do Rust quản lý (`rusqlite` 0.41, bản `bundled` — không phụ thuộc SQLite của hệ điều hành).
- File: thư mục dữ liệu ứng dụng → Windows: `%APPDATA%\vn.kbstudio.pro\kb-studio.db`.
- Chế độ WAL + `foreign_keys=ON`. Migration đánh số trong `apps/desktop/src-tauri/migrations/`, ghi vào bảng `schema_migrations`.
- Bảng: `settings` (key → JSON, **key nằm trong whitelist** để không lưu nhầm mật khẩu/token), `profiles`, `media_metadata`, `stream_deck_layouts` (xoá profile → xoá dây chuyền media & deck).
- Mỗi lần lưu là **một transaction** — lỗi giữa chừng sẽ rollback.
- File DB hỏng khi khởi động → đổi tên thành `kb-studio.corrupt-<thời gian>.db` (giữ lại để cứu dữ liệu) và tạo DB mới, app báo cho người dùng.
- Khi chạy trên trình duyệt (xem thử / test): dùng `localStorage` qua cùng interface `StorageBackend`.
- **PostgreSQL** dành cho License Server (giai đoạn 6).

### Phân tầng (Sprint 1)

```
UI (React components, features/*)          ← chỉ hiển thị & gọi action
   │
Domain (store/appStore.ts, packages/event-engine)  ← logic nghiệp vụ thuần, không biết lưu ở đâu
   │
Persistence (src/persistence/*)             ← nạp/kiểm tra/lưu (debounce 400ms, flush khi đóng cửa sổ)
   │
StorageBackend: sqliteBackend ──invoke──▶ Rust (src-tauri/src/db.rs) ──▶ SQLite
                browserBackend / memoryBackend (test)
```

Interface chuẩn bị cho sprint sau (chưa kết nối thật): `packages/media-engine` (`MediaEngine`), `packages/obs-integration` (`ObsClient`, `NotConnectedObsClient`), `packages/event-engine` (`EventSourceAdapter`, `MockEventSource`, `backoffDelay`).

## 2. Cấu trúc monorepo

```
apps/
  desktop/            Ứng dụng Windows (Tauri 2 + React)           ← đang làm
    src/              Giao diện React
    src-tauri/        Lõi Rust (lệnh native, quyền, đóng gói)
  admin/              Admin Dashboard                              ← dự kiến (GĐ 6)
  license-server/     Máy chủ license                              ← dự kiến (GĐ 6)
packages/
  shared-types/       Kiểu dữ liệu dùng chung                      ← đã có
  event-engine/       Rule engine, hàng đợi ưu tiên, chống trùng, mock provider ← đã có + test
  ui-design-system/   Design tokens Sweet Pastel                   ← đã có
  media-engine/       (GĐ 3) Media engine native
  overlay-engine/     (GĐ 4) Browser Source cho OBS
  obs-integration/    (GĐ 4) OBS WebSocket client
  licensing/          (GĐ 6) License client + định dạng token
docs/                 Tài liệu
tests/                Kiểm thử liên module / e2e / hiệu năng (unit test nằm cạnh mã nguồn)
```

`update-manifest.json` ở thư mục gốc là **kênh cập nhật của sản phẩm KB GIFTJAR hiện có** — không được đổi tên/xoá.

## 3. Luồng sự kiện (Event Engine)

```
Event Source (Mock / Test / Provider thật ở GĐ 4)
  → Validation & Normalization  (LiveEvent trong shared-types)
  → Deduplication                (Deduplicator: TTL 60s, tối đa 5.000 ID)
  → Rule Engine                  (evaluateRules: trigger → cooldown chung → cooldown theo người → xác suất)
  → Priority Queue               (BoundedPriorityQueue: tối đa 50 job, đầy thì bỏ job kém ưu tiên nhất)
  → Action Executor              (livePipeline.ts: xử lý 1 job / 350ms để không dồn hiệu ứng)
  → Media / Overlay preview / TTS hệ thống / OBS (ghi log, chưa kết nối)
```

- Rule Engine là **hàm thuần**: nhận `state` + `now` + `random` từ ngoài → kiểm thử được chính xác (17 test).
- Một hành động lỗi được bắt riêng (`try/catch` từng action) → không làm hỏng hàng đợi.
- Mất kết nối nguồn sự kiện không ảnh hưởng media cục bộ (media runtime độc lập với pipeline).

## 4. Media Runtime (bản demo giai đoạn 2)

`apps/desktop/src/features/media/mediaRuntime.ts`

- Phát bằng `HTMLMediaElement` trong WebView; âm thanh phát chồng tối đa 4 (chế độ hiệu năng thấp: 2), video 1 kênh.
- Fade-in/out + cắt đoạn tính bằng hàm thuần `volumeAt()` (có test), cập nhật UI tối đa ~4 lần/giây.
- Kiểm tra file khi thêm: loại file, kích thước ≤ 2 GB, đọc metadata để phát hiện **lỗi codec** ngay, thông báo tiếng Việt.
- **Giới hạn đã biết:** file được giữ bằng object URL trong phiên làm việc; mở lại app phải "Gắn file" lại. Giai đoạn 3 sẽ lưu đường dẫn qua Rust + asset protocol (có kiểm tra đường dẫn chống path traversal).

## 5. Hoàn tác & tự động lưu

- Mọi chỉnh sửa workspace đi qua `commit(label, recipe)` → lưu ảnh chụp trước đó (tối đa 50 bước) → `undo()/redo()`.
- Lịch sử gắn với profile hiện tại; đổi profile thì xoá lịch sử để tránh hoàn tác nhầm.
- Tầng persistence lưu sau 400ms kể từ thay đổi cuối; khi bấm nút đóng cửa sổ, app ghi nốt rồi mới thoát.
- Khởi động: màn hình chờ → nạp → kiểm tra zod → vào app. Dữ liệu hỏng → dùng mặc định + cảnh báo, **không ghi đè** cho tới khi người dùng thay đổi. Lỗi đọc → màn hình lỗi có "Thử lại" / "Mở tạm, không lưu".

## 6. Cách ly lỗi

- Mỗi màn hình bọc trong `ErrorBoundary` → lỗi một module không làm sập app, media đang phát vẫn chạy.
- Lõi Rust hiện chỉ có lệnh `app_info`; các module native tiếp theo sẽ là file riêng, đăng ký vào `invoke_handler`.

## 7. Nguyên tắc phân tách (theo brief)

| # | Thành phần | Vị trí | Trạng thái |
|---|---|---|---|
| 1 | Desktop UI | `apps/desktop/src` | Demo |
| 2 | Core Application | `apps/desktop/src/store`, `src-tauri` | Demo |
| 3 | Media Engine | `features/media` (WebView) → `packages/media-engine` (GĐ 3) | Demo |
| 4 | TikTok Event Engine | `packages/event-engine` | Đã có logic + test, chưa có provider thật |
| 5 | OBS Integration | `packages/obs-integration` | Dự kiến |
| 6 | Overlay Engine | `packages/overlay-engine` | Dự kiến |
| 7 | Mini-game Engine | — | Dự kiến |
| 8 | License Client | `packages/licensing` | Dự kiến |
| 9 | License Server | `apps/license-server` | Dự kiến |
| 10 | Admin Dashboard | `apps/admin` | Dự kiến |
