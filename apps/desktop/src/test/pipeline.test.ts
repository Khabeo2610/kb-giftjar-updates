import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestEvent } from '@kb/event-engine';
import { resetAppStore, useAppStore } from '../store/appStore';
import { dispatchLiveEvent, executeDeckAction, resetPipeline, usePipeline } from '../features/live/livePipeline';

beforeEach(() => {
  vi.useFakeTimers();
  resetAppStore();
  resetPipeline();
});
afterEach(() => vi.useRealTimers());

describe('Live pipeline (mock)', () => {
  it('quà Hoa hồng kích hoạt quy tắc mẫu và tạo hiệu ứng', () => {
    dispatchLiveEvent(createTestEvent('gift', { giftId: 'rose', nickname: 'Mây' }));
    vi.advanceTimersByTime(10);
    const st = usePipeline.getState();
    expect(st.processed).toBe(1);
    expect(st.effects.some((e) => e.kind === 'name' && e.text?.includes('Mây'))).toBe(true);
    // Media mẫu chưa có file → ghi cảnh báo dễ hiểu thay vì lỗi.
    expect(st.log.some((l) => l.text.includes('media mẫu'))).toBe(true);
  });

  it('chặn sự kiện trùng lặp', () => {
    const ev = createTestEvent('gift', { giftId: 'rose' });
    dispatchLiveEvent(ev);
    dispatchLiveEvent(ev);
    vi.advanceTimersByTime(1000);
    expect(usePipeline.getState().processed).toBe(1);
    expect(usePipeline.getState().log.some((l) => l.text.includes('trùng lặp'))).toBe(true);
  });

  it('tôn trọng cooldown của quy tắc', () => {
    dispatchLiveEvent(createTestEvent('gift', { giftId: 'rose' }));
    dispatchLiveEvent(createTestEvent('gift', { giftId: 'rose' }));
    vi.advanceTimersByTime(1000);
    expect(usePipeline.getState().processed).toBe(1);
    expect(usePipeline.getState().log.some((l) => l.text.includes('cooldown'))).toBe(true);
  });

  it('nhiều sự kiện cùng lúc được xếp hàng và xử lý theo độ ưu tiên', () => {
    // Bỏ cooldown để mọi quà đều kích hoạt.
    useAppStore.getState().commit('test', (w) => w.rules.forEach((r) => (r.conditions.cooldownMs = 0)));
    for (let i = 0; i < 5; i++) dispatchLiveEvent(createTestEvent('gift', { giftId: 'rose' }));
    dispatchLiveEvent(createTestEvent('gift', { giftId: 'castle' }));
    expect(usePipeline.getState().queueSize).toBe(6);
    vi.advanceTimersByTime(0);
    // Quà Lâu đài (priority 1) được xử lý trước dù đến sau.
    const firstRule = usePipeline.getState().log.find((l) => l.text.startsWith('⚡'));
    expect(firstRule?.text).toContain('Lâu đài');
    vi.advanceTimersByTime(5000);
    expect(usePipeline.getState().processed).toBe(6);
    expect(usePipeline.getState().queueSize).toBe(0);
  });

  it('macro chạy các bước theo thời gian chờ', () => {
    executeDeckAction(
      {
        kind: 'macro',
        steps: [
          { action: { kind: 'stopAllMedia' }, delayMs: 0 },
          { action: { kind: 'obsScene', sceneName: 'PK' }, delayMs: 500 },
        ],
      },
      'Combo',
    );
    vi.advanceTimersByTime(100);
    expect(usePipeline.getState().log.some((l) => l.text.includes('Đã dừng'))).toBe(true);
    expect(usePipeline.getState().log.some((l) => l.text.includes('PK'))).toBe(false);
    vi.advanceTimersByTime(500);
    expect(usePipeline.getState().log.some((l) => l.text.includes('chưa kết nối OBS'))).toBe(true);
  });
});
