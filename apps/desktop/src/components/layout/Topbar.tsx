import { CloudCheck, Moon, PanelTopOpen, Redo2, Search, Sun, Undo2 } from 'lucide-react';
import { useActiveProfile, useAppStore } from '../../store/appStore';
import { PROFILE_KIND_LABELS } from '../../data/defaults';
import { Button, IconButton, Kbd, Select } from '../ui/primitives';
import { cx } from '../../lib/cx';
import { useResolvedTheme } from '../../lib/theme';

export function Topbar() {
  const profiles = useAppStore((s) => s.profiles);
  const active = useActiveProfile();
  const switchProfile = useAppStore((s) => s.switchProfile);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const canUndo = useAppStore((s) => s.past.length > 0);
  const canRedo = useAppStore((s) => s.future.length > 0);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const notify = useAppStore((s) => s.notify);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const miniOpen = useAppStore((s) => s.miniControllerOpen);
  const setMini = useAppStore((s) => s.setMiniControllerOpen);
  const lastSavedAt = useAppStore((s) => s.lastSavedAt);
  const isDark = useResolvedTheme() === 'dark';

  return (
    <header className="flex h-16 min-w-0 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-5">
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="kb-transition flex h-10 w-full min-w-0 max-w-sm items-center gap-2 rounded-control border border-line-strong bg-surface-2 px-3 text-sm text-muted hover:border-primary"
      >
        <Search size={16} aria-hidden />
        <span className="flex-1 truncate text-left">Tìm chức năng, media, quy tắc…</span>
        <Kbd>Ctrl K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <span
          className="hidden items-center gap-1 whitespace-nowrap text-xs text-muted 2xl:inline-flex"
          title="Mọi thay đổi được tự động lưu"
        >
          <CloudCheck size={15} aria-hidden /> {lastSavedAt ? 'Đã tự lưu' : 'Tự động lưu'}
        </span>
        <IconButton
          label="Hoàn tác (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => {
            const l = undo();
            if (l) notify({ tone: 'info', message: `Đã hoàn tác: ${l}` });
          }}
        >
          <Undo2 size={18} />
        </IconButton>
        <IconButton
          label="Làm lại (Ctrl+Y)"
          disabled={!canRedo}
          onClick={() => {
            const l = redo();
            if (l) notify({ tone: 'info', message: `Đã làm lại: ${l}` });
          }}
        >
          <Redo2 size={18} />
        </IconButton>

        <div className="mx-1 flex rounded-control border border-line-strong p-0.5" role="group" aria-label="Chế độ giao diện">
          {(['basic', 'advanced'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={settings.uiMode === m}
              onClick={() => updateSettings({ uiMode: m })}
              className={cx(
                'kb-transition whitespace-nowrap rounded-[10px] px-3 py-1.5 text-xs font-semibold',
                settings.uiMode === m ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink',
              )}
              title={m === 'basic' ? 'Chỉ hiện những thiết lập cần thiết' : 'Hiện đầy đủ thiết lập chi tiết'}
            >
              {m === 'basic' ? 'Cơ bản' : 'Nâng cao'}
            </button>
          ))}
        </div>

        <IconButton
          label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>

        <div className="w-40 shrink-0 xl:w-48" title={`Profile: ${active.name} (${PROFILE_KIND_LABELS[active.kind]})`}>
          <Select aria-label="Profile đang dùng" value={active.id} onChange={(e) => switchProfile(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <Button
          variant={miniOpen ? 'soft' : 'primary'}
          icon={<PanelTopOpen size={17} />}
          onClick={() => setMini(!miniOpen)}
          aria-label="Mini Controller"
          title="Mini Controller"
        >
          <span className="hidden xl:inline">Mini Controller</span>
        </Button>
      </div>
    </header>
  );
}
