-- KB Studio Pro — migration 0001: schema ban đầu (Sprint 1)
-- Nguyên tắc: KHÔNG lưu mật khẩu / token ở bảng nào. Secret (nếu có ở các sprint sau)
-- sẽ nằm trong Windows Credential Manager, DB chỉ lưu tham chiếu.

-- Cài đặt chung dạng key → giá trị JSON. Danh sách key được kiểm soát ở phía Rust (whitelist).
CREATE TABLE settings (
  key        TEXT PRIMARY KEY NOT NULL CHECK (length(key) BETWEEN 1 AND 64),
  value      TEXT NOT NULL CHECK (json_valid(value)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Profile: mỗi profile có cấu hình độc lập.
-- groups_json / rules_json: nhóm media và quy tắc hiệu ứng quà (cấu trúc lồng nhau, kiểm tra schema ở tầng ứng dụng).
CREATE TABLE profiles (
  id          TEXT PRIMARY KEY NOT NULL CHECK (length(id) BETWEEN 1 AND 64),
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  kind        TEXT NOT NULL CHECK (kind IN ('idol-female', 'idol-male', 'pk', 'entertainment', 'sales', 'custom')),
  created_at  INTEGER NOT NULL CHECK (created_at >= 0),
  groups_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(groups_json)),
  rules_json  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(rules_json)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Thông tin media (KHÔNG chứa dữ liệu file, chỉ metadata). file_name chỉ là tên file, không phải đường dẫn.
-- Khoá chính gồm (profile_id, id): profile nhân bản được phép giữ cùng ID media.
CREATE TABLE media_metadata (
  id           TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 64),
  profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  kind         TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  group_id     TEXT NOT NULL,
  tags_json    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  volume       REAL NOT NULL CHECK (volume BETWEEN 0 AND 1),
  fade_in_ms   INTEGER NOT NULL CHECK (fade_in_ms >= 0),
  fade_out_ms  INTEGER NOT NULL CHECK (fade_out_ms >= 0),
  start_sec    REAL NOT NULL CHECK (start_sec >= 0),
  end_sec      REAL CHECK (end_sec IS NULL OR end_sec >= 0),
  hotkey       TEXT CHECK (hotkey IS NULL OR length(hotkey) <= 40),
  duration_sec REAL,
  file_name    TEXT CHECK (file_name IS NULL OR (instr(file_name, '/') = 0 AND instr(file_name, '\') = 0 AND instr(file_name, '..') = 0)),
  mime_type    TEXT,
  size_bytes   INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  is_sample    INTEGER NOT NULL CHECK (is_sample IN (0, 1)),
  added_at     INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, id)
);
CREATE INDEX idx_media_profile ON media_metadata(profile_id, sort_order);

-- Bố cục Stream Deck: 1 bố cục cho mỗi profile.
CREATE TABLE stream_deck_layouts (
  profile_id   TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rows         INTEGER NOT NULL CHECK (rows BETWEEN 1 AND 8),
  cols         INTEGER NOT NULL CHECK (cols BETWEEN 1 AND 10),
  pages_json   TEXT NOT NULL CHECK (json_valid(pages_json)),
  buttons_json TEXT NOT NULL CHECK (json_valid(buttons_json)),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
