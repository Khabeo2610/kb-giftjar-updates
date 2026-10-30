import { create } from 'zustand';
import type { AppSettings, Profile, ProfileKind } from '@kb/shared-types';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, defaultWorkspace, type Workspace } from '../data/defaults';
import type { ScreenId } from '../data/screens';
import { newId } from '../lib/id';
import { profileSchema, settingsSchema, workspaceSchema, type ProfileExport } from '../lib/schemas';
import { z } from 'zod';

/**
 * Store trung tâm của ứng dụng (zustand).
 *
 * - Chỉ chứa state + logic nghiệp vụ (domain). KHÔNG tự đọc/ghi ổ đĩa:
 *   việc lưu do `src/persistence` đảm nhận (SQLite trong app desktop, localStorage khi xem trên trình duyệt).
 * - Mọi chỉnh sửa workspace đi qua `commit()` để có thể HOÀN TÁC / LÀM LẠI.
 * - `validatePersisted` kiểm tra dữ liệu nạp lại bằng zod trước khi đưa vào store.
 */

const HISTORY_LIMIT = 50;

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';
export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  /** Hiện nút "Hoàn tác" trên thông báo. */
  undoable?: boolean;
}

export interface PersistedSlice {
  settings: AppSettings;
  profiles: Profile[];
  activeProfileId: string;
  workspaces: Record<string, Workspace>;
}

interface HistoryEntry {
  label: string;
  workspace: Workspace;
}

export interface AppState extends PersistedSlice {
  screen: ScreenId;
  past: HistoryEntry[];
  future: HistoryEntry[];
  toasts: Toast[];
  miniControllerOpen: boolean;
  searchOpen: boolean;

  setScreen: (screen: ScreenId) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** Thay đổi workspace của profile hiện tại, có ghi lịch sử để hoàn tác. */
  commit: (label: string, recipe: (draft: Workspace) => void) => void;
  undo: () => string | null;
  redo: () => string | null;

  createProfile: (name: string, kind: ProfileKind) => string;
  switchProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  duplicateProfile: (id: string) => string | null;
  deleteProfile: (id: string) => boolean;
  importProfile: (data: ProfileExport) => string;

  notify: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  setMiniControllerOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

export const initialPersisted = (): PersistedSlice => ({
  settings: { ...DEFAULT_SETTINGS },
  profiles: [{ ...DEFAULT_PROFILE }],
  activeProfileId: DEFAULT_PROFILE.id,
  workspaces: { [DEFAULT_PROFILE.id]: defaultWorkspace('idol-female') },
});

const persistedSchema = z
  .object({
    settings: settingsSchema,
    profiles: z.array(profileSchema).min(1).max(50),
    activeProfileId: z.string(),
    workspaces: z.record(z.string(), workspaceSchema),
  })
  .refine((s) => s.profiles.every((p) => s.workspaces[p.id]), 'Thiếu dữ liệu của một profile')
  .refine((s) => s.profiles.some((p) => p.id === s.activeProfileId), 'Profile đang chọn không tồn tại');

/** Kiểm tra dữ liệu đã lưu. Trả về null nếu dữ liệu hỏng. */
export function validatePersisted(raw: unknown): PersistedSlice | null {
  const parsed = persistedSchema.safeParse(raw);
  return parsed.success ? (parsed.data as PersistedSlice) : null;
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...initialPersisted(),
  screen: 'dashboard',
  past: [],
  future: [],
  toasts: [],
  miniControllerOpen: false,
  searchOpen: false,

  setScreen: (screen) => set({ screen, searchOpen: false }),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  commit: (label, recipe) => {
    const s = get();
    const current = s.workspaces[s.activeProfileId];
    if (!current) return;
    const draft = structuredClone(current);
    recipe(draft);
    set({
      workspaces: { ...s.workspaces, [s.activeProfileId]: draft },
      past: [...s.past, { label, workspace: current }].slice(-HISTORY_LIMIT),
      future: [],
    });
  },

  undo: () => {
    const s = get();
    const entry = s.past[s.past.length - 1];
    const current = s.workspaces[s.activeProfileId];
    if (!entry || !current) return null;
    set({
      workspaces: { ...s.workspaces, [s.activeProfileId]: entry.workspace },
      past: s.past.slice(0, -1),
      future: [{ label: entry.label, workspace: current }, ...s.future].slice(0, HISTORY_LIMIT),
    });
    return entry.label;
  },

  redo: () => {
    const s = get();
    const entry = s.future[0];
    const current = s.workspaces[s.activeProfileId];
    if (!entry || !current) return null;
    set({
      workspaces: { ...s.workspaces, [s.activeProfileId]: entry.workspace },
      future: s.future.slice(1),
      past: [...s.past, { label: entry.label, workspace: current }].slice(-HISTORY_LIMIT),
    });
    return entry.label;
  },

  createProfile: (name, kind) => {
    const profile: Profile = { id: newId('pf'), name: name.trim() || 'Profile mới', kind, createdAt: Date.now() };
    set((s) => ({
      profiles: [...s.profiles, profile],
      workspaces: { ...s.workspaces, [profile.id]: defaultWorkspace(kind) },
      activeProfileId: profile.id,
      past: [],
      future: [],
    }));
    return profile.id;
  },

  switchProfile: (id) => {
    if (!get().profiles.some((p) => p.id === id)) return;
    // Lịch sử hoàn tác gắn với từng profile — đổi profile thì xoá lịch sử để tránh hoàn tác nhầm.
    set({ activeProfileId: id, past: [], future: [] });
  },

  renameProfile: (id, name) =>
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
    })),

  duplicateProfile: (id) => {
    const s = get();
    const src = s.profiles.find((p) => p.id === id);
    const ws = s.workspaces[id];
    if (!src || !ws) return null;
    const copy: Profile = { ...src, id: newId('pf'), name: `${src.name} (bản sao)`, createdAt: Date.now() };
    set({
      profiles: [...s.profiles, copy],
      workspaces: { ...s.workspaces, [copy.id]: structuredClone(ws) },
    });
    return copy.id;
  },

  deleteProfile: (id) => {
    const s = get();
    if (s.profiles.length <= 1) return false;
    const profiles = s.profiles.filter((p) => p.id !== id);
    const workspaces = { ...s.workspaces };
    delete workspaces[id];
    const activeProfileId = s.activeProfileId === id ? profiles[0]!.id : s.activeProfileId;
    set({
      profiles,
      workspaces,
      activeProfileId,
      past: s.activeProfileId === id ? [] : s.past,
      future: s.activeProfileId === id ? [] : s.future,
    });
    return true;
  },

  importProfile: (data) => {
    // Luôn cấp ID mới để không ghi đè profile đang có.
    const profile: Profile = {
      ...data.profile,
      id: newId('pf'),
      name: `${data.profile.name} (đã nhập)`,
      createdAt: Date.now(),
    };
    set((s) => ({
      profiles: [...s.profiles, profile],
      workspaces: { ...s.workspaces, [profile.id]: structuredClone(data.workspace) as Workspace },
    }));
    return profile.id;
  },

  notify: (toast) => {
    const id = newId('t');
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }));
    setTimeout(() => get().dismissToast(id), toast.undoable ? 6000 : 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setMiniControllerOpen: (open) => set({ miniControllerOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
}));

/** Lấy phần dữ liệu cần lưu từ state. */
export const pickPersisted = (s: PersistedSlice): PersistedSlice => ({
  settings: s.settings,
  profiles: s.profiles,
  activeProfileId: s.activeProfileId,
  workspaces: s.workspaces,
});

/** Lấy workspace của profile hiện tại. */
export const useWorkspace = (): Workspace => useAppStore((s) => s.workspaces[s.activeProfileId]!);

export const useActiveProfile = (): Profile => useAppStore((s) => s.profiles.find((p) => p.id === s.activeProfileId)!);

/** Dùng trong test: đưa store về trạng thái ban đầu. */
export function resetAppStore(): void {
  useAppStore.setState({
    ...initialPersisted(),
    screen: 'dashboard',
    past: [],
    future: [],
    toasts: [],
    miniControllerOpen: false,
    searchOpen: false,
  });
}
