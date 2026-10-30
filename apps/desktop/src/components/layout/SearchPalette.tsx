import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SCREENS, type ScreenId } from '../../data/screens';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { Modal } from '../ui/overlays';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/primitives';
import { cx } from '../../lib/cx';

interface Result {
  key: string;
  title: string;
  subtitle: string;
  screen: ScreenId;
  icon: string;
}

/** Bỏ dấu tiếng Việt để tìm "hieu ung" vẫn ra "Hiệu ứng". */
export function normalizeVi(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function SearchPalette() {
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const setScreen = useAppStore((s) => s.setScreen);
  const ws = useWorkspace();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const results = useMemo<Result[]>(() => {
    const q = normalizeVi(query);
    const all: Array<Result & { hay: string[] }> = [
      ...SCREENS.map((s) => ({
        key: `s:${s.id}`,
        title: s.label,
        subtitle: s.description,
        screen: s.id,
        icon: s.icon,
        hay: [s.label, s.description, ...s.keywords],
      })),
      ...ws.media.map((m) => ({
        key: `m:${m.id}`,
        title: m.name,
        subtitle: `Media · ${m.kind === 'video' ? 'Video' : 'Âm thanh'}`,
        screen: 'media' as const,
        icon: m.kind === 'video' ? 'Video' : 'Music',
        hay: [m.name, ...m.tags],
      })),
      ...ws.rules.map((r) => ({
        key: `r:${r.id}`,
        title: r.name,
        subtitle: 'Quy tắc hiệu ứng quà',
        screen: 'gifts' as const,
        icon: 'Gift',
        hay: [r.name],
      })),
      ...Object.values(ws.deck.buttons).map((b) => ({
        key: `b:${b.id}`,
        title: b.label,
        subtitle: 'Nút Stream Deck',
        screen: 'deck' as const,
        icon: b.icon,
        hay: [b.label],
      })),
    ];
    return all
      .filter((r) => !q || r.hay.some((h) => normalizeVi(h).includes(q)))
      .slice(0, q ? 12 : 10)
      .map(({ hay: _hay, ...r }) => r);
  }, [query, ws]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    setScreen(r.screen);
    setQuery('');
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setOpen(false);
        setQuery('');
      }}
      title="Tìm kiếm nhanh"
      width="max-w-xl"
    >
      <div className="flex items-center gap-2 rounded-control border border-line-strong bg-surface-2 px-3">
        <Search size={18} className="text-muted" aria-hidden />
        <input
          aria-label="Từ khoá tìm kiếm"
          className="h-11 flex-1 bg-transparent text-[15px] outline-none"
          placeholder="Ví dụ: hiệu ứng quà, dark mode, PK…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter') go(results[cursor]);
          }}
        />
      </div>
      <ul className="mt-3 flex flex-col gap-1" role="listbox" aria-label="Kết quả">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Không tìm thấy kết quả phù hợp.</li>}
        {results.map((r, i) => {
          const screen = SCREENS.find((s) => s.id === r.screen)!;
          return (
            <li key={r.key} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(r)}
                className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === cursor && 'bg-primary-soft')}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-2">
                  <Icon name={r.icon} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-muted">{r.subtitle}</span>
                </span>
                {r.key.startsWith('s:') && <StatusBadge status={screen.status} />}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
