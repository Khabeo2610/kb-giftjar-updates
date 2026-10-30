import type { DeckLayout } from '@kb/shared-types';

/**
 * Hàm thuần xử lý bố cục Stream Deck (tách riêng để kiểm thử).
 */

/** Đổi kích thước lưới. Trả về null nếu lưới mới quá nhỏ cho số nút đang có ở một trang nào đó. */
export function resizeDeck(deck: DeckLayout, rows: number, cols: number): DeckLayout | null {
  const size = rows * cols;
  const pages = [];
  for (const page of deck.pages) {
    const filled = page.slots.filter((s): s is string => s !== null);
    if (filled.length > size) return null;
    // Giữ nguyên vị trí nếu còn vừa; nút nào bị cắt thì dồn vào ô trống còn lại.
    const slots: Array<string | null> = Array.from({ length: size }, () => null);
    const overflow: string[] = [];
    page.slots.forEach((id, i) => {
      if (!id) return;
      const r = Math.floor(i / deck.cols);
      const c = i % deck.cols;
      if (r < rows && c < cols) slots[r * cols + c] = id;
      else overflow.push(id);
    });
    for (const id of overflow) slots[slots.indexOf(null)] = id;
    pages.push({ ...page, slots });
  }
  return { ...deck, rows, cols, pages };
}

/** Đổi chỗ 2 ô trong một trang (kéo thả). */
export function swapSlots(deck: DeckLayout, pageId: string, from: number, to: number): DeckLayout {
  return {
    ...deck,
    pages: deck.pages.map((p) => {
      if (p.id !== pageId) return p;
      const slots = [...p.slots];
      [slots[from], slots[to]] = [slots[to] ?? null, slots[from] ?? null];
      return { ...p, slots };
    }),
  };
}

/** Xoá các nút không còn nằm ở trang nào (dọn rác sau khi xoá trang). */
export function pruneOrphanButtons(deck: DeckLayout): DeckLayout {
  const used = new Set(deck.pages.flatMap((p) => p.slots).filter(Boolean));
  return { ...deck, buttons: Object.fromEntries(Object.entries(deck.buttons).filter(([id]) => used.has(id))) };
}
