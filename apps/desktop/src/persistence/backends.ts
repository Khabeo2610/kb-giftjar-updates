import { invoke, isTauri } from '@tauri-apps/api/core';
import type { PersistedSlice } from '../store/appStore';

/**
 * Backend lưu cấu hình. Tầng persistence chỉ làm việc qua interface này
 * nên có thể thay SQLite / localStorage / bộ nhớ tạm (test) mà không sửa UI hay store.
 */
export interface StorageBackend {
  readonly kind: 'sqlite' | 'browser' | 'memory';
  /** Trả về `snapshot: null` khi chưa từng lưu (lần chạy đầu). Dữ liệu trả về CHƯA được kiểm tra schema. */
  load(): Promise<{ snapshot: unknown | null; warning?: string | null }>;
  save(snapshot: PersistedSlice): Promise<void>;
  /** Thông tin hiển thị cho người dùng (đường dẫn DB, phiên bản schema…). */
  describe(): Promise<string>;
}

// ───────────────────────────── SQLite (app desktop, qua lệnh Rust) ─────────────────────────────

export const sqliteBackend: StorageBackend = {
  kind: 'sqlite',
  async load() {
    const res = await invoke<{ snapshot: unknown | null; warning: string | null }>('storage_load');
    return { snapshot: res.snapshot, warning: res.warning };
  },
  async save(snapshot) {
    await invoke('storage_save', { snapshot });
  },
  async describe() {
    const info = await invoke<{ path: string; schemaVersion: number }>('storage_info');
    return `SQLite · schema v${info.schemaVersion} · ${info.path}`;
  },
};

// ───────────────────────────── localStorage (xem thử trên trình duyệt) ─────────────────────────────

/** Khoá cũ ở giai đoạn 1–2 — dùng để chuyển dữ liệu sang SQLite một lần. */
export const LEGACY_STORAGE_KEY = 'kb-studio-pro:v1';
export const BROWSER_STORAGE_KEY = 'kb-studio-pro:v2';

export const browserBackend: StorageBackend = {
  kind: 'browser',
  async load() {
    const raw = localStorage.getItem(BROWSER_STORAGE_KEY) ?? readLegacy();
    return { snapshot: raw === null ? null : (JSON.parse(raw) as unknown) };
  },
  async save(snapshot) {
    localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(snapshot));
  },
  async describe() {
    return 'Bộ nhớ trình duyệt (chế độ xem thử)';
  },
};

/** Đọc dữ liệu định dạng cũ (zustand persist: `{ state, version }`). */
export function readLegacy(): string | null {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: unknown };
    return parsed.state ? JSON.stringify(parsed.state) : null;
  } catch {
    return null;
  }
}

// ───────────────────────────── Bộ nhớ tạm (test / chế độ không lưu) ─────────────────────────────

export function memoryBackend(initial: unknown | null = null): StorageBackend & { saved: PersistedSlice[] } {
  let current = initial;
  const saved: PersistedSlice[] = [];
  return {
    kind: 'memory',
    saved,
    async load() {
      return { snapshot: current };
    },
    async save(snapshot) {
      current = structuredClone(snapshot);
      saved.push(current as PersistedSlice);
    },
    async describe() {
      return 'Bộ nhớ tạm (không lưu xuống ổ đĩa)';
    },
  };
}

export function defaultBackend(): StorageBackend {
  return isTauri() ? sqliteBackend : browserBackend;
}
