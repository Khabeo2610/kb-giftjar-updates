/**
 * Hàng đợi ưu tiên có giới hạn (bounded priority queue).
 *
 * - priority nhỏ hơn được lấy ra trước; cùng priority thì vào trước ra trước (FIFO).
 * - Khi đầy: phần tử có độ ưu tiên thấp nhất (và mới nhất) bị loại để bảo vệ hiệu năng livestream.
 */
export interface QueueItem<T> {
  value: T;
  priority: number;
  seq: number;
}

export interface PushResult<T> {
  accepted: boolean;
  dropped?: T;
}

export class BoundedPriorityQueue<T> {
  private items: QueueItem<T>[] = [];
  private seq = 0;

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Giới hạn hàng đợi phải là số nguyên ≥ 1');
  }

  get size(): number {
    return this.items.length;
  }

  get capacity(): number {
    return this.limit;
  }

  push(value: T, priority: number): PushResult<T> {
    const item: QueueItem<T> = { value, priority, seq: this.seq++ };
    if (this.items.length < this.limit) {
      this.insert(item);
      return { accepted: true };
    }
    // Đầy: phần tử cuối mảng là phần tử "kém ưu tiên nhất".
    const worst = this.items[this.items.length - 1]!;
    if (compare(item, worst) < 0) {
      this.items.pop();
      this.insert(item);
      return { accepted: true, dropped: worst.value };
    }
    return { accepted: false, dropped: value };
  }

  shift(): T | undefined {
    return this.items.shift()?.value;
  }

  peek(): T | undefined {
    return this.items[0]?.value;
  }

  clear(): void {
    this.items = [];
  }

  toArray(): T[] {
    return this.items.map((i) => i.value);
  }

  private insert(item: QueueItem<T>): void {
    // Tìm vị trí bằng nhị phân để giữ mảng đã sắp xếp — O(log n) so sánh.
    let lo = 0;
    let hi = this.items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (compare(this.items[mid]!, item) <= 0) lo = mid + 1;
      else hi = mid;
    }
    this.items.splice(lo, 0, item);
  }
}

function compare<T>(a: QueueItem<T>, b: QueueItem<T>): number {
  return a.priority - b.priority || a.seq - b.seq;
}
