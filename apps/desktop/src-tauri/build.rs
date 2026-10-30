fn main() {
    // Chỉ khai báo đúng các lệnh ứng dụng có; mỗi lệnh phải được cấp quyền rõ ràng trong capabilities.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "app_info",
            "storage_load",
            "storage_save",
            "storage_info",
        ])),
    )
    .expect("tauri build script thất bại");
}
