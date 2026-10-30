# API

## Lệnh Tauri (frontend → Rust)

| Lệnh | Tham số | Trả về | Ghi chú |
|---|---|---|---|
| `app_info` | — | `{ version, os, arch }` | Chỉ đọc. Cài đặt → Thông tin phần mềm. |
| `storage_load` | — | `{ snapshot: Snapshot \| null, warning: string \| null }` | `null` = chưa từng lưu. `warning` khi DB hỏng đã được sao lưu. |
| `storage_save` | `{ snapshot: Snapshot }` | — | Ghi toàn bộ trong 1 transaction. Từ chối key cài đặt ngoài whitelist, profile đang chọn không tồn tại, dữ liệu quá lớn. |
| `storage_info` | — | `{ path, schemaVersion }` | Đường dẫn file DB và phiên bản schema. |

`Snapshot` = `{ settings, profiles, activeProfileId, workspaces }` — cùng hình dạng phần dữ liệu lưu của store (`PersistedSlice` trong `apps/desktop/src/store/appStore.ts`).

Mỗi lệnh phải được khai báo trong `src-tauri/build.rs` **và** cấp quyền trong `src-tauri/capabilities/default.json` (`allow-<tên-lệnh>`); lệnh không được cấp quyền sẽ bị chặn.

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
