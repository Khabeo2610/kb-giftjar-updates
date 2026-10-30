import type { LiveEvent, LiveEventType } from '@kb/shared-types';

/**
 * Mock Event Provider — CHỈ phục vụ phát triển và kiểm thử.
 * Không kết nối TikTok. Mọi sự kiện sinh ra đều có source = 'mock' hoặc 'test'.
 */

export interface MockGift {
  id: string;
  name: string;
  diamonds: number;
  emoji: string;
}

export const MOCK_GIFTS: readonly MockGift[] = [
  { id: 'rose', name: 'Hoa hồng', diamonds: 1, emoji: '🌹' },
  { id: 'heart', name: 'Trái tim', diamonds: 5, emoji: '💖' },
  { id: 'donut', name: 'Bánh donut', diamonds: 30, emoji: '🍩' },
  { id: 'cap', name: 'Mũ dễ thương', diamonds: 99, emoji: '🧢' },
  { id: 'galaxy', name: 'Dải ngân hà', diamonds: 1000, emoji: '🌌' },
  { id: 'castle', name: 'Lâu đài', diamonds: 20000, emoji: '🏰' },
];

const MOCK_NAMES = ['Bông Gòn', 'Mây Hồng', 'Kẹo Dẻo', 'Thỏ Bông', 'Sữa Chua', 'Bánh Flan', 'Trà Sữa', 'Mochi'];

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function createTestEvent(
  type: LiveEventType,
  opts: { giftId?: string; count?: number; nickname?: string; comment?: string; source?: 'mock' | 'test' } = {},
): LiveEvent {
  const nickname = opts.nickname ?? 'Người xem thử';
  const event: LiveEvent = {
    id: nextId(type),
    type,
    user: { id: `u-${nickname}`, nickname },
    receivedAt: Date.now(),
    source: opts.source ?? 'test',
  };
  if (type === 'gift') {
    const gift = MOCK_GIFTS.find((g) => g.id === opts.giftId) ?? MOCK_GIFTS[0]!;
    event.gift = { id: gift.id, name: gift.name, diamonds: gift.diamonds, count: opts.count ?? 1 };
  }
  if (type === 'like') event.likeCount = opts.count ?? 1;
  if (type === 'comment') event.comment = opts.comment ?? 'Xin chào idol!';
  return event;
}

/** Sinh một sự kiện ngẫu nhiên với tỉ lệ gần giống phiên LIVE thực tế. */
export function randomMockEvent(random: () => number = Math.random): LiveEvent {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)]!;
  const nickname = pick(MOCK_NAMES);
  const r = random();
  if (r < 0.3) return createTestEvent('like', { nickname, count: 1 + Math.floor(random() * 15), source: 'mock' });
  if (r < 0.55)
    return createTestEvent('comment', { nickname, comment: pick(['Đẹp quá!', 'Hello idol', 'Thả tim nè', 'PK đi!']), source: 'mock' });
  if (r < 0.8) {
    // Quà rẻ xuất hiện nhiều hơn quà đắt.
    const gift = random() < 0.75 ? pick(MOCK_GIFTS.slice(0, 3)) : pick(MOCK_GIFTS.slice(3));
    return createTestEvent('gift', { nickname, giftId: gift.id, count: 1 + Math.floor(random() * 3), source: 'mock' });
  }
  if (r < 0.9) return createTestEvent('join', { nickname, source: 'mock' });
  if (r < 0.96) return createTestEvent('follow', { nickname, source: 'mock' });
  return createTestEvent('share', { nickname, source: 'mock' });
}
