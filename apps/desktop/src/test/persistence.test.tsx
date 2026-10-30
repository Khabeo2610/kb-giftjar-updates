import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppGate } from '../AppGate';
import { initialPersisted, pickPersisted, resetAppStore, useAppStore } from '../store/appStore';
import { BROWSER_STORAGE_KEY, LEGACY_STORAGE_KEY, browserBackend, memoryBackend, type StorageBackend } from '../persistence/backends';
import { SAVE_DEBOUNCE_MS, flushPersistence, startPersistence, stopPersistence, usePersistence } from '../persistence/persistence';

beforeEach(() => {
  resetAppStore();
  usePersistence.setState({ phase: 'idle', error: null, warning: null, readOnly: false, saveError: null, lastSavedAt: null });
});
afterEach(() => {
  stopPersistence();
  vi.useRealTimers();
});

describe('Persistence: lưu & khôi phục cấu hình', () => {
  it('lần đầu chạy: ghi cấu hình mặc định', async () => {
    const b = memoryBackend(null);
    await startPersistence(b);
    expect(usePersistence.getState().phase).toBe('ready');
    expect(b.saved).toHaveLength(1);
    expect(b.saved[0]!.profiles[0]!.id).toBe('pf_default');
  });

  it('thay đổi được gộp và lưu sau một khoảng ngắn (debounce)', async () => {
    vi.useFakeTimers();
    const b = memoryBackend(null);
    await startPersistence(b);
    useAppStore.getState().updateSettings({ theme: 'dark' });
    useAppStore.getState().updateSettings({ displayName: 'Kha' });
    expect(b.saved).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS + 10);
    expect(b.saved).toHaveLength(2);
    expect(b.saved[1]!.settings).toMatchObject({ theme: 'dark', displayName: 'Kha' });
  });

  it('thay đổi chỉ thuộc giao diện tạm (chuyển màn hình, toast) không kích hoạt lưu', async () => {
    const b = memoryBackend(null);
    await startPersistence(b);
    useAppStore.getState().setScreen('media');
    await flushPersistence();
    expect(b.saved).toHaveLength(1);
  });

  it('đóng rồi mở lại: khôi phục đúng theme, profile và Stream Deck', async () => {
    const b = memoryBackend(null);
    await startPersistence(b);
    const id = useAppStore.getState().createProfile('PK tối thứ 7', 'pk');
    useAppStore.getState().updateSettings({ theme: 'dark', sidebarCollapsed: true });
    useAppStore.getState().commit('đổi lưới', (w) => {
      w.deck.rows = 4;
    });
    await flushPersistence(); // như khi đóng cửa sổ
    stopPersistence();

    resetAppStore(); // "mở lại ứng dụng"
    await startPersistence(b);
    const s = useAppStore.getState();
    expect(s.activeProfileId).toBe(id);
    expect(s.settings).toMatchObject({ theme: 'dark', sidebarCollapsed: true });
    expect(s.workspaces[id]!.deck.rows).toBe(4);
    expect(s.past).toHaveLength(0);
  });

  it('dữ liệu hỏng: dùng mặc định, cảnh báo, và KHÔNG ghi đè ngay', async () => {
    const b = memoryBackend({ settings: { theme: 'hồng' }, profiles: [] });
    await startPersistence(b);
    expect(usePersistence.getState().warning).toMatch(/không hợp lệ/);
    expect(b.saved).toHaveLength(0);
  });

  it('lỗi đọc: chuyển sang trạng thái lỗi', async () => {
    const failing: StorageBackend = { ...memoryBackend(), load: () => Promise.reject(new Error('database is locked')) };
    await startPersistence(failing);
    expect(usePersistence.getState()).toMatchObject({ phase: 'error', error: 'database is locked' });
  });

  it('lỗi ghi: báo cho người dùng, không làm crash', async () => {
    const b = memoryBackend(pickPersisted(initialPersisted()));
    b.save = () => Promise.reject(new Error('disk full'));
    await startPersistence(b);
    useAppStore.getState().updateSettings({ theme: 'dark' });
    await flushPersistence();
    expect(usePersistence.getState().saveError).toBe('disk full');
    expect(useAppStore.getState().toasts.some((t) => t.message.includes('disk full'))).toBe(true);
  });

  it('backend trình duyệt chuyển dữ liệu từ định dạng cũ (giai đoạn 1–2)', async () => {
    const old = pickPersisted(initialPersisted());
    old.settings.displayName = 'Kha cũ';
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ state: old, version: 1 }));
    await startPersistence(browserBackend);
    expect(useAppStore.getState().settings.displayName).toBe('Kha cũ');
    useAppStore.getState().updateSettings({ displayName: 'Kha mới' });
    await flushPersistence();
    expect(localStorage.getItem(BROWSER_STORAGE_KEY)).toContain('Kha mới');
  });
});

describe('AppGate: Loading / Error / Ready', () => {
  it('hiện màn hình chờ rồi vào ứng dụng', async () => {
    let release!: () => void;
    const b = memoryBackend(null);
    const slow: StorageBackend = { ...b, load: () => new Promise((r) => (release = () => r({ snapshot: null }))) };
    render(<AppGate backend={slow} />);
    expect(screen.getByText('Đang mở dữ liệu của bạn…')).toBeInTheDocument();
    release();
    expect(await screen.findByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
  });

  it('lỗi: có nút Thử lại và Mở tạm không lưu', async () => {
    const failing: StorageBackend = { ...memoryBackend(), load: () => Promise.reject(new Error('Không mở được cơ sở dữ liệu')) };
    render(<AppGate backend={failing} />);
    expect(await screen.findByText('Chưa mở được dữ liệu cấu hình')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mở tạm, không lưu' }));
    expect(await screen.findByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(usePersistence.getState().readOnly).toBe(true);
  });
});
