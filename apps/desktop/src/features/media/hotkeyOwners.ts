import type { Workspace } from '../../data/defaults';

/** Tìm chức năng đang dùng một phím tắt (để cảnh báo trùng). Bỏ qua `exceptId` (chính mục đang sửa). */
export function findHotkeyOwner(ws: Workspace, hotkey: string, exceptId?: string): string | null {
  const media = ws.media.find((m) => m.hotkey === hotkey && m.id !== exceptId);
  if (media) return `Media: ${media.name}`;
  const btn = Object.values(ws.deck.buttons).find((b) => b.hotkey === hotkey && b.id !== exceptId);
  if (btn) return `Nút: ${btn.label}`;
  return null;
}
