import type { GiftRule, LiveEvent, RuleAction, RuleTrigger } from '@kb/shared-types';

/**
 * Rule Engine: TRIGGER → CONDITION → ACTION.
 *
 * Hàm thuần (pure) — không phụ thuộc UI, thời gian thực hay random toàn cục,
 * nên có thể kiểm thử chính xác. Trạng thái cooldown được truyền vào và trả ra.
 */

export interface RuleEngineState {
  /** ruleId → thời điểm kích hoạt gần nhất (epoch ms). */
  lastFiredAt: Record<string, number>;
  /** `${ruleId}:${userId}` → thời điểm kích hoạt gần nhất cho từng người xem. */
  lastFiredByUser: Record<string, number>;
}

export const emptyRuleEngineState = (): RuleEngineState => ({ lastFiredAt: {}, lastFiredByUser: {} });

export type SkipReason = 'disabled' | 'trigger-mismatch' | 'cooldown' | 'user-cooldown' | 'probability';

export interface RuleDecision {
  ruleId: string;
  ruleName: string;
  fired: boolean;
  reason?: SkipReason;
  /** Thời gian còn lại của cooldown (ms) — chỉ có khi reason là cooldown. */
  remainingMs?: number;
  actions: RuleAction[];
}

export interface EvaluateOptions {
  now: number;
  /** Trả về số ngẫu nhiên 0 ≤ x < 1. Mặc định Math.random. */
  random?: () => number;
  /** Chỉ cho phép quy tắc ưu tiên cao nhất khớp chạy (mặc định: tất cả quy tắc khớp đều chạy). */
  firstMatchOnly?: boolean;
}

export function matchesTrigger(trigger: RuleTrigger, event: LiveEvent): boolean {
  switch (trigger.type) {
    case 'gift':
      return (
        event.type === 'gift' &&
        !!event.gift &&
        (trigger.giftId === '*' || trigger.giftId === event.gift.id) &&
        event.gift.count >= trigger.minCount
      );
    case 'like':
      return event.type === 'like' && (event.likeCount ?? 1) >= trigger.minCount;
    case 'comment': {
      if (event.type !== 'comment' || !event.comment) return false;
      const kw = trigger.keyword.trim().toLocaleLowerCase('vi');
      return kw === '' || event.comment.toLocaleLowerCase('vi').includes(kw);
    }
    case 'follow':
    case 'share':
    case 'join':
    case 'subscribe':
      return event.type === trigger.type;
  }
}

/** Sắp xếp theo priority tăng dần; cùng priority giữ nguyên thứ tự ban đầu (stable). */
export function sortByPriority(rules: readonly GiftRule[]): GiftRule[] {
  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((a, b) => a.rule.priority - b.rule.priority || a.index - b.index)
    .map((x) => x.rule);
}

export function evaluateRules(
  event: LiveEvent,
  rules: readonly GiftRule[],
  state: RuleEngineState,
  options: EvaluateOptions,
): { decisions: RuleDecision[]; state: RuleEngineState } {
  const random = options.random ?? Math.random;
  const next: RuleEngineState = {
    lastFiredAt: { ...state.lastFiredAt },
    lastFiredByUser: { ...state.lastFiredByUser },
  };
  const decisions: RuleDecision[] = [];
  let anyFired = false;

  for (const rule of sortByPriority(rules)) {
    const base = { ruleId: rule.id, ruleName: rule.name, actions: [] as RuleAction[] };
    if (!rule.enabled) {
      decisions.push({ ...base, fired: false, reason: 'disabled' });
      continue;
    }
    if (!matchesTrigger(rule.trigger, event)) {
      decisions.push({ ...base, fired: false, reason: 'trigger-mismatch' });
      continue;
    }
    if (options.firstMatchOnly && anyFired) {
      decisions.push({ ...base, fired: false, reason: 'trigger-mismatch' });
      continue;
    }
    const last = next.lastFiredAt[rule.id];
    if (rule.conditions.cooldownMs > 0 && last !== undefined && options.now - last < rule.conditions.cooldownMs) {
      decisions.push({
        ...base,
        fired: false,
        reason: 'cooldown',
        remainingMs: rule.conditions.cooldownMs - (options.now - last),
      });
      continue;
    }
    const userKey = `${rule.id}:${event.user.id}`;
    const lastUser = next.lastFiredByUser[userKey];
    if (rule.conditions.perUserCooldownMs > 0 && lastUser !== undefined && options.now - lastUser < rule.conditions.perUserCooldownMs) {
      decisions.push({
        ...base,
        fired: false,
        reason: 'user-cooldown',
        remainingMs: rule.conditions.perUserCooldownMs - (options.now - lastUser),
      });
      continue;
    }
    const probability = Math.min(100, Math.max(0, rule.conditions.probability));
    if (probability < 100 && random() * 100 >= probability) {
      decisions.push({ ...base, fired: false, reason: 'probability' });
      continue;
    }

    next.lastFiredAt[rule.id] = options.now;
    next.lastFiredByUser[userKey] = options.now;
    anyFired = true;
    decisions.push({ ...base, fired: true, actions: [...rule.actions] });
  }

  return { decisions, state: next };
}

/** Thay biến trong mẫu câu: {user}, {gift}, {count}, {comment}. */
export function renderTemplate(template: string, event: LiveEvent): string {
  return template
    .replaceAll('{user}', event.user.nickname)
    .replaceAll('{gift}', event.gift?.name ?? '')
    .replaceAll('{count}', String(event.gift?.count ?? event.likeCount ?? 1))
    .replaceAll('{comment}', event.comment ?? '');
}
