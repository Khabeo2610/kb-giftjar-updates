//! Lõi desktop của KB Studio Pro (Tauri 2).
//!
//! Module:
//! - `db`: tầng lưu trữ SQLite (migration, đọc/ghi cấu hình).
//!
//! Các lệnh frontend được gọi (đã khai báo tối thiểu trong `build.rs` + `capabilities/default.json`):
//! `app_info`, `storage_load`, `storage_save`, `storage_info`.

mod db;

use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::Manager;

const DB_FILE: &str = "kb-studio.db";

/// Trạng thái dùng chung: kết nối DB (None nếu mở thất bại) và cảnh báo khi khởi động.
struct Storage {
    conn: Mutex<Option<rusqlite::Connection>>,
    path: PathBuf,
    startup_warning: Mutex<Option<String>>,
    startup_error: Option<String>,
}

#[derive(Serialize)]
pub struct AppInfo {
    version: String,
    os: &'static str,
    arch: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoadResult {
    snapshot: Option<db::Snapshot>,
    /// Ví dụ: file DB hỏng đã được sao lưu và tạo mới.
    warning: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageInfo {
    path: String,
    schema_version: i64,
}

/// Thông tin phiên bản & nền tảng hiển thị ở Cài đặt → Thông tin phần mềm.
#[tauri::command]
fn app_info(app: tauri::AppHandle) -> AppInfo {
    AppInfo { version: app.package_info().version.to_string(), os: std::env::consts::OS, arch: std::env::consts::ARCH }
}

#[tauri::command]
fn storage_load(state: tauri::State<'_, Storage>) -> Result<LoadResult, String> {
    if let Some(err) = &state.startup_error {
        return Err(err.clone());
    }
    let guard = state.conn.lock().map_err(|_| "Bộ lưu trữ đang bận, vui lòng thử lại.".to_string())?;
    let conn = guard.as_ref().ok_or("Chưa mở được cơ sở dữ liệu.")?;
    let snapshot = db::load_snapshot(conn).map_err(|e| e.to_string())?;
    let warning = state.startup_warning.lock().ok().and_then(|mut w| w.take());
    Ok(LoadResult { snapshot, warning })
}

#[tauri::command]
fn storage_save(state: tauri::State<'_, Storage>, snapshot: db::Snapshot) -> Result<(), String> {
    let mut guard = state.conn.lock().map_err(|_| "Bộ lưu trữ đang bận, vui lòng thử lại.".to_string())?;
    let conn = guard.as_mut().ok_or("Chưa mở được cơ sở dữ liệu.")?;
    db::save_snapshot(conn, &snapshot).map_err(|e| e.to_string())
}

#[tauri::command]
fn storage_info(state: tauri::State<'_, Storage>) -> Result<StorageInfo, String> {
    let guard = state.conn.lock().map_err(|_| "Bộ lưu trữ đang bận.".to_string())?;
    let conn = guard.as_ref().ok_or("Chưa mở được cơ sở dữ liệu.")?;
    Ok(StorageInfo {
        path: state.path.display().to_string(),
        schema_version: db::schema_version(conn).map_err(|e| e.to_string())?,
    })
}

/// Mở DB. Nếu file hỏng: đổi tên thành bản sao lưu (không xoá dữ liệu người dùng) rồi tạo DB mới.
fn open_storage(dir: PathBuf) -> Storage {
    let path = dir.join(DB_FILE);
    if let Err(e) = std::fs::create_dir_all(&dir) {
        return Storage {
            conn: Mutex::new(None),
            path,
            startup_warning: Mutex::new(None),
            startup_error: Some(format!("Không tạo được thư mục dữ liệu: {e}")),
        };
    }
    match db::open(&path) {
        Ok(conn) => Storage { conn: Mutex::new(Some(conn)), path, startup_warning: Mutex::new(None), startup_error: None },
        Err(first_err) => {
            let stamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or_default();
            let backup = dir.join(format!("kb-studio.corrupt-{stamp}.db"));
            let moved = std::fs::rename(&path, &backup).is_ok();
            match db::open(&path) {
                Ok(conn) if moved => Storage {
                    conn: Mutex::new(Some(conn)),
                    path,
                    startup_warning: Mutex::new(Some(format!(
                        "Cơ sở dữ liệu cũ bị lỗi nên đã được sao lưu thành \"{}\" và tạo mới.",
                        backup.file_name().unwrap_or_default().to_string_lossy()
                    ))),
                    startup_error: None,
                },
                _ => Storage {
                    conn: Mutex::new(None),
                    path,
                    startup_warning: Mutex::new(None),
                    startup_error: Some(format!("Không mở được cơ sở dữ liệu: {first_err}")),
                },
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            app.manage(open_storage(dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![app_info, storage_load, storage_save, storage_info])
        .run(tauri::generate_context!())
        .expect("không khởi động được KB Studio Pro");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platform_constants_are_known() {
        assert!(!std::env::consts::OS.is_empty());
        assert!(!std::env::consts::ARCH.is_empty());
    }

    #[test]
    fn file_db_hong_duoc_sao_luu_va_tao_moi() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join(DB_FILE), b"day khong phai file sqlite").unwrap();
        let storage = open_storage(dir.path().to_path_buf());
        assert!(storage.startup_error.is_none());
        assert!(storage.conn.lock().unwrap().is_some());
        assert!(storage.startup_warning.lock().unwrap().is_some());
        let backups = std::fs::read_dir(dir.path())
            .unwrap()
            .filter(|e| e.as_ref().unwrap().file_name().to_string_lossy().contains("corrupt"))
            .count();
        assert_eq!(backups, 1, "file hỏng phải được giữ lại làm bản sao lưu");
    }
}
