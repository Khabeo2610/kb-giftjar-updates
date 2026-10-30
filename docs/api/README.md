# API

## Lệnh Tauri (frontend → Rust)

| Lệnh | Tham số | Trả về | Ghi chú |
|---|---|---|---|
| `app_info` | — | `{ version: string, os: string, arch: string }` | Chỉ đọc. Dùng ở Cài đặt → Thông tin phần mềm. |

## Định dạng file profile (`.kbprofile.json`)

```json
{
  "format": "kb-studio-profile",
  "version": 1,
  "exportedAt": "2026-10-30T00:00:00.000Z",
  "profile": { "id": "…", "name": "…", "kind": "pk", "createdAt": 0 },
  "workspace": { "groups": [], "media": [], "rules": [], "deck": { "rows": 3, "cols": 4, "pages": [], "buttons": {} } }
}
```

Schema đầy đủ (và các giới hạn): `apps/desktop/src/lib/schemas.ts`. File chỉ chứa **tên** file media, không chứa đường dẫn hay dữ liệu media.

REST API của License Server: sẽ có ở giai đoạn 6.
