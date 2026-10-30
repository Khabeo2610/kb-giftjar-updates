import { create } from 'zustand';
import type { DeckAction, GiftRule, LiveEvent, RuleAction } from '@kb/shared-types';
import {
  BoundedPriorityQueue,
  Deduplicator,
  createTestEvent,
  emptyRuleEngineState,
  evaluateRules,
  renderTemplate,
  type RuleEngineState,
} from '@kb/event-engine';
import { useAppStore } from '../../store/appStore';
import { playMedia, stopAll } from '../media/mediaRuntime';
import { newId } from '../../lib/id';

/**
 * Live Pipeline (bản demo cục bộ):
 * Sự kiện (mock/test) → Chống trùng → Rule Engine → Hàng đợi ưu tiên → Thực thi hành động.
 *
 * Chưa có kết nối TikTok thật. OBS chưa kết nối — hành động OBS chỉ được ghi nhật ký.
 */

export type LogTone = 'info' | 'success' | 'warning' | 'muted';
export interface LogEntry {
  id: string;
  at: number;
  tone: LogTone;
  text: string;
}

export interface VisualEffect {
  id: string;
  kind: 'hearts' | 'confetti' | 'sparkle' | 'bounce' | 'name';
  text?: string;
  until: number;
}

interface QueuedJob {
  event: LiveEvent;
  rule: GiftRule;
  actions: RuleAction[];
}

interface PipelineState {
  log: LogEntry[];
  effects: VisualEffect[];
  queueSize: number;
  queueCapacity: number;
  processed: number;
  dropped: number;
  mockRunning: boolean;
}

const QUEUE_LIMIT = 50;
const LOG_LIMIT = 200;
const MAX_EFFECTS = 6;
/** Khoảng cách giữa 2 lượt xử lý hàng đợi — tránh dồn hiệu ứng khi nhiều quà tới cùng lúc. */
const PUMP_INTERVAL_MS = 350;

export const usePipeline = create<PipelineState>(() => ({
  log: [],
  effects: [],
  queueSize: 0,
  queueCapacity: QUEUE_LIMIT,
  processed: 0,
  dropped: 0,
  mockRunning: false,
}));

const queue = new BoundedPriorityQueue<QueuedJob>(QUEUE_LIMIT);
const dedupe = new Deduplicator(60_000, 5_000);
let engineState: RuleEngineState = emptyRuleEngineState();
let pumpTimer: ReturnType<typeof setTimeout> | null = null;
let mockTimer: ReturnType<typeof setInterval> | null = null;

export function log(text: string, tone: LogTone = 'info'): void {
  usePipeline.setState((s) => ({ log: [{ id: newId('l'), at: Date.now(), tone, text }, ...s.log].slice(0, LOG_LIMIT) }));
}

export function clearLog(): void {
  usePipeline.setState({ log: [] });
}

function addEffect(effect: Omit<VisualEffect, 'id'>): void {
  const settings = useAppStore.getState().settings;
  const now = Date.now();
  usePipeline.setState((s) => {
    const alive = s.effects.filter((e) => e.until > now);
    const limit = settings.lowPerformanceMode ? 2 : MAX_EFFECTS;
    return { effects: [...alive, { ...effect, id: newId('fx') }].slice(-limit) };
  });
  setTimeout(() => usePipeline.setState((s) => ({ effects: s.effects.filter((e) => e.until > Date.now()) })), effect.until - now + 50);
}

function mediaOptions() {
  const s = useAppStore.getState().settings;
  return { master: s.masterVolume, lowPerformance: s.lowPerformanceMode };
}

function findMedia(mediaId: string) {
  const st = useAppStore.getState();
  return st.workspaces[st.activeProfileId]?.media.find((m) => m.id === mediaId);
}

/** Thực thi một hành động của quy tắc. */
export function executeRuleAction(action: RuleAction, event: LiveEvent): void {
  switch (action.kind) {
    case 'playMedia': {
      const item = findMedia(action.mediaId);
      if (!item) return log('Không tìm thấy media đã gán cho quy tắc (có thể đã bị xoá).', 'warning');
      const res = playMedia(item, mediaOptions());
      return res.ok ? log(`▶ Phát "${item.name}"`, 'success') : log(res.reason, 'warning');
    }
    case 'showAnimation':
      addEffect({ kind: action.animation, until: Date.now() + action.durationMs });
      return log(`✨ Hiệu ứng ${ANIMATION_LABEL[action.animation]}`, 'success');
    case 'showName': {
      const text = renderTemplate(action.template, event);
      addEffect({ kind: 'name', text, until: Date.now() + action.durationMs });
      return log(`🏷 Hiện chữ: ${text}`, 'success');
    }
    case 'speak': {
      const text = renderTemplate(action.template, event);
      return speak(text) ? log(`🔊 Đọc: ${text}`, 'success') : log(`🔊 (Máy chưa có giọng đọc) ${text}`, 'warning');
    }
    case 'obsScene':
      return log(`🎬 Chuyển scene OBS "${action.sceneName}" — chưa kết nối OBS (sẽ có ở giai đoạn 4).`, 'muted');
  }
}

export const ANIMATION_LABEL: Record<'hearts' | 'confetti' | 'sparkle' | 'bounce', string> = {
  hearts: 'Mưa trái tim',
  confetti: 'Pháo giấy',
  sparkle: 'Lấp lánh',
  bounce: 'Nảy nảy',
};

/** TTS tạm thời bằng Web Speech API của hệ điều hành. Engine TTS riêng sẽ có ở giai đoạn 4. */
function speak(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  const vi = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
  if (!vi) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = vi;
  u.lang = vi.lang;
  u.volume = useAppStore.getState().settings.masterVolume;
  window.speechSynthesis.speak(u);
  return true;
}

function pump(): void {
  pumpTimer = null;
  const job = queue.shift();
  usePipeline.setState({ queueSize: queue.size });
  if (!job) return;
  log(`⚡ Quy tắc "${job.rule.name}" (${job.event.user.nickname})`, 'info');
  for (const action of job.actions) {
    try {
      executeRuleAction(action, job.event);
    } catch (err) {
      // Một hành động lỗi không được làm hỏng cả hàng đợi.
      log(`Lỗi khi thực hiện hành động: ${err instanceof Error ? err.message : String(err)}`, 'warning');
    }
  }
  usePipeline.setState((s) => ({ processed: s.processed + 1 }));
  if (queue.size > 0) pumpTimer = setTimeout(pump, PUMP_INTERVAL_MS);
}

function schedulePump(): void {
  if (pumpTimer === null) pumpTimer = setTimeout(pump, 0);
}

/** Đưa một sự kiện vào pipeline. */
export function dispatchLiveEvent(event: LiveEvent): void {
  if (!dedupe.accept(event.id, Date.now())) {
    log(`Bỏ qua sự kiện trùng lặp (${event.id}).`, 'muted');
    return;
  }
  const st = useAppStore.getState();
  const rules = st.workspaces[st.activeProfileId]?.rules ?? [];
  const { decisions, state } = evaluateRules(event, rules, engineState, { now: Date.now() });
  engineState = state;

  const fired = decisions.filter((d) => d.fired);
  const cooled = decisions.filter((d) => d.reason === 'cooldown' || d.reason === 'user-cooldown');
  for (const d of cooled) log(`⏳ "${d.ruleName}" đang chờ cooldown (${Math.ceil((d.remainingMs ?? 0) / 1000)} giây).`, 'muted');
  if (fired.length === 0 && cooled.length === 0) log(`${describeEvent(event)} — không có quy tắc nào khớp.`, 'muted');

  for (const d of fired) {
    const rule = rules.find((r) => r.id === d.ruleId)!;
    const res = queue.push({ event, rule, actions: d.actions }, rule.priority);
    if (res.dropped) {
      usePipeline.setState((s) => ({ dropped: s.dropped + 1 }));
      log('Hàng đợi đầy — đã bỏ bớt hiệu ứng có độ ưu tiên thấp nhất.', 'warning');
    }
  }
  usePipeline.setState({ queueSize: queue.size });
  schedulePump();
}

export function describeEvent(e: LiveEvent): string {
  switch (e.type) {
    case 'gift':
      return `🎁 ${e.user.nickname} tặng ${e.gift?.count ?? 1}× ${e.gift?.name ?? 'quà'}`;
    case 'like':
      return `❤️ ${e.user.nickname} thả ${e.likeCount ?? 1} tim`;
    case 'comment':
      return `💬 ${e.user.nickname}: ${e.comment ?? ''}`;
    case 'follow':
      return `➕ ${e.user.nickname} đã follow`;
    case 'share':
      return `🔗 ${e.user.nickname} đã chia sẻ`;
    case 'join':
      return `👋 ${e.user.nickname} vào phòng`;
    case 'subscribe':
      return `⭐ ${e.user.nickname} đăng ký`;
  }
}

/** Tạo sự kiện thử khớp với trigger của quy tắc — dùng cho nút "Thử". */
export function eventForRule(rule: GiftRule): LiveEvent {
  const t = rule.trigger;
  switch (t.type) {
    case 'gift':
      return createTestEvent('gift', { giftId: t.giftId === '*' ? 'rose' : t.giftId, count: t.minCount });
    case 'like':
      return createTestEvent('like', { count: t.minCount });
    case 'comment':
      return createTestEvent('comment', { comment: t.keyword || 'Xin chào' });
    default:
      return createTestEvent(t.type);
  }
}

/** Chạy thử hành động của một quy tắc ngay lập tức (bỏ qua cooldown/xác suất) để xem trước. */
export function previewRule(rule: GiftRule): void {
  const ev = eventForRule(rule);
  log(`🧪 Xem thử "${rule.name}"`, 'info');
  rule.actions.forEach((a) => executeRuleAction(a, ev));
}

/** Thực thi hành động của nút Stream Deck. */
export function executeDeckAction(action: DeckAction, label: string): void {
  switch (action.kind) {
    case 'none':
      log(`Nút "${label}" chưa được gán hành động.`, 'muted');
      return;
    case 'playMedia': {
      const item = findMedia(action.mediaId);
      if (!item) return log(`Nút "${label}": media đã bị xoá.`, 'warning');
      const res = playMedia(item, mediaOptions());
      if (!res.ok) {
        useAppStore.getState().notify({ tone: 'warning', message: res.reason });
        return log(res.reason, 'warning');
      }
      return log(`▶ ${label}: phát "${item.name}"`, 'success');
    }
    case 'stopAllMedia':
      stopAll();
      return log('⏹ Đã dừng tất cả media', 'info');
    case 'triggerRule': {
      const st = useAppStore.getState();
      const rule = st.workspaces[st.activeProfileId]?.rules.find((r) => r.id === action.ruleId);
      if (!rule) return log(`Nút "${label}": quy tắc đã bị xoá.`, 'warning');
      return dispatchLiveEvent(eventForRule(rule));
    }
    case 'obsScene':
      return log(`🎬 ${label}: chuyển scene "${action.sceneName}" — chưa kết nối OBS (giai đoạn 4).`, 'muted');
    case 'macro': {
      log(`🧩 Macro "${label}" (${action.steps.length} bước)`, 'info');
      let delay = 0;
      for (const step of action.steps) {
        delay += step.delayMs;
        setTimeout(() => executeDeckAction(step.action, label), delay);
      }
    }
  }
}

/** Bật/tắt nguồn sự kiện giả lập (Mock Provider) để xem hệ thống phản ứng. */
export function setMockRunning(on: boolean, randomEvent: () => LiveEvent): void {
  if (mockTimer) clearInterval(mockTimer);
  mockTimer = null;
  if (on) {
    mockTimer = setInterval(() => {
      const ev = randomEvent();
      log(describeEvent(ev), 'muted');
      dispatchLiveEvent(ev);
    }, 1500);
  }
  usePipeline.setState({ mockRunning: on });
}

/** Dùng trong test. */
export function resetPipeline(): void {
  queue.clear();
  engineState = emptyRuleEngineState();
  if (pumpTimer) clearTimeout(pumpTimer);
  if (mockTimer) clearInterval(mockTimer);
  pumpTimer = null;
  mockTimer = null;
  usePipeline.setState({ log: [], effects: [], queueSize: 0, processed: 0, dropped: 0, mockRunning: false });
}
