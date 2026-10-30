#!/usr/bin/env bash
# Kiểm thử mở/đóng app desktop + lưu/khôi phục cấu hình SQLite (chạy trên Linux có Xvfb + xdotool).
# Dùng: bash tests/e2e/desktop-persistence-linux.sh <đường-dẫn-file-chạy> <thư-mục-kết-quả>
# Cần: Xvfb, openbox (trình quản lý cửa sổ, để nút đóng hoạt động như thật), wmctrl, xdotool, imagemagick.
# Không đụng dữ liệu thật: dùng thư mục dữ liệu tạm (XDG_DATA_HOME).
set -euo pipefail

BIN="$(realpath "$1")"
OUT="$(mkdir -p "$2" && realpath "$2")"
DATA="$(mktemp -d)"
DB="$DATA/vn.kbstudio.pro/kb-studio.db"
export XDG_DATA_HOME="$DATA" DISPLAY=:99 WEBKIT_DISABLE_DMABUF_RENDERER=1 LIBGL_ALWAYS_SOFTWARE=1

Xvfb :99 -screen 0 1400x900x24 >/dev/null 2>&1 &
XVFB=$!
sleep 1
openbox >/dev/null 2>&1 &
WM=$!
trap 'kill $WM $XVFB 2>/dev/null || true; rm -rf "$DATA"' EXIT
sleep 1

pass() { echo "✅ $*"; }
fail() { echo "❌ $*"; exit 1; }

sql() { python3 -c "import sqlite3,sys; c=sqlite3.connect('$DB'); r=c.execute(sys.argv[1]).fetchall(); c.commit(); print(r)" "$1"; }

wait_window() {
  for _ in $(seq 1 60); do
    # wmctrl đọc được tiêu đề UTF-8 (có dấu "—"); xdotool search thì không.
    HEX=$(wmctrl -l 2>/dev/null | awk '/Sweet Pastel/ {print $1; exit}' || true)
    if [ -n "${HEX:-}" ]; then WID=$((HEX)); return 0; fi
    sleep 0.5
  done
  return 1
}

close_app() {
  # Gửi yêu cầu đóng như khi bấm nút X → app phải lưu xong rồi mới thoát.
  wmctrl -c "Sweet Pastel" || true
  for _ in $(seq 1 40); do kill -0 "$APP" 2>/dev/null || return 0; sleep 0.25; done
  kill "$APP"; fail "App không tự thoát sau khi đóng cửa sổ"
}

echo "── Lần mở 1: chạy lần đầu"
"$BIN" >"$OUT/run1.log" 2>&1 & APP=$!
wait_window || fail "Không thấy cửa sổ app"
sleep 6
import -window root "$OUT/run1-first-launch.png"
[ -f "$DB" ] && pass "Đã tạo file DB: $DB" || fail "Chưa tạo DB"
[ "$(sql "SELECT MAX(version) FROM schema_migrations")" = "[(1,)]" ] && pass "Migration v1 đã áp dụng" || fail "Migration sai"
[ "$(sql "SELECT id FROM profiles")" = "[('pf_default',)]" ] && pass "Đã ghi profile mặc định" || fail "Chưa có profile mặc định"
close_app && pass "Đóng app bình thường (exit)"

echo "── Sửa cấu hình trực tiếp trong DB (giả lập lần dùng trước): theme tối + sidebar thu gọn + onboarding xong"
sql "UPDATE settings SET value='\"dark\"' WHERE key='theme'" >/dev/null
python3 - "$DB" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
c.execute("UPDATE settings SET value='true' WHERE key IN ('sidebarCollapsed','onboardingDone')")
c.execute("UPDATE settings SET value='\"Kha\"' WHERE key='displayName'")
c.commit()
PY

echo "── Lần mở 2: phải khôi phục cấu hình"
"$BIN" >"$OUT/run2.log" 2>&1 & APP=$!
wait_window || fail "Không thấy cửa sổ app (lần 2)"
sleep 6
import -window root "$OUT/run2-restored-dark-collapsed.png"
[ "$(sql "SELECT value FROM settings WHERE key='theme'")" = "[('\"dark\"',)]" ] && pass "Theme tối vẫn giữ sau khi mở lại" || fail "Theme bị ghi đè"

echo "── Thao tác trên giao diện: bấm nút mở rộng sidebar (góc trên trái), rồi đóng app ngay"
xdotool mousemove --window "$WID" 38 84 click 1
sleep 0.2
close_app && pass "Đóng app (lưu nốt thay đổi trước khi thoát)"
[ "$(sql "SELECT value FROM settings WHERE key='sidebarCollapsed'")" = "[('false',)]" ] \
  && pass "Thay đổi từ giao diện đã được lưu vào SQLite khi đóng cửa sổ" \
  || fail "Thay đổi cuối cùng bị mất khi đóng: $(sql "SELECT value FROM settings WHERE key='sidebarCollapsed'")"

echo "── Lần mở 3: kiểm tra lại"
"$BIN" >"$OUT/run3.log" 2>&1 & APP=$!
wait_window || fail "Không thấy cửa sổ app (lần 3)"
sleep 6
import -window root "$OUT/run3-expanded.png"
close_app && pass "Mở/đóng lần 3 ổn định"
echo "TẤT CẢ ĐẠT"
