//! Lõi desktop của KB Studio Pro (Tauri 2).
//!
//! Giai đoạn 1–2 chỉ cung cấp lệnh đọc thông tin ứng dụng. Các module sau
//! (media engine, global hotkey, OBS, license client) sẽ được thêm thành từng
//! file riêng và đăng ký vào `invoke_handler` bên dưới.

use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    version: String,
    os: &'static str,
    arch: &'static str,
}

/// Thông tin phiên bản & nền tảng hiển thị ở Cài đặt → Thông tin phần mềm.
#[tauri::command]
fn app_info(app: tauri::AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("không khởi động được KB Studio Pro");
}

#[cfg(test)]
mod tests {
    #[test]
    fn platform_constants_are_known() {
        assert!(!std::env::consts::OS.is_empty());
        assert!(!std::env::consts::ARCH.is_empty());
    }
}
