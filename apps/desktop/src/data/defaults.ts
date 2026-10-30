import type { AppSettings, DeckButton, DeckLayout, GiftRule, MediaGroup, MediaItem, Profile, ProfileKind } from '@kb/shared-types';

/**
 * Dữ liệu mẫu (mock data) cho bản demo giai đoạn 2.
 * Các media mẫu có isSample = true: chưa gắn file thật, UI sẽ ghi rõ điều này.
 */

export interface Workspace {
  groups: MediaGroup[];
  media: MediaItem[];
  rules: GiftRule[];
  deck: DeckLayout;
}

export const DEFAULT_GROUPS: MediaGroup[] = [
  { id: 'g_user', name: 'User', color: 'pink', builtIn: true },
  { id: 'g_meme', name: 'Meme', color: 'yellow', builtIn: true },
  { id: 'g_pk', name: 'PK', color: 'lavender', builtIn: true },
  { id: 'g_funny', name: 'Funny', color: 'mint', builtIn: true },
  { id: 'g_music', name: 'Music', color: 'sky', builtIn: true },
  { id: 'g_special', name: 'Special', color: 'peach', builtIn: true },
];

const sample = (
  id: string,
  name: string,
  kind: MediaItem['kind'],
  groupId: string,
  tags: string[],
  hotkey: string | null = null,
): MediaItem => ({
  id,
  name,
  kind,
  groupId,
  tags,
  volume: 0.8,
  fadeInMs: 0,
  fadeOutMs: 300,
  startSec: 0,
  endSec: null,
  hotkey,
  durationSec: null,
  fileName: null,
  mimeType: null,
  sizeBytes: null,
  isSample: true,
  addedAt: 0,
});

export const SAMPLE_MEDIA: MediaItem[] = [
  sample('m_thanks', 'Cảm ơn bạn yêu', 'audio', 'g_user', ['cảm ơn', 'quà'], 'F1'),
  sample('m_welcome', 'Chào mừng vào LIVE', 'audio', 'g_user', ['chào'], 'F2'),
  sample('m_meme_wow', 'Meme "Wow"', 'video', 'g_meme', ['hài', 'wow']),
  sample('m_pk_start', 'Nhạc mở màn PK', 'audio', 'g_pk', ['pk', 'hype'], 'F3'),
  sample('m_pk_win', 'Ăn mừng thắng PK', 'video', 'g_pk', ['pk', 'thắng']),
  sample('m_funny_laugh', 'Tiếng cười', 'audio', 'g_funny', ['hài']),
  sample('m_music_bg', 'Nhạc nền nhẹ nhàng', 'audio', 'g_music', ['nền']),
  sample('m_special_castle', 'Hiệu ứng Lâu đài', 'video', 'g_special', ['quà lớn']),
];

export const SAMPLE_RULES: GiftRule[] = [
  {
    id: 'r_rose',
    name: 'Cảm ơn Hoa hồng',
    enabled: true,
    priority: 30,
    trigger: { type: 'gift', giftId: 'rose', minCount: 1 },
    conditions: { cooldownMs: 3000, perUserCooldownMs: 0, probability: 100 },
    actions: [
      { kind: 'playMedia', mediaId: 'm_thanks' },
      { kind: 'showAnimation', animation: 'hearts', durationMs: 2000 },
      { kind: 'showName', template: '{user} tặng {count} {gift} 🌹', durationMs: 3000 },
    ],
  },
  {
    id: 'r_castle',
    name: 'Quà lớn: Lâu đài',
    enabled: true,
    priority: 1,
    trigger: { type: 'gift', giftId: 'castle', minCount: 1 },
    conditions: { cooldownMs: 0, perUserCooldownMs: 0, probability: 100 },
    actions: [
      { kind: 'playMedia', mediaId: 'm_special_castle' },
      { kind: 'showAnimation', animation: 'confetti', durationMs: 4000 },
      { kind: 'speak', template: 'Woa! Cảm ơn {user} đã tặng Lâu đài!' },
    ],
  },
  {
    id: 'r_follow',
    name: 'Chào người theo dõi mới',
    enabled: true,
    priority: 50,
    trigger: { type: 'follow' },
    conditions: { cooldownMs: 1000, perUserCooldownMs: 60_000, probability: 100 },
    actions: [{ kind: 'showName', template: 'Cảm ơn {user} đã follow 💕', durationMs: 2500 }],
  },
  {
    id: 'r_donut_lucky',
    name: 'Donut may mắn (50%)',
    enabled: false,
    priority: 40,
    trigger: { type: 'gift', giftId: 'donut', minCount: 1 },
    conditions: { cooldownMs: 5000, perUserCooldownMs: 0, probability: 50 },
    actions: [{ kind: 'playMedia', mediaId: 'm_funny_laugh' }],
  },
];

const btn = (
  id: string,
  label: string,
  icon: string,
  color: DeckButton['color'],
  action: DeckButton['action'],
  hotkey: string | null = null,
): DeckButton => ({
  id,
  label,
  icon,
  color,
  hotkey,
  action,
});

export function defaultDeck(): DeckLayout {
  const buttons: DeckButton[] = [
    btn('b_thanks', 'Cảm ơn', 'Heart', 'pink', { kind: 'playMedia', mediaId: 'm_thanks' }, 'Ctrl+1'),
    btn('b_welcome', 'Chào mừng', 'Hand', 'mint', { kind: 'playMedia', mediaId: 'm_welcome' }, 'Ctrl+2'),
    btn('b_pk', 'Mở màn PK', 'Swords', 'lavender', { kind: 'playMedia', mediaId: 'm_pk_start' }, 'Ctrl+3'),
    btn('b_laugh', 'Cười', 'Laugh', 'yellow', { kind: 'playMedia', mediaId: 'm_funny_laugh' }),
    btn('b_rose', 'Thử: Hoa hồng', 'Flower2', 'peach', { kind: 'triggerRule', ruleId: 'r_rose' }),
    btn('b_stop', 'Dừng tất cả', 'Square', 'sky', { kind: 'stopAllMedia' }, 'Ctrl+0'),
    btn('b_scene', 'Scene: Chính', 'Clapperboard', 'lavender', { kind: 'obsScene', sceneName: 'Chính' }),
    btn('b_macro', 'Combo PK', 'Sparkles', 'pink', {
      kind: 'macro',
      steps: [
        { action: { kind: 'playMedia', mediaId: 'm_pk_start' }, delayMs: 0 },
        { action: { kind: 'obsScene', sceneName: 'PK' }, delayMs: 500 },
      ],
    }),
  ];
  const rows = 3;
  const cols = 4;
  const slots: Array<string | null> = Array.from({ length: rows * cols }, (_, i) => buttons[i]?.id ?? null);
  return {
    rows,
    cols,
    pages: [
      { id: 'p_main', name: 'Chính', slots },
      { id: 'p_pk', name: 'PK', slots: Array.from({ length: rows * cols }, () => null) },
    ],
    buttons: Object.fromEntries(buttons.map((b) => [b.id, b])),
  };
}

export function defaultWorkspace(kind: ProfileKind = 'idol-female'): Workspace {
  // Profile "Tùy chỉnh" bắt đầu trống để người dùng tự xây.
  if (kind === 'custom') {
    return {
      groups: structuredClone(DEFAULT_GROUPS),
      media: [],
      rules: [],
      deck: { rows: 3, cols: 4, pages: [{ id: 'p_main', name: 'Chính', slots: Array(12).fill(null) }], buttons: {} },
    };
  }
  return {
    groups: structuredClone(DEFAULT_GROUPS),
    media: structuredClone(SAMPLE_MEDIA),
    rules: structuredClone(SAMPLE_RULES),
    deck: defaultDeck(),
  };
}

export const PROFILE_KIND_LABELS: Record<ProfileKind, string> = {
  'idol-female': 'Idol nữ',
  'idol-male': 'Idol nam',
  pk: 'PK',
  entertainment: 'Giải trí',
  sales: 'Bán hàng',
  custom: 'Tùy chỉnh',
};

export const DEFAULT_PROFILE: Profile = { id: 'pf_default', name: 'Idol nữ — mặc định', kind: 'idol-female', createdAt: 0 };

export const DEFAULT_SETTINGS: AppSettings = {
  displayName: '',
  theme: 'light',
  reducedMotion: 'system',
  uiMode: 'basic',
  lowPerformanceMode: false,
  masterVolume: 0.9,
  onboardingDone: false,
  sidebarCollapsed: false,
};
