import type { PastelColor } from '@kb/shared-types';

/** Thang khoảng cách 4px — dùng khi cần tính toán bằng JS (canvas, overlay...). */
export const space = (step: number): number => step * 4;

export const PASTEL_COLORS: readonly PastelColor[] = ['pink', 'lavender', 'mint', 'yellow', 'peach', 'sky'];

/** Tên hiển thị tiếng Việt cho màu pastel. */
export const PASTEL_LABELS: Record<PastelColor, string> = {
  pink: 'Hồng',
  lavender: 'Tím lavender',
  mint: 'Xanh mint',
  yellow: 'Vàng kem',
  peach: 'Cam đào',
  sky: 'Xanh trời',
};

/** Ánh xạ màu pastel → CSS variable nền (dùng được cả light và dark mode). */
export const PASTEL_VAR: Record<PastelColor, string> = {
  pink: 'var(--kb-primary-soft)',
  lavender: 'var(--kb-lavender)',
  mint: 'var(--kb-mint)',
  yellow: 'var(--kb-yellow)',
  peach: 'var(--kb-peach)',
  sky: 'var(--kb-sky)',
};

export const MOTION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;
