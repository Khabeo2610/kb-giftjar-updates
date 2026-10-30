import { describe, expect, it, vi } from 'vitest';
import type { GiftRule } from '@kb/shared-types';
import {
  BoundedPriorityQueue,
  MockEventSource,
  backoffDelay,
  Deduplicator,
  createTestEvent,
  emptyRuleEngineState,
  evaluateRules,
  matchesTrigger,
  renderTemplate,
  sortByPriority,
} from './index';

const rule = (over: Partial<GiftRule> = {}): GiftRule => ({
  id: 'r1',
  name: 'Hoa hồng',
  enabled: true,
  priority: 10,
  trigger: { type: 'gift', giftId: 'rose', minCount: 1 },
  conditions: { cooldownMs: 0, perUserCooldownMs: 0, probability: 100 },
  actions: [{ kind: 'speak', template: 'Cảm ơn {user}' }],
  ...over,
});

describe('matchesTrigger', () => {
  it('khớp quà đúng ID và đủ số lượng', () => {
    const ev = createTestEvent('gift', { giftId: 'rose', count: 3 });
    expect(matchesTrigger({ type: 'gift', giftId: 'rose', minCount: 3 }, ev)).toBe(true);
    expect(matchesTrigger({ type: 'gift', giftId: 'rose', minCount: 4 }, ev)).toBe(false);
    expect(matchesTrigger({ type: 'gift', giftId: 'donut', minCount: 1 }, ev)).toBe(false);
    expect(matchesTrigger({ type: 'gift', giftId: '*', minCount: 1 }, ev)).toBe(true);
  });

  it('khớp bình luận theo từ khoá, không phân biệt hoa thường tiếng Việt', () => {
    const ev = createTestEvent('comment', { comment: 'PK ĐI IDOL ơi' });
    expect(matchesTrigger({ type: 'comment', keyword: 'pk đi' }, ev)).toBe(true);
    expect(matchesTrigger({ type: 'comment', keyword: 'tạm biệt' }, ev)).toBe(false);
  });

  it('không khớp khác loại sự kiện', () => {
    expect(matchesTrigger({ type: 'follow' }, createTestEvent('share'))).toBe(false);
    expect(matchesTrigger({ type: 'share' }, createTestEvent('share'))).toBe(true);
  });
});

describe('evaluateRules', () => {
  it('kích hoạt quy tắc khớp và trả về hành động', () => {
    const ev = createTestEvent('gift', { giftId: 'rose' });
    const { decisions } = evaluateRules(ev, [rule()], emptyRuleEngineState(), { now: 1000 });
    expect(decisions[0]).toMatchObject({ fired: true, actions: [{ kind: 'speak' }] });
  });

  it('bỏ qua quy tắc đang tắt', () => {
    const ev = createTestEvent('gift', { giftId: 'rose' });
    const { decisions } = evaluateRules(ev, [rule({ enabled: false })], emptyRuleEngineState(), { now: 0 });
    expect(decisions[0]).toMatchObject({ fired: false, reason: 'disabled' });
  });

  it('tôn trọng cooldown chung và báo thời gian còn lại', () => {
    const r = rule({ conditions: { cooldownMs: 5000, perUserCooldownMs: 0, probability: 100 } });
    const ev = createTestEvent('gift', { giftId: 'rose' });
    const first = evaluateRules(ev, [r], emptyRuleEngineState(), { now: 1000 });
    const second = evaluateRules(ev, [r], first.state, { now: 3000 });
    expect(second.decisions[0]).toMatchObject({ fired: false, reason: 'cooldown', remainingMs: 3000 });
    const third = evaluateRules(ev, [r], second.state, { now: 6000 });
    expect(third.decisions[0]?.fired).toBe(true);
  });

  it('cooldown theo người xem không chặn người khác', () => {
    const r = rule({ conditions: { cooldownMs: 0, perUserCooldownMs: 10_000, probability: 100 } });
    const a = createTestEvent('gift', { giftId: 'rose', nickname: 'A' });
    const b = createTestEvent('gift', { giftId: 'rose', nickname: 'B' });
    const s1 = evaluateRules(a, [r], emptyRuleEngineState(), { now: 0 });
    expect(evaluateRules(a, [r], s1.state, { now: 100 }).decisions[0]?.reason).toBe('user-cooldown');
    expect(evaluateRules(b, [r], s1.state, { now: 100 }).decisions[0]?.fired).toBe(true);
  });

  it('áp dụng xác suất bằng hàm random được truyền vào', () => {
    const r = rule({ conditions: { cooldownMs: 0, perUserCooldownMs: 0, probability: 30 } });
    const ev = createTestEvent('gift', { giftId: 'rose' });
    expect(evaluateRules(ev, [r], emptyRuleEngineState(), { now: 0, random: () => 0.29 }).decisions[0]?.fired).toBe(true);
    expect(evaluateRules(ev, [r], emptyRuleEngineState(), { now: 0, random: () => 0.31 }).decisions[0]?.reason).toBe('probability');
  });

  it('không làm thay đổi state đầu vào (pure)', () => {
    const state = emptyRuleEngineState();
    evaluateRules(createTestEvent('gift', { giftId: 'rose' }), [rule()], state, { now: 5 });
    expect(state.lastFiredAt).toEqual({});
  });

  it('firstMatchOnly chỉ chạy quy tắc ưu tiên cao nhất', () => {
    const ev = createTestEvent('gift', { giftId: 'rose' });
    const rules = [rule({ id: 'low', priority: 50 }), rule({ id: 'high', priority: 1 })];
    const { decisions } = evaluateRules(ev, rules, emptyRuleEngineState(), { now: 0, firstMatchOnly: true });
    expect(decisions.filter((d) => d.fired).map((d) => d.ruleId)).toEqual(['high']);
  });
});

describe('sortByPriority', () => {
  it('ổn định với cùng priority', () => {
    const rs = [rule({ id: 'a', priority: 2 }), rule({ id: 'b', priority: 1 }), rule({ id: 'c', priority: 2 })];
    expect(sortByPriority(rs).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('renderTemplate', () => {
  it('thay biến', () => {
    const ev = createTestEvent('gift', { giftId: 'rose', count: 5, nickname: 'Mây' });
    expect(renderTemplate('Cảm ơn {user} tặng {count} {gift}', ev)).toBe('Cảm ơn Mây tặng 5 Hoa hồng');
  });
});

describe('BoundedPriorityQueue', () => {
  it('lấy ra theo priority rồi FIFO', () => {
    const q = new BoundedPriorityQueue<string>(10);
    q.push('c', 5);
    q.push('a', 1);
    q.push('b', 5);
    expect([q.shift(), q.shift(), q.shift(), q.shift()]).toEqual(['a', 'c', 'b', undefined]);
  });

  it('khi đầy loại phần tử kém ưu tiên nhất', () => {
    const q = new BoundedPriorityQueue<string>(2);
    q.push('low', 9);
    q.push('mid', 5);
    expect(q.push('high', 1)).toEqual({ accepted: true, dropped: 'low' });
    expect(q.push('lowest', 99)).toEqual({ accepted: false, dropped: 'lowest' });
    expect(q.toArray()).toEqual(['high', 'mid']);
  });

  it('từ chối giới hạn không hợp lệ', () => {
    expect(() => new BoundedPriorityQueue(0)).toThrow();
  });
});

describe('Deduplicator', () => {
  it('chặn sự kiện trùng trong TTL và cho phép lại sau TTL', () => {
    const d = new Deduplicator(1000, 100);
    expect(d.accept('x', 0)).toBe(true);
    expect(d.accept('x', 500)).toBe(false);
    expect(d.accept('x', 1500)).toBe(true);
  });

  it('không vượt quá số lượng tối đa', () => {
    const d = new Deduplicator(1_000_000, 3);
    for (let i = 0; i < 10; i++) d.accept(`id${i}`, i);
    expect(d.size).toBe(3);
  });
});

describe('Event adapter', () => {
  it('backoff tăng dần và có giới hạn', () => {
    const mid = () => 0.5;
    expect(backoffDelay(1, 1000, 30_000, mid)).toBe(750);
    expect(backoffDelay(3, 1000, 30_000, mid)).toBe(3000);
    expect(backoffDelay(20, 1000, 30_000, mid)).toBe(22_500);
  });

  it('MockEventSource phát sự kiện khi chạy và dừng khi stop', async () => {
    vi.useFakeTimers();
    const src = new MockEventSource(100, () => createTestEvent('like'));
    const got: string[] = [];
    const statuses: string[] = [];
    src.onEvent((e) => got.push(e.type));
    src.onStatus((s) => statuses.push(s.status));
    await src.start();
    vi.advanceTimersByTime(350);
    await src.stop();
    vi.advanceTimersByTime(500);
    expect(got).toEqual(['like', 'like', 'like']);
    expect(statuses).toEqual(['live', 'stopped']);
    expect(src.isMock).toBe(true);
    vi.useRealTimers();
  });
});
