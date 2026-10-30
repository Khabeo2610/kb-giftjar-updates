import { create } from 'zustand';
import { initialPersisted, pickPersisted, useAppStore, validatePersisted, type PersistedSlice } from '../store/appStore';
import { readLegacy, type StorageBackend } from './backends';

/**
 * Tầng persistence: nối store (domain) với backend lưu trữ.
 *
 * Vòng đời:
 *  1. `startPersistence(backend)` → phase "loading" (UI hiện màn hình chờ).
 *  2. Nạp dữ liệu → kiểm tra schema → đưa vào store → phase "ready".
 *     - Chưa có dữ liệu: ghi cấu hình mặc định (có chuyển dữ liệu cũ từ bản 1–2 nếu có).
 *     - Dữ liệu hỏng: dùng mặc định + cảnh báo; KHÔNG ghi đè cho tới khi người dùng thay đổi gì đó.
 *     - Lỗi đọc: phase "error" (UI hiện màn hình lỗi, có nút Thử lại / Mở tạm không lưu).
 *  3. Mỗi thay đổi dữ liệu → lưu sau SAVE_DEBOUNCE_MS (gộp nhiều thay đổi liên tiếp).
 *  4. `flushPersistence()` khi đóng cửa sổ để không mất thay đổi cuối cùng.
 */

export const SAVE_DEBOUNCE_MS = 400;

export type PersistencePhase = 'idle' | 'loading' | 'ready' | 'error';

interface PersistenceState {
  phase: PersistencePhase;
  backendKind: StorageBackend['kind'] | null;
  error: string | null;
  warning: string | null;
  saving: boolean;
  lastSavedAt: number | null;
  saveError: string | null;
  /** true khi người dùng chọn "mở tạm" sau lỗi — thay đổi không được ghi. */
  readOnly: boolean;
}

export const usePersistence = create<PersistenceState>(() => ({
  phase: 'idle',
  backendKind: null,
  error: null,
  warning: null,
  saving: false,
  lastSavedAt: null,
  saveError: null,
  readOnly: false,
}));

let backend: StorageBackend | null = null;
let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: PersistedSlice | null = null;
let inflight: Promise<void> = Promise.resolve();
/** Tăng mỗi lần khởi động lại — bỏ qua kết quả nạp cũ (ví dụ React StrictMode gọi effect 2 lần). */
let generation = 0;

export async function startPersistence(b: StorageBackend): Promise<void> {
  stopPersistence();
  const gen = ++generation;
  backend = b;
  usePersistence.setState({ phase: 'loading', backendKind: b.kind, error: null, warning: null, readOnly: false, saveError: null });
  try {
    const { snapshot, warning } = await b.load();
    if (gen !== generation) return;
    let notice = warning ?? null;
    let data: PersistedSlice | null = null;
    let seed = false;

    if (snapshot === null) {
      // Lần đầu dùng SQLite: chuyển dữ liệu từ bản 1–2 (localStorage) nếu có.
      const legacy = b.kind === 'sqlite' ? readLegacy() : null;
      const fromLegacy = legacy ? validatePersisted(JSON.parse(legacy)) : null;
      data = fromLegacy ?? initialPersisted();
      if (fromLegacy) notice = 'Đã chuyển cấu hình từ phiên bản trước sang cơ sở dữ liệu mới.';
      seed = true;
    } else {
      data = validatePersisted(snapshot);
      if (!data) {
        data = initialPersisted();
        notice =
          'Cấu hình đã lưu không hợp lệ nên đang dùng cấu hình mặc định. Dữ liệu cũ chưa bị ghi đè cho tới khi bạn thay đổi cài đặt.';
      }
    }

    useAppStore.setState({ ...data, past: [], future: [] });
    if (seed) await b.save(pickPersisted(useAppStore.getState()));
    usePersistence.setState({ phase: 'ready', warning: notice, lastSavedAt: seed ? Date.now() : null });
    subscribe();
  } catch (err) {
    if (gen === generation) usePersistence.setState({ phase: 'error', error: describeError(err) });
  }
}

/** Mô tả nơi lưu dữ liệu (hiển thị ở Cài đặt → Thông tin phần mềm). */
export async function describeStorage(): Promise<string> {
  return backend ? backend.describe() : 'Chưa khởi tạo';
}

/** Xoá toàn bộ cấu hình: ghi đè bằng cấu hình mặc định (profile cũ bị xoá khỏi cơ sở dữ liệu). */
export async function resetAllData(): Promise<void> {
  useAppStore.setState({ ...initialPersisted(), past: [], future: [] });
  await flushPersistence();
  try {
    localStorage.clear();
  } catch {
    /* bỏ qua */
  }
}

/** Sau khi lỗi: mở ứng dụng với cấu hình mặc định, KHÔNG ghi gì xuống ổ đĩa. */
export function continueWithoutSaving(): void {
  useAppStore.setState({ ...initialPersisted(), past: [], future: [] });
  usePersistence.setState({ phase: 'ready', readOnly: true, error: null });
}

function subscribe(): void {
  unsubscribe = useAppStore.subscribe((state, prev) => {
    if (
      state.settings === prev.settings &&
      state.profiles === prev.profiles &&
      state.activeProfileId === prev.activeProfileId &&
      state.workspaces === prev.workspaces
    ) {
      return; // chỉ thay đổi UI tạm (toast, màn hình…) → không cần lưu
    }
    pending = pickPersisted(state);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flushPersistence(), SAVE_DEBOUNCE_MS);
  });
}

/** Ghi ngay mọi thay đổi đang chờ. Gọi khi đóng cửa sổ. */
export async function flushPersistence(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const snapshot = pending;
  pending = null;
  if (!snapshot || !backend || usePersistence.getState().readOnly) return inflight;
  const b = backend;
  // Xếp hàng các lần ghi để không bao giờ ghi chồng lên nhau.
  inflight = inflight.then(async () => {
    usePersistence.setState({ saving: true });
    try {
      await b.save(snapshot);
      usePersistence.setState({ saving: false, lastSavedAt: Date.now(), saveError: null });
    } catch (err) {
      usePersistence.setState({ saving: false, saveError: describeError(err) });
      useAppStore.getState().notify({ tone: 'danger', message: `Chưa lưu được cấu hình: ${describeError(err)}` });
    }
  });
  return inflight;
}

export function stopPersistence(): void {
  unsubscribe?.();
  unsubscribe = null;
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
}

export function dismissPersistenceWarning(): void {
  usePersistence.setState({ warning: null });
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Lỗi không xác định';
}
