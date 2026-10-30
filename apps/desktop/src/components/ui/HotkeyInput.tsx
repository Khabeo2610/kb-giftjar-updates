import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { hotkeyFromEvent, isAssignableHotkey } from '../../lib/hotkeys';
import { cx } from '../../lib/cx';

/** Ô ghi phím tắt: bấm vào rồi nhấn tổ hợp phím mong muốn. */
export function HotkeyInput({
  value,
  onChange,
  conflictWith,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  /** Trả về tên chức năng đang dùng phím này (nếu có) để cảnh báo trùng. */
  conflictWith?: (hotkey: string) => string | null;
}) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cx(
            'kb-transition flex h-10 flex-1 items-center gap-2 rounded-control border px-3 text-left text-sm',
            recording ? 'border-primary bg-primary-soft ring-4 ring-primary-soft' : 'border-line-strong bg-surface',
          )}
          onClick={() => {
            setRecording(true);
            setError(null);
          }}
          onBlur={() => setRecording(false)}
          onKeyDown={(e) => {
            if (!recording) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') return setRecording(false);
            const hk = hotkeyFromEvent(e.nativeEvent);
            if (!hk) return;
            if (!isAssignableHotkey(hk)) {
              setError(`"${hk}" không dùng được. Hãy dùng Ctrl/Alt + phím, hoặc F1–F12.`);
              return;
            }
            const conflict = conflictWith?.(hk);
            if (conflict) {
              setError(`"${hk}" đang được dùng cho "${conflict}".`);
              return;
            }
            onChange(hk);
            setRecording(false);
          }}
        >
          <Keyboard size={16} className="text-muted" aria-hidden />
          {recording ? (
            <span className="text-accent">Nhấn tổ hợp phím…</span>
          ) : value ? (
            <span className="font-semibold">{value}</span>
          ) : (
            <span className="text-muted">Chưa gán — bấm để ghi phím</span>
          )}
        </button>
        {value && (
          <button
            type="button"
            aria-label="Xoá phím tắt"
            title="Xoá phím tắt"
            className="text-muted hover:text-danger"
            onClick={() => onChange(null)}
          >
            <X size={18} />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
