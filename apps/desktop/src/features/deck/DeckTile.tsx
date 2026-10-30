import type { DeckButton } from '@kb/shared-types';
import { PASTEL_VAR } from '@kb/ui-design-system';
import { Icon } from '../../components/ui/Icon';
import { cx } from '../../lib/cx';

/** Một ô nút Stream Deck — dùng chung cho màn hình Stream Deck và Mini Controller. */
export function DeckTile({
  button,
  onPress,
  compact,
  active,
}: {
  button: DeckButton;
  onPress: () => void;
  compact?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      title={button.hotkey ? `${button.label} (${button.hotkey})` : button.label}
      style={{ background: PASTEL_VAR[button.color] }}
      className={cx(
        'kb-transition group relative flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-black/5 text-ink shadow-soft hover:-translate-y-0.5 hover:shadow-card active:translate-y-0 active:scale-95',
        compact ? 'p-1.5' : 'p-3',
        active && 'ring-4 ring-primary',
      )}
    >
      <span className={cx('flex items-center justify-center rounded-xl bg-white/70 dark:bg-black/20', compact ? 'h-8 w-8' : 'h-11 w-11')}>
        <Icon name={button.icon} size={compact ? 17 : 22} />
      </span>
      <span className={cx('line-clamp-2 text-center font-semibold leading-tight', compact ? 'text-[11px]' : 'text-[13px]')}>
        {button.label}
      </span>
      {button.hotkey && !compact && (
        <span className="absolute top-1.5 right-2 rounded-md bg-white/70 px-1 text-[10px] font-semibold text-muted dark:bg-black/30">
          {button.hotkey}
        </span>
      )}
    </button>
  );
}
