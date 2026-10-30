/**
 * Chuẩn hoá phím tắt thành chuỗi dạng "Ctrl+Shift+K", "F1", "Alt+3".
 * Phím tắt hiện hoạt động khi cửa sổ KB Studio đang được chọn.
 * Phím tắt toàn hệ thống (khi đang ở OBS/TikTok LIVE Studio) sẽ làm qua plugin Tauri ở giai đoạn 3.
 */

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

/** Các phím ứng dụng dành riêng — không cho gán làm phím tắt. */
export const RESERVED_HOTKEYS = new Set(['Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'Ctrl+K', 'Ctrl+F', 'Escape', 'Tab']);

export function hotkeyFromEvent(e: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;
  let key: string;
  if (/^F\d{1,2}$/.test(e.key)) key = e.key;
  else if (e.code.startsWith('Digit')) key = e.code.slice(5);
  else if (e.code.startsWith('Numpad')) key = `Num${e.code.slice(6)}`;
  else if (e.code.startsWith('Key')) key = e.code.slice(3);
  else if (e.key === ' ') key = 'Space';
  else if (e.key.length === 1) key = e.key.toUpperCase();
  else key = e.key;

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

/** Phím tắt "an toàn" để gán: có phím bổ trợ, hoặc là phím chức năng F1–F24 / Numpad. */
export function isAssignableHotkey(hotkey: string): boolean {
  if (RESERVED_HOTKEYS.has(hotkey)) return false;
  if (/^(Ctrl|Alt|Shift)\+/.test(hotkey) && !/^Shift\+[A-Z0-9]$/.test(hotkey)) return true;
  return /^F\d{1,2}$/.test(hotkey) || /^Num[0-9]$/.test(hotkey);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
