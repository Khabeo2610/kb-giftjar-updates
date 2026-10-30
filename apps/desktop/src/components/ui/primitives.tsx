import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import type { ModuleStatus, PastelColor } from '@kb/shared-types';
import { PASTEL_VAR } from '@kb/ui-design-system';
import { STATUS_LABEL } from '../../data/screens';
import { cx } from '../../lib/cx';

// ───────────────────────────── Button ─────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-soft font-semibold',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-primary-soft/60',
  soft: 'bg-primary-soft text-ink hover:bg-primary hover:text-on-primary',
  ghost: 'bg-transparent text-ink hover:bg-primary-soft/60',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white font-semibold',
};
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-control',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-control',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'kb-transition inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  children,
  className,
  variant = 'ghost',
  ...rest
}: { label: string; variant?: ButtonVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'kb-transition inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ───────────────────────────── Card ─────────────────────────────

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-card border border-line bg-surface p-5 shadow-soft', className)} {...rest}>
      {children}
    </div>
  );
}

// ───────────────────────────── Badge / Status ─────────────────────────────

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'pink';
const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted border border-line',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  pink: 'bg-primary-soft text-accent',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<ModuleStatus, BadgeTone> = {
  planned: 'neutral',
  'in-progress': 'info',
  demo: 'warning',
  implemented: 'info',
  tested: 'success',
  'production-ready': 'success',
};

export function StatusBadge({ status }: { status: ModuleStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function Dot({ tone }: { tone: 'success' | 'warning' | 'danger' | 'neutral' }) {
  const color = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-muted' }[tone];
  return <span aria-hidden className={cx('inline-block h-2.5 w-2.5 rounded-full', color)} />;
}

// ───────────────────────────── Form controls ─────────────────────────────

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        'kb-transition h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-primary-soft',
        className,
      )}
      {...rest}
    />
  );
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'kb-transition h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'kb-transition relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border disabled:opacity-50',
        checked ? 'border-primary bg-primary' : 'border-line-strong bg-surface-2',
      )}
    >
      <span
        className={cx(
          'kb-transition inline-block h-4.5 w-4.5 rounded-full bg-white shadow-soft',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[13px]">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <span className="tabular-nums text-muted">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ '--fill': `${max > min ? ((value - min) / (max - min)) * 100 : 0}%` } as React.CSSProperties}
      />
    </div>
  );
}

// ───────────────────────────── Misc ─────────────────────────────

export function PastelSwatch({ color, className }: { color: PastelColor; className?: string }) {
  return <span className={cx('inline-block rounded-full border border-line', className)} style={{ background: PASTEL_VAR[color] }} />;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-line-strong bg-surface-2 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-accent">{icon}</div>
      <h3 className="text-base font-bold">{title}</h3>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  status,
  actions,
}: {
  title: string;
  description: string;
  status?: ModuleStatus;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {status && <StatusBadge status={status} />}
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-line-strong bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">
      {children}
    </kbd>
  );
}
