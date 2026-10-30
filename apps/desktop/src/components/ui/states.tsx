import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { cx } from '../../lib/cx';

/** Vòng xoay chờ — có nhãn cho trình đọc màn hình. */
export function Spinner({ size = 20, label = 'Đang tải' }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <LoaderCircle size={size} className="animate-spin text-accent" aria-hidden />
    </span>
  );
}

/** Trạng thái đang tải dùng chung (Loading state). */
export function LoadingState({ title = 'Đang tải…', children, className }: { title?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
        <Spinner size={26} label={title} />
      </span>
      <p className="text-base font-bold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Trạng thái lỗi dùng chung (Error state): luôn có lời giải thích + hướng xử lý. */
export function ErrorState({
  title,
  message,
  actions,
  className,
}: {
  title: string;
  message: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-danger/30 bg-danger-soft/40 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <CircleAlert size={26} aria-hidden />
      </span>
      <h2 className="text-base font-bold">{title}</h2>
      <div className="max-w-lg text-sm text-muted">{message}</div>
      {actions && <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
