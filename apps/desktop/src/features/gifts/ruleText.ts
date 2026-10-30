import type { GiftRule, MediaItem, RuleAction, RuleTrigger } from '@kb/shared-types';
import { MOCK_GIFTS } from '@kb/event-engine';
import { ANIMATION_LABEL } from '../live/livePipeline';

/** Mô tả quy tắc bằng câu tiếng Việt dễ hiểu. */

export function giftName(id: string): string {
  if (id === '*') return 'bất kỳ quà nào';
  const g = MOCK_GIFTS.find((x) => x.id === id);
  return g ? `${g.emoji} ${g.name}` : id;
}

export function describeTrigger(t: RuleTrigger): string {
  switch (t.type) {
    case 'gift':
      return `Nhận ${t.minCount > 1 ? `≥ ${t.minCount} ` : ''}${giftName(t.giftId)}`;
    case 'like':
      return `Nhận ≥ ${t.minCount} lượt thả tim`;
    case 'comment':
      return t.keyword ? `Bình luận chứa “${t.keyword}”` : 'Có bình luận mới';
    case 'follow':
      return 'Có người follow';
    case 'share':
      return 'Có người chia sẻ';
    case 'join':
      return 'Có người vào phòng';
    case 'subscribe':
      return 'Có người đăng ký';
  }
}

export function describeConditions(r: GiftRule): string[] {
  const out: string[] = [];
  if (r.conditions.cooldownMs > 0) out.push(`Chờ ${r.conditions.cooldownMs / 1000}s giữa 2 lần`);
  if (r.conditions.perUserCooldownMs > 0) out.push(`Mỗi người chờ ${r.conditions.perUserCooldownMs / 1000}s`);
  if (r.conditions.probability < 100) out.push(`Xác suất ${r.conditions.probability}%`);
  if (out.length === 0) out.push('Luôn chạy');
  return out;
}

export function describeAction(a: RuleAction, media: MediaItem[]): string {
  switch (a.kind) {
    case 'playMedia':
      return `Phát “${media.find((m) => m.id === a.mediaId)?.name ?? 'media đã xoá'}”`;
    case 'showAnimation':
      return `Hiệu ứng ${ANIMATION_LABEL[a.animation]}`;
    case 'showName':
      return `Hiện chữ “${a.template}”`;
    case 'speak':
      return `Đọc “${a.template}”`;
    case 'obsScene':
      return `Chuyển scene OBS “${a.sceneName}”`;
  }
}

export const ACTION_KIND_LABEL: Record<RuleAction['kind'], string> = {
  playMedia: 'Phát video/âm thanh',
  showAnimation: 'Hiện hiệu ứng',
  showName: 'Hiện tên người tặng',
  speak: 'Đọc lời cảm ơn',
  obsScene: 'Chuyển scene OBS',
};
