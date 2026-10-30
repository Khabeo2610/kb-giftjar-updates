# Kiểm thử

- **Unit test** nằm cạnh mã nguồn: `packages/event-engine/src/*.test.ts`, `apps/desktop/src/test/`, `apps/desktop/src-tauri/src/lib.rs` (`cargo test`).
- `integration/`, `e2e/`, `performance/`: dự kiến từ giai đoạn 4 và 7 (Playwright với bản desktop, benchmark CPU/RAM khi chạy cùng OBS).

Chạy tất cả: `pnpm check` (typecheck + test + build).
