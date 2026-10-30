import { SCREENS, type ScreenId } from '../../data/screens';
import { useAppStore } from '../../store/appStore';
import { cx } from '../../lib/cx';
import { Icon } from '../ui/Icon';

export function Sidebar() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const ready = SCREENS.filter((s) => s.status !== 'planned');
  const planned = SCREENS.filter((s) => s.status === 'planned');

  const Item = ({ id, label, icon, muted }: { id: ScreenId; label: string; icon: string; muted?: boolean }) => {
    const active = screen === id;
    return (
      <li>
        <button
          type="button"
          onClick={() => setScreen(id)}
          aria-current={active ? 'page' : undefined}
          className={cx(
            'kb-transition flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm',
            active ? 'bg-primary-soft font-semibold text-ink shadow-soft' : 'text-ink hover:bg-primary-soft/50',
            muted && !active && 'text-muted',
          )}
        >
          <span
            className={cx(
              'flex h-8 w-8 items-center justify-center rounded-[10px]',
              active ? 'bg-primary text-on-primary' : 'bg-surface-2',
            )}
          >
            <Icon name={icon} size={17} />
          </span>
          <span className="truncate">{label}</span>
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Điều hướng chính" className="flex w-[248px] shrink-0 flex-col border-r border-line bg-surface px-3 py-4">
      <div className="mb-5 flex items-center gap-3 px-2">
        <img src="/kb-logo.svg" alt="" className="h-10 w-10" />
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold tracking-tight">KB Studio Pro</div>
          <div className="text-[11px] font-medium text-muted">Sweet Pastel Edition</div>
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {ready.map((s) => (
          <Item key={s.id} id={s.id} label={s.label} icon={s.icon} />
        ))}
      </ul>
      <p className="mt-5 mb-1.5 px-3 text-[11px] font-bold tracking-wider text-muted uppercase">Sắp ra mắt</p>
      <ul className="flex flex-col gap-1">
        {planned.map((s) => (
          <Item key={s.id} id={s.id} label={s.label} icon={s.icon} muted />
        ))}
      </ul>
      <div className="mt-auto rounded-2xl bg-gradient-to-br from-primary-soft to-lavender p-3 text-xs">
        <p className="font-bold">Your Lovely LIVE Control Center 💕</p>
        <p className="mt-1 text-muted">Phiên bản 0.1.0 — bản demo giai đoạn 1–2</p>
      </div>
    </nav>
  );
}
