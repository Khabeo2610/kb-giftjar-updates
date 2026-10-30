import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SCREENS, type ScreenId } from '../../data/screens';
import { useAppStore } from '../../store/appStore';
import { cx } from '../../lib/cx';
import { Icon } from '../ui/Icon';

function NavItem({
  id,
  label,
  icon,
  muted,
  collapsed,
}: {
  id: ScreenId;
  label: string;
  icon: string;
  muted?: boolean;
  collapsed: boolean;
}) {
  const active = useAppStore((s) => s.screen === id);
  const setScreen = useAppStore((s) => s.setScreen);
  return (
    <li>
      <button
        type="button"
        onClick={() => setScreen(id)}
        aria-current={active ? 'page' : undefined}
        aria-label={label}
        title={collapsed ? label : undefined}
        className={cx(
          'kb-transition flex w-full items-center gap-3 rounded-[14px] py-2.5 text-left text-sm',
          collapsed ? 'justify-center px-0' : 'px-3',
          active ? 'bg-primary-soft font-semibold text-ink shadow-soft' : 'text-ink hover:bg-primary-soft/50',
          muted && !active && 'text-muted',
        )}
      >
        <span
          className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
            active ? 'bg-primary text-on-primary' : 'bg-surface-2',
          )}
        >
          <Icon name={icon} size={17} />
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    </li>
  );
}

/** Thanh điều hướng bên trái — thu gọn được (chỉ hiện icon), trạng thái được lưu lại. */
export function Sidebar() {
  const collapsed = useAppStore((s) => s.settings.sidebarCollapsed);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const ready = SCREENS.filter((s) => s.status !== 'planned');
  const planned = SCREENS.filter((s) => s.status === 'planned');

  return (
    <nav
      aria-label="Điều hướng chính"
      className={cx(
        'kb-transition flex shrink-0 flex-col overflow-y-auto border-r border-line bg-surface py-4',
        collapsed ? 'w-[76px] px-2' : 'w-[264px] px-3',
      )}
    >
      <div className={cx('mb-5 flex items-center gap-3', collapsed ? 'flex-col px-0' : 'px-2')}>
        <img src="/kb-logo.svg" alt="KB Studio Pro" className="h-10 w-10 shrink-0" />
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[15px] font-extrabold tracking-tight">KB Studio Pro</div>
            <div className="truncate text-[11px] font-medium text-muted">Sweet Pastel Edition</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          className="kb-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-primary-soft hover:text-ink"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {ready.map((s) => (
          <NavItem key={s.id} id={s.id} label={s.label} icon={s.icon} collapsed={collapsed} />
        ))}
      </ul>
      {collapsed ? (
        <hr className="mx-3 my-4 border-line" />
      ) : (
        <p className="mt-5 mb-1.5 px-3 text-[11px] font-bold tracking-wider text-muted uppercase">Sắp ra mắt</p>
      )}
      <ul className="flex flex-col gap-1">
        {planned.map((s) => (
          <NavItem key={s.id} id={s.id} label={s.label} icon={s.icon} muted collapsed={collapsed} />
        ))}
      </ul>
      {!collapsed && (
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-primary-soft to-lavender p-3 text-xs">
          <p className="font-bold">Your Lovely LIVE Control Center 💕</p>
          <p className="mt-1 text-muted">Phiên bản 0.2.0 — Sprint 1 (bản demo)</p>
        </div>
      )}
    </nav>
  );
}
