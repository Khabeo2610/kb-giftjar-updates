# kb-giftjar-updates
Kênh phát hành và cập nhật chính thức cho KB GIFTJAR

> `update-manifest.json` là kênh cập nhật của **KB GIFTJAR** đang chạy ở máy khách — không đổi tên / xoá file này.

---

# KB Studio Pro — Sweet Pastel Edition 💕

*Your Lovely LIVE Control Center* — phần mềm Windows hỗ trợ creator, idol TikTok, streamer và agency. Chủ sở hữu: **KB Studio**.

**Trạng thái hiện tại: Sprint 1 (v0.2.0) — bản DEMO, chưa sẵn sàng thương mại.** Cấu hình lưu bằng SQLite.
Chưa kết nối TikTok LIVE, chưa kết nối OBS, chưa có hệ thống license. Xem chi tiết: [docs/architecture/module-status.md](docs/architecture/module-status.md).

## Chạy nhanh

```bash
pnpm install
pnpm dev            # giao diện tại http://127.0.0.1:1420
pnpm tauri dev      # bản desktop (cần Rust + WebView2)
pnpm check          # typecheck + lint + test + build
pnpm tauri build    # tạo bộ cài Windows (.exe NSIS + .msi) — chạy trên Windows
```

Kết quả kiểm thử Sprint 1: [docs/test-reports/sprint-1.md](docs/test-reports/sprint-1.md) · Checklist nghiệm thu trên Windows: [docs/user-guide/windows-test-checklist.md](docs/user-guide/windows-test-checklist.md)

Hướng dẫn từng bước cho người mới: [docs/user-guide/getting-started.md](docs/user-guide/getting-started.md)

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [Kiến trúc](docs/architecture/overview.md) | Công nghệ, cấu trúc monorepo, luồng sự kiện, quyết định thiết kế |
| [Trạng thái module](docs/architecture/module-status.md) | Planned / Demo / Tested… của từng module |
| [Threat model](docs/security/threat-model.md) | Mối đe doạ, biện pháp, checklist bảo mật |
| [API](docs/api/README.md) | Lệnh Tauri, định dạng file profile |
| [Nghiên cứu thị trường](docs/research/market-comparison.md) | So sánh sản phẩm (bản nháp, cần kiểm chứng) |

## Cấu trúc

```
apps/desktop          Ứng dụng Windows (Tauri 2 + React 19 + TypeScript)
apps/admin            (dự kiến) Admin Dashboard
apps/license-server   (dự kiến) License Server
packages/shared-types Kiểu dữ liệu dùng chung
packages/event-engine Rule engine, hàng đợi ưu tiên, chống trùng, mock provider
packages/ui-design-system  Design tokens Sweet Pastel (Light/Dark)
docs/                 Tài liệu
```
