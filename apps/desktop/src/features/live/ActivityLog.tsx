import { Trash2 } from 'lucide-react';
import { clearLog, usePipeline, type LogTone } from './livePipeline';
import { IconButton } from '../../components/ui/primitives';
import { cx } from '../../lib/cx';

const TONE: Record<LogTone, string> = {
  info: 'text-ink',
  success: 'text-success',
  warning: 'text-warning',
  muted: 'text-muted',
};

export function ActivityLog({ className, limit = 60 }: { className?: string; limit?: number }) {
  const log = usePipeline((s) => s.log);
  return (
    <div className={cx('flex min-h-0 flex-col', className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">Nhật ký hoạt động</h3>
        <IconButton label="Xoá nhật ký" onClick={clearLog} disabled={!log.length}>
          <Trash2 size={15} />
        </IconButton>
      </div>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl bg-surface-2 p-2 text-xs" aria-live="polite">
        {log.length === 0 && <li className="p-2 text-muted">Chưa có hoạt động nào.</li>}
        {log.slice(0, limit).map((l) => (
          <li key={l.id} className={cx('flex gap-2 rounded-lg px-2 py-1', TONE[l.tone])}>
            <time className="shrink-0 tabular-nums text-muted">{new Date(l.at).toLocaleTimeString('vi-VN')}</time>
            <span className="min-w-0 break-words">{l.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
