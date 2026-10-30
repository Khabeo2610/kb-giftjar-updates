/**
 * Chống trùng lặp sự kiện: nhớ các ID đã thấy trong một cửa sổ thời gian (TTL)
 * và giới hạn số lượng ID lưu trữ để không rò rỉ bộ nhớ khi LIVE kéo dài.
 */
export class Deduplicator {
  private seen = new Map<string, number>();

  constructor(
    private readonly ttlMs = 60_000,
    private readonly maxEntries = 5_000,
  ) {}

  /** Trả về true nếu là sự kiện mới (và ghi nhớ nó), false nếu là bản trùng. */
  accept(id: string, now: number): boolean {
    this.evict(now);
    const at = this.seen.get(id);
    if (at !== undefined && now - at < this.ttlMs) return false;
    this.seen.delete(id);
    this.seen.set(id, now);
    while (this.seen.size > this.maxEntries) {
      const oldest = this.seen.keys().next().value as string;
      this.seen.delete(oldest);
    }
    return true;
  }

  get size(): number {
    return this.seen.size;
  }

  private evict(now: number): void {
    // Map giữ thứ tự chèn → phần tử đầu luôn cũ nhất.
    for (const [id, at] of this.seen) {
      if (now - at < this.ttlMs) break;
      this.seen.delete(id);
    }
  }
}
