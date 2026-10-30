import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music, Square, Video } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { formatDuration } from './envelope';
import { stopAll, stopVoice, useMediaRuntime, type Voice } from './mediaRuntime';
import { Button, IconButton } from '../../components/ui/primitives';

/** Gắn phần tử <video> đang phát vào khung xem trước. */
function VideoSurface({ voice }: { voice: Voice }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = voice.element;
    const container = host.current;
    container?.appendChild(el);
    return () => {
      if (container && el.parentElement === container) el.remove();
    };
  }, [voice.element]);
  return <div ref={host} className="h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl bg-black" />;
}

/** Thanh "Đang phát" ở cuối màn hình: tiến trình, dừng từng file, dừng tất cả, báo lỗi codec. */
export function NowPlayingBar() {
  const voices = useMediaRuntime((s) => s.voices);
  const lastError = useMediaRuntime((s) => s.lastError);
  const notify = useAppStore((s) => s.notify);

  useEffect(() => {
    if (lastError) {
      notify({ tone: 'danger', message: lastError });
      useMediaRuntime.setState({ lastError: null });
    }
  }, [lastError, notify]);

  return (
    <AnimatePresence>
      {voices.length > 0 && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex shrink-0 items-center gap-4 border-t border-line bg-surface px-5 py-3"
          aria-label="Đang phát"
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-3">
            {voices.map((v) => {
              const total = v.duration ?? 0;
              const pct = total > 0 ? Math.min(100, (v.currentTime / total) * 100) : 0;
              return (
                <div key={v.id} className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl bg-surface-2 p-2 pr-3">
                  {v.kind === 'video' ? (
                    <VideoSurface voice={v} />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-accent">
                      <Music size={18} aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      {v.kind === 'video' && <Video size={14} aria-hidden className="text-muted" />}
                      <span className="truncate">{v.name}</span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] tabular-nums text-muted">
                      {formatDuration(v.currentTime)} / {formatDuration(v.duration)}
                    </div>
                  </div>
                  <IconButton label={`Dừng ${v.name}`} onClick={() => stopVoice(v.id)}>
                    <Square size={15} />
                  </IconButton>
                </div>
              );
            })}
          </div>
          <Button variant="danger" icon={<Square size={15} />} onClick={stopAll}>
            Dừng tất cả
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
