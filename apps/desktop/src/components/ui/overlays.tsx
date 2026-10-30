import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CheckCircle2, Info, TriangleAlert, Undo2, X } from 'lucide-react';
import { useAppStore, type ToastTone } from '../../store/appStore';
import { cx } from '../../lib/cx';
import { IconButton } from './primitives';

// ───────────────────────────── Modal ─────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      // Giữ focus bên trong hộp thoại khi bấm Tab.
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]')?.focus();
    });
    return () => {
      window.removeEventListener('keydown', onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#343044]/30 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cx('flex max-h-[90vh] w-full flex-col rounded-card border border-line bg-surface shadow-float', width)}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <IconButton label="Đóng" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────────────────────────── Tooltip ─────────────────────────────

/** Biểu tượng (i) có chú thích — dùng giải thích tính năng cho người mới. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <span
        tabIndex={0}
        role="img"
        aria-label={text}
        className="inline-flex h-4.5 w-4.5 cursor-help items-center justify-center rounded-full text-muted hover:text-accent"
      >
        <Info size={14} aria-hidden />
      </span>
      <span
        role="tooltip"
        className="kb-transition pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-56 -translate-x-1/2 rounded-xl bg-[#343044] px-3 py-2 text-xs font-normal leading-snug text-white opacity-0 shadow-float group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

// ───────────────────────────── Toasts ─────────────────────────────

const TONE_STYLE: Record<ToastTone, { icon: ReactNode; cls: string }> = {
  success: { icon: <CheckCircle2 size={18} />, cls: 'text-success' },
  info: { icon: <Info size={18} />, cls: 'text-info' },
  warning: { icon: <TriangleAlert size={18} />, cls: 'text-warning' },
  danger: { icon: <CircleAlert size={18} />, cls: 'text-danger' },
};

export function ToastViewport() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  const undo = useAppStore((s) => s.undo);
  const notify = useAppStore((s) => s.notify);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-float"
            role={t.tone === 'danger' ? 'alert' : 'status'}
          >
            <span className={cx('mt-0.5', TONE_STYLE[t.tone].cls)}>{TONE_STYLE[t.tone].icon}</span>
            <p className="flex-1 text-sm">{t.message}</p>
            {t.undoable && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-accent hover:bg-primary-soft"
                onClick={() => {
                  const label = undo();
                  dismiss(t.id);
                  if (label) notify({ tone: 'info', message: `Đã hoàn tác: ${label}` });
                }}
              >
                <Undo2 size={14} /> Hoàn tác
              </button>
            )}
            <button type="button" aria-label="Đóng thông báo" className="text-muted hover:text-ink" onClick={() => dismiss(t.id)}>
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
