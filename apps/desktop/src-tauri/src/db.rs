//! Tầng lưu trữ SQLite (persistence).
//!
//! - Migration đánh số, áp dụng trong transaction, ghi vào bảng `schema_migrations`.
//! - `load_snapshot` / `save_snapshot`: đọc/ghi toàn bộ cấu hình trong MỘT transaction
//!   (ghi hỏng giữa chừng sẽ rollback, không để dữ liệu nửa vời).
//! - Không lưu mật khẩu/token: bảng `settings` chỉ nhận các key trong whitelist.

use std::collections::HashMap;
use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Danh sách migration. Không bao giờ sửa migration đã phát hành — chỉ thêm migration mới.
pub const MIGRATIONS: &[(i64, &str)] = &[(1, include_str!("../migrations/0001_init.sql"))];

/// Key được phép lưu trong bảng `settings`. Mọi key khác bị từ chối (chống lưu nhầm secret).
pub const SETTINGS_KEYS: &[&str] = &[
    "displayName",
    "theme",
    "reducedMotion",
    "uiMode",
    "lowPerformanceMode",
    "masterVolume",
    "onboardingDone",
    "sidebarCollapsed",
];
const ACTIVE_PROFILE_KEY: &str = "activeProfileId";

const MAX_PROFILES: usize = 50;
const MAX_MEDIA_PER_PROFILE: usize = 5_000;
const MAX_JSON_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("Lỗi cơ sở dữ liệu: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Lỗi dữ liệu JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Dữ liệu không hợp lệ: {0}")]
    Invalid(String),
}

pub type DbResult<T> = Result<T, DbError>;

// ───────────────────────────── Kiểu dữ liệu trao đổi với frontend ─────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub group_id: String,
    pub tags: Vec<String>,
    pub volume: f64,
    pub fade_in_ms: i64,
    pub fade_out_ms: i64,
    pub start_sec: f64,
    pub end_sec: Option<f64>,
    pub hotkey: Option<String>,
    pub duration_sec: Option<f64>,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub is_sample: bool,
    pub added_at: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckLayout {
    pub rows: i64,
    pub cols: i64,
    pub pages: Value,
    pub buttons: Value,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub groups: Value,
    pub media: Vec<MediaItem>,
    pub rules: Value,
    pub deck: DeckLayout,
}

/// Toàn bộ cấu hình của ứng dụng — đúng hình dạng phần "persisted" của store frontend.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub settings: serde_json::Map<String, Value>,
    pub profiles: Vec<Profile>,
    pub active_profile_id: String,
    pub workspaces: HashMap<String, Workspace>,
}

// ───────────────────────────── Kết nối & migration ─────────────────────────────

pub fn open(path: &Path) -> DbResult<Connection> {
    let conn = Connection::open(path)?;
    configure(&conn)?;
    migrate(&conn)?;
    Ok(conn)
}

#[cfg(test)]
pub fn open_in_memory() -> DbResult<Connection> {
    let conn = Connection::open_in_memory()?;
    configure(&conn)?;
    migrate(&conn)?;
    Ok(conn)
}

fn configure(conn: &Connection) -> DbResult<()> {
    // WAL: ghi an toàn hơn khi mất điện; foreign_keys: bật ràng buộc xoá dây chuyền.
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.busy_timeout(std::time::Duration::from_secs(3))?;
    Ok(())
}

pub fn migrate(conn: &Connection) -> DbResult<Vec<i64>> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
           version    INTEGER PRIMARY KEY NOT NULL,
           applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         );",
    )?;
    let mut applied = Vec::new();
    for (version, sql) in MIGRATIONS {
        let done: Option<i64> = conn
            .query_row("SELECT version FROM schema_migrations WHERE version = ?1", [version], |r| r.get(0))
            .optional()?;
        if done.is_some() {
            continue;
        }
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)?;
        tx.execute("INSERT INTO schema_migrations(version) VALUES (?1)", [version])?;
        tx.commit()?;
        applied.push(*version);
    }
    Ok(applied)
}

pub fn schema_version(conn: &Connection) -> DbResult<i64> {
    Ok(conn.query_row("SELECT COALESCE(MAX(version), 0) FROM schema_migrations", [], |r| r.get(0))?)
}

// ───────────────────────────── Đọc ─────────────────────────────

/// Đọc toàn bộ cấu hình. Trả về `None` nếu chưa từng lưu (lần chạy đầu tiên).
pub fn load_snapshot(conn: &Connection) -> DbResult<Option<Snapshot>> {
    let profile_count: i64 = conn.query_row("SELECT COUNT(*) FROM profiles", [], |r| r.get(0))?;
    if profile_count == 0 {
        return Ok(None);
    }

    let mut settings = serde_json::Map::new();
    let mut active_profile_id = String::new();
    {
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
        for row in rows {
            let (key, value) = row?;
            let value: Value = serde_json::from_str(&value)?;
            if key == ACTIVE_PROFILE_KEY {
                active_profile_id = value.as_str().unwrap_or_default().to_string();
            } else if SETTINGS_KEYS.contains(&key.as_str()) {
                settings.insert(key, value);
            }
        }
    }

    let mut profiles = Vec::new();
    let mut workspaces = HashMap::new();
    let mut stmt = conn.prepare("SELECT id, name, kind, created_at, groups_json, rules_json FROM profiles ORDER BY sort_order, rowid")?;
    let rows = stmt.query_map([], |r| {
        Ok((
            Profile { id: r.get(0)?, name: r.get(1)?, kind: r.get(2)?, created_at: r.get(3)? },
            r.get::<_, String>(4)?,
            r.get::<_, String>(5)?,
        ))
    })?;
    for row in rows {
        let (profile, groups_json, rules_json) = row?;
        let media = load_media(conn, &profile.id)?;
        let deck = load_deck(conn, &profile.id)?;
        workspaces.insert(
            profile.id.clone(),
            Workspace { groups: serde_json::from_str(&groups_json)?, media, rules: serde_json::from_str(&rules_json)?, deck },
        );
        profiles.push(profile);
    }

    if !profiles.iter().any(|p| p.id == active_profile_id) {
        active_profile_id = profiles[0].id.clone();
    }
    Ok(Some(Snapshot { settings, profiles, active_profile_id, workspaces }))
}

fn load_media(conn: &Connection, profile_id: &str) -> DbResult<Vec<MediaItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, kind, group_id, tags_json, volume, fade_in_ms, fade_out_ms, start_sec, end_sec, hotkey,
                duration_sec, file_name, mime_type, size_bytes, is_sample, added_at
         FROM media_metadata WHERE profile_id = ?1 ORDER BY sort_order, rowid",
    )?;
    let rows = stmt.query_map([profile_id], |r| {
        Ok((
            MediaItem {
                id: r.get(0)?,
                name: r.get(1)?,
                kind: r.get(2)?,
                group_id: r.get(3)?,
                tags: Vec::new(),
                volume: r.get(5)?,
                fade_in_ms: r.get(6)?,
                fade_out_ms: r.get(7)?,
                start_sec: r.get(8)?,
                end_sec: r.get(9)?,
                hotkey: r.get(10)?,
                duration_sec: r.get(11)?,
                file_name: r.get(12)?,
                mime_type: r.get(13)?,
                size_bytes: r.get(14)?,
                is_sample: r.get::<_, i64>(15)? == 1,
                added_at: r.get(16)?,
            },
            r.get::<_, String>(4)?,
        ))
    })?;
    rows.map(|row| {
        let (mut item, tags_json) = row?;
        item.tags = serde_json::from_str(&tags_json)?;
        Ok(item)
    })
    .collect()
}

fn load_deck(conn: &Connection, profile_id: &str) -> DbResult<DeckLayout> {
    let deck = conn
        .query_row(
            "SELECT rows, cols, pages_json, buttons_json FROM stream_deck_layouts WHERE profile_id = ?1",
            [profile_id],
            |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, String>(2)?, r.get::<_, String>(3)?)),
        )
        .optional()?;
    Ok(match deck {
        Some((rows, cols, pages, buttons)) => {
            DeckLayout { rows, cols, pages: serde_json::from_str(&pages)?, buttons: serde_json::from_str(&buttons)? }
        }
        None => DeckLayout { rows: 3, cols: 4, pages: Value::Array(vec![]), buttons: Value::Object(Default::default()) },
    })
}

// ───────────────────────────── Ghi ─────────────────────────────

/// Kiểm tra dữ liệu trước khi ghi. Frontend đã kiểm tra bằng zod, đây là lớp phòng thủ thứ hai.
pub fn validate(snapshot: &Snapshot) -> DbResult<()> {
    let invalid = |m: &str| Err(DbError::Invalid(m.to_string()));
    if snapshot.profiles.is_empty() || snapshot.profiles.len() > MAX_PROFILES {
        return invalid("số lượng profile không hợp lệ");
    }
    if !snapshot.profiles.iter().any(|p| p.id == snapshot.active_profile_id) {
        return invalid("profile đang chọn không tồn tại");
    }
    for key in snapshot.settings.keys() {
        if !SETTINGS_KEYS.contains(&key.as_str()) {
            return Err(DbError::Invalid(format!("không cho phép lưu cài đặt \"{key}\"")));
        }
    }
    for p in &snapshot.profiles {
        let ws = snapshot
            .workspaces
            .get(&p.id)
            .ok_or_else(|| DbError::Invalid(format!("thiếu dữ liệu của profile {}", p.id)))?;
        if ws.media.len() > MAX_MEDIA_PER_PROFILE {
            return invalid("quá nhiều media trong một profile");
        }
        for json in [&ws.groups, &ws.rules, &ws.deck.pages, &ws.deck.buttons] {
            if serde_json::to_vec(json)?.len() > MAX_JSON_BYTES {
                return invalid("dữ liệu cấu hình quá lớn");
            }
        }
    }
    Ok(())
}

/// Ghi toàn bộ cấu hình trong một transaction (thay thế dữ liệu cũ).
pub fn save_snapshot(conn: &mut Connection, snapshot: &Snapshot) -> DbResult<()> {
    validate(snapshot)?;
    let tx = conn.transaction()?;
    write_all(&tx, snapshot)?;
    tx.commit()?;
    Ok(())
}

fn write_all(tx: &Transaction, s: &Snapshot) -> DbResult<()> {
    // Xoá profile không còn trong snapshot → media & deck bị xoá theo (ON DELETE CASCADE).
    let keep: Vec<&str> = s.profiles.iter().map(|p| p.id.as_str()).collect();
    {
        let mut stmt = tx.prepare("SELECT id FROM profiles")?;
        let existing: Vec<String> = stmt.query_map([], |r| r.get(0))?.collect::<Result<_, _>>()?;
        for id in existing.iter().filter(|id| !keep.contains(&id.as_str())) {
            tx.execute("DELETE FROM profiles WHERE id = ?1", [id])?;
        }
    }

    for (key, value) in &s.settings {
        tx.execute(
            "INSERT INTO settings(key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE settings.value <> excluded.value",
            params![key, serde_json::to_string(value)?],
        )?;
    }
    tx.execute(
        "INSERT INTO settings(key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![ACTIVE_PROFILE_KEY, serde_json::to_string(&s.active_profile_id)?],
    )?;

    for (order, p) in s.profiles.iter().enumerate() {
        let ws = &s.workspaces[&p.id];
        tx.execute(
            "INSERT INTO profiles(id, name, kind, created_at, groups_json, rules_json, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind,
               groups_json = excluded.groups_json, rules_json = excluded.rules_json,
               sort_order = excluded.sort_order, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![
                p.id,
                p.name,
                p.kind,
                p.created_at,
                serde_json::to_string(&ws.groups)?,
                serde_json::to_string(&ws.rules)?,
                order as i64
            ],
        )?;

        tx.execute("DELETE FROM media_metadata WHERE profile_id = ?1", [&p.id])?;
        let mut insert = tx.prepare_cached(
            "INSERT INTO media_metadata(id, profile_id, name, kind, group_id, tags_json, volume, fade_in_ms, fade_out_ms,
               start_sec, end_sec, hotkey, duration_sec, file_name, mime_type, size_bytes, is_sample, added_at, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
        )?;
        for (i, m) in ws.media.iter().enumerate() {
            insert.execute(params![
                m.id,
                p.id,
                m.name,
                m.kind,
                m.group_id,
                serde_json::to_string(&m.tags)?,
                m.volume,
                m.fade_in_ms,
                m.fade_out_ms,
                m.start_sec,
                m.end_sec,
                m.hotkey,
                m.duration_sec,
                m.file_name,
                m.mime_type,
                m.size_bytes,
                m.is_sample as i64,
                m.added_at,
                i as i64
            ])?;
        }

        tx.execute(
            "INSERT INTO stream_deck_layouts(profile_id, rows, cols, pages_json, buttons_json) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(profile_id) DO UPDATE SET rows = excluded.rows, cols = excluded.cols,
               pages_json = excluded.pages_json, buttons_json = excluded.buttons_json,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![
                p.id,
                ws.deck.rows,
                ws.deck.cols,
                serde_json::to_string(&ws.deck.pages)?,
                serde_json::to_string(&ws.deck.buttons)?
            ],
        )?;
    }
    Ok(())
}

// ───────────────────────────── Test ─────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample_media(id: &str) -> MediaItem {
        MediaItem {
            id: id.into(),
            name: "Cảm ơn bạn yêu".into(),
            kind: "audio".into(),
            group_id: "g_user".into(),
            tags: vec!["cảm ơn".into()],
            volume: 0.8,
            fade_in_ms: 0,
            fade_out_ms: 300,
            start_sec: 0.0,
            end_sec: None,
            hotkey: Some("F1".into()),
            duration_sec: Some(3.5),
            file_name: Some("cam-on.mp3".into()),
            mime_type: Some("audio/mpeg".into()),
            size_bytes: Some(1234),
            is_sample: false,
            added_at: 1,
        }
    }

    fn sample_snapshot() -> Snapshot {
        let mut settings = serde_json::Map::new();
        settings.insert("theme".into(), json!("dark"));
        settings.insert("masterVolume".into(), json!(0.7));
        let ws = Workspace {
            groups: json!([{ "id": "g_user", "name": "User", "color": "pink", "builtIn": true }]),
            media: vec![sample_media("m1"), sample_media("m2")],
            rules: json!([{ "id": "r1", "name": "Hoa hồng" }]),
            deck: DeckLayout { rows: 2, cols: 3, pages: json!([{ "id": "p1", "name": "Chính", "slots": [null] }]), buttons: json!({}) },
        };
        Snapshot {
            settings,
            profiles: vec![
                Profile { id: "pf_a".into(), name: "Idol nữ".into(), kind: "idol-female".into(), created_at: 0 },
                Profile { id: "pf_b".into(), name: "PK".into(), kind: "pk".into(), created_at: 1 },
            ],
            active_profile_id: "pf_b".into(),
            workspaces: HashMap::from([("pf_a".into(), ws.clone()), ("pf_b".into(), ws)]),
        }
    }

    #[test]
    fn migration_tao_du_4_bang_va_chay_lai_khong_loi() {
        let conn = open_in_memory().unwrap();
        assert_eq!(schema_version(&conn).unwrap(), 1);
        for table in ["settings", "profiles", "media_metadata", "stream_deck_layouts"] {
            let n: i64 = conn
                .query_row("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1", [table], |r| r.get(0))
                .unwrap();
            assert_eq!(n, 1, "thiếu bảng {table}");
        }
        // Chạy lại migration: không áp dụng lại, không lỗi (idempotent).
        assert!(migrate(&conn).unwrap().is_empty());
    }

    #[test]
    fn lan_dau_chua_co_du_lieu_tra_ve_none() {
        let conn = open_in_memory().unwrap();
        assert!(load_snapshot(&conn).unwrap().is_none());
    }

    #[test]
    fn luu_roi_doc_lai_giong_het() {
        let mut conn = open_in_memory().unwrap();
        let snap = sample_snapshot();
        save_snapshot(&mut conn, &snap).unwrap();
        assert_eq!(load_snapshot(&conn).unwrap().unwrap(), snap);
        // Ghi lần 2 (cập nhật) vẫn nhất quán.
        save_snapshot(&mut conn, &snap).unwrap();
        assert_eq!(load_snapshot(&conn).unwrap().unwrap(), snap);
    }

    #[test]
    fn xoa_profile_xoa_luon_media_va_deck() {
        let mut conn = open_in_memory().unwrap();
        let mut snap = sample_snapshot();
        save_snapshot(&mut conn, &snap).unwrap();
        snap.profiles.retain(|p| p.id == "pf_b");
        snap.workspaces.remove("pf_a");
        save_snapshot(&mut conn, &snap).unwrap();
        let media: i64 = conn.query_row("SELECT COUNT(*) FROM media_metadata WHERE profile_id='pf_a'", [], |r| r.get(0)).unwrap();
        let deck: i64 = conn.query_row("SELECT COUNT(*) FROM stream_deck_layouts WHERE profile_id='pf_a'", [], |r| r.get(0)).unwrap();
        assert_eq!((media, deck), (0, 0));
    }

    #[test]
    fn tu_choi_key_cai_dat_la_nhu_password() {
        let mut conn = open_in_memory().unwrap();
        let mut snap = sample_snapshot();
        snap.settings.insert("obsPassword".into(), json!("123456"));
        let err = save_snapshot(&mut conn, &snap).unwrap_err();
        assert!(err.to_string().contains("obsPassword"));
        assert!(load_snapshot(&conn).unwrap().is_none(), "không được ghi gì khi dữ liệu bị từ chối");
    }

    #[test]
    fn rang_buoc_db_chan_ten_file_co_duong_dan_va_rollback() {
        let mut conn = open_in_memory().unwrap();
        let mut snap = sample_snapshot();
        save_snapshot(&mut conn, &snap).unwrap();
        snap.workspaces.get_mut("pf_a").unwrap().media[0].file_name = Some("..\\..\\Windows\\evil.mp3".into());
        snap.profiles[0].name = "Tên mới".into();
        assert!(save_snapshot(&mut conn, &snap).is_err());
        // Transaction bị rollback: tên profile cũ vẫn giữ nguyên.
        let name: String = conn.query_row("SELECT name FROM profiles WHERE id='pf_a'", [], |r| r.get(0)).unwrap();
        assert_eq!(name, "Idol nữ");
    }

    #[test]
    fn tu_choi_profile_dang_chon_khong_ton_tai() {
        let mut snap = sample_snapshot();
        snap.active_profile_id = "khong-co".into();
        assert!(validate(&snap).is_err());
    }

    #[test]
    fn du_lieu_ben_vung_khi_dong_mo_lai_file_db() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("kb-studio.db");
        {
            let mut conn = open(&path).unwrap();
            save_snapshot(&mut conn, &sample_snapshot()).unwrap();
        } // đóng kết nối như khi tắt app
        let conn = open(&path).unwrap();
        let loaded = load_snapshot(&conn).unwrap().unwrap();
        assert_eq!(loaded.active_profile_id, "pf_b");
        assert_eq!(loaded.settings["theme"], json!("dark"));
    }
}
