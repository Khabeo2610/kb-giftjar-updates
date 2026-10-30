import { AnimatePresence, motion } from 'framer-motion';
import { usePipeline, type VisualEffect } from './livePipeline';
import { cx } from '../../lib/cx';

const PARTICLES: Record<'hearts' | 'confetti' | 'sparkle' | 'bounce', string[]> = {
  hearts: ['💖', '💗', '💕', '🩷', '💞'],
  confetti: ['🎉', '🎊', '✨', '🎈', '🌟'],
  sparkle: ['✨', '⭐', '💫', '🌟'],
  bounce: ['🐰', '🍓', '🍬', '🧁'],
};

/**
 * Khung xem trước hiệu ứng (giả lập vùng overlay).
 * Ở giai đoạn 4, cùng dữ liệu này sẽ được đẩy ra Browser Source cho OBS.
 */
export function EffectsPreview({ className, label = 'Xem trước overlay' }: { className?: string; label?: string }) {
  const effects = usePipeline((s) => s.effects);
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-primary-soft/60 via-surface-2 to-lavender/60',
        className,
      )}
      aria-label={label}
    >
      <span className="absolute top-2 left-3 text-[11px] font-semibold text-muted">{label}</span>
      {effects.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-muted">Hiệu ứng sẽ hiện ở đây khi bạn bấm “Thử”.</p>
      )}
      <AnimatePresence>
        {effects.map((fx) =>
          fx.kind === 'name' ? (
            <motion.div
              key={fx.id}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-4 bottom-4 rounded-2xl bg-surface/95 px-4 py-2 text-center text-sm font-bold shadow-card"
            >
              {fx.text}
            </motion.div>
          ) : (
            <motion.div key={fx.id} className="pointer-events-none absolute inset-0" exit={{ opacity: 0 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="kb-float-up absolute bottom-0 text-2xl"
                  style={{ left: `${(i * 37 + 7) % 92}%`, animationDelay: `${(i % 5) * 120}ms` }}
                >
                  {particleFor(fx.kind, i)}
                </span>
              ))}
            </motion.div>
          ),
        )}
      </AnimatePresence>
    </div>
  );
}

function particleFor(kind: VisualEffect['kind'], i: number): string {
  const set = kind === 'name' ? PARTICLES.sparkle : PARTICLES[kind];
  return set[i % set.length]!;
}
