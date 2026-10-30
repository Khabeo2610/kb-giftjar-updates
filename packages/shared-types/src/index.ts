/**
 * Kiểu dữ liệu dùng chung giữa các module của KB Studio Pro.
 * Không chứa logic — chỉ chứa định nghĩa type để mọi package nói cùng một "ngôn ngữ".
 */

/** Trạng thái phát triển của một module — hiển thị trung thực trong UI và tài liệu. */
export type ModuleStatus = 'planned' | 'in-progress' | 'demo' | 'implemented' | 'tested' | 'production-ready';

// ───────────────────────────── LIVE events ─────────────────────────────

export type LiveEventType = 'gift' | 'like' | 'follow' | 'comment' | 'share' | 'join' | 'subscribe';

export interface LiveUser {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

/** Sự kiện đã được chuẩn hoá (normalized) — mọi provider phải chuyển về dạng này. */
export interface LiveEvent {
  /** ID duy nhất dùng để chống trùng lặp (deduplication). */
  id: string;
  type: LiveEventType;
  user: LiveUser;
  /** Thời điểm nhận sự kiện (epoch ms). */
  receivedAt: number;
  /** Chỉ có với type === 'gift'. */
  gift?: { id: string; name: string; diamonds: number; count: number };
  /** Chỉ có với type === 'comment'. */
  comment?: string;
  /** Chỉ có với type === 'like'. */
  likeCount?: number;
  /** Nguồn phát sinh sự kiện: provider thật hay giả lập. */
  source: 'mock' | 'test' | 'provider';
}

// ───────────────────────────── Media ─────────────────────────────

export type MediaKind = 'video' | 'audio';

export interface MediaGroup {
  id: string;
  name: string;
  color: PastelColor;
  builtIn: boolean;
}

export interface MediaItem {
  id: string;
  name: string;
  kind: MediaKind;
  groupId: string;
  tags: string[];
  /** 0..1 */
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  /** Cắt đoạn phát (giây). endSec = null nghĩa là phát tới hết. */
  startSec: number;
  endSec: number | null;
  hotkey: string | null;
  durationSec: number | null;
  /** Tên file gốc (không lưu đường dẫn đầy đủ vào cấu hình xuất ra). */
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  /** true = dữ liệu mẫu, chưa có file thật. */
  isSample: boolean;
  addedAt: number;
}

// ───────────────────────────── Gift rules ─────────────────────────────

export type RuleTrigger =
  | { type: 'gift'; giftId: string | '*'; minCount: number }
  | { type: 'like'; minCount: number }
  | { type: 'follow' }
  | { type: 'share' }
  | { type: 'join' }
  | { type: 'subscribe' }
  | { type: 'comment'; keyword: string };

export interface RuleConditions {
  /** Thời gian chờ giữa 2 lần kích hoạt cùng quy tắc (ms). 0 = không giới hạn. */
  cooldownMs: number;
  /** Thời gian chờ riêng cho từng người xem (ms). 0 = không giới hạn. */
  perUserCooldownMs: number;
  /** Xác suất kích hoạt 0..100 (%). */
  probability: number;
}

export type RuleAction =
  | { kind: 'playMedia'; mediaId: string }
  | { kind: 'showAnimation'; animation: 'hearts' | 'confetti' | 'sparkle' | 'bounce'; durationMs: number }
  | { kind: 'showName'; template: string; durationMs: number }
  | { kind: 'speak'; template: string }
  | { kind: 'obsScene'; sceneName: string };

export interface GiftRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Số nhỏ hơn = ưu tiên cao hơn. */
  priority: number;
  trigger: RuleTrigger;
  conditions: RuleConditions;
  actions: RuleAction[];
}

// ───────────────────────────── Stream Deck ─────────────────────────────

export type DeckAction =
  | { kind: 'none' }
  | { kind: 'playMedia'; mediaId: string }
  | { kind: 'stopAllMedia' }
  | { kind: 'triggerRule'; ruleId: string }
  | { kind: 'obsScene'; sceneName: string }
  | { kind: 'macro'; steps: Array<{ action: Exclude<DeckAction, { kind: 'macro' }>; delayMs: number }> };

export interface DeckButton {
  id: string;
  label: string;
  icon: string;
  color: PastelColor;
  hotkey: string | null;
  action: DeckAction;
}

export interface DeckPage {
  id: string;
  name: string;
  /** Mỗi ô của lưới — null là ô trống. Độ dài = rows × cols. */
  slots: Array<string | null>;
}

export interface DeckLayout {
  rows: number;
  cols: number;
  pages: DeckPage[];
  buttons: Record<string, DeckButton>;
}

// ───────────────────────────── Profile & settings ─────────────────────────────

export type PastelColor = 'pink' | 'lavender' | 'mint' | 'yellow' | 'peach' | 'sky';

export type ProfileKind = 'idol-female' | 'idol-male' | 'pk' | 'entertainment' | 'sales' | 'custom';

export interface Profile {
  id: string;
  name: string;
  kind: ProfileKind;
  createdAt: number;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type UiMode = 'basic' | 'advanced';

export interface AppSettings {
  displayName: string;
  theme: ThemePreference;
  reducedMotion: 'system' | 'on' | 'off';
  uiMode: UiMode;
  lowPerformanceMode: boolean;
  masterVolume: number;
  onboardingDone: boolean;
  sidebarCollapsed: boolean;
}
