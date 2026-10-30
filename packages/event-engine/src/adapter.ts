import type { LiveEvent } from '@kb/shared-types';
import { randomMockEvent } from './mockProvider';

/**
 * Event Adapter — interface cho mọi nguồn sự kiện LIVE.
 *
 * Sprint 1: chỉ có `MockEventSource` (giả lập). Nguồn TikTok thật chỉ được viết khi có nguồn dữ liệu
 * hợp lệ; KB Studio không yêu cầu mật khẩu TikTok và không vượt cơ chế bảo vệ của nền tảng.
 *
 * Nguồn thật phải tự lo: reconnect + retry với backoff, heartbeat, và chuyển dữ liệu về `LiveEvent`.
 */

export type EventSourceStatus =
  | { status: 'stopped' }
  | { status: 'connecting'; attempt: number }
  | { status: 'live' }
  | { status: 'error'; message: string; retryInMs: number | null };

export interface EventSourceAdapter {
  readonly id: string;
  readonly label: string;
  /** true nếu là nguồn giả lập (UI phải hiển thị rõ "Demo"). */
  readonly isMock: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(listener: (event: LiveEvent) => void): () => void;
  onStatus(listener: (status: EventSourceStatus) => void): () => void;
}

/** Tính thời gian chờ trước lần thử kết nối lại thứ `attempt` (backoff luỹ thừa có giới hạn + jitter). */
export function backoffDelay(attempt: number, baseMs = 1000, maxMs = 30_000, random: () => number = Math.random): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(exp / 2 + (random() * exp) / 2);
}

/** Nguồn sự kiện giả lập, phát sự kiện ngẫu nhiên theo chu kỳ. */
export class MockEventSource implements EventSourceAdapter {
  readonly id = 'mock';
  readonly label = 'Giả lập (Demo)';
  readonly isMock = true;
  private timer: ReturnType<typeof setInterval> | null = null;
  private eventListeners = new Set<(e: LiveEvent) => void>();
  private statusListeners = new Set<(s: EventSourceStatus) => void>();

  constructor(
    private readonly intervalMs = 1500,
    private readonly generate: () => LiveEvent = () => randomMockEvent(),
  ) {}

  async start(): Promise<void> {
    if (this.timer) return;
    this.timer = setInterval(() => this.eventListeners.forEach((l) => l(this.generate())), this.intervalMs);
    this.emitStatus({ status: 'live' });
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.emitStatus({ status: 'stopped' });
  }

  onEvent(listener: (e: LiveEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: (s: EventSourceStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(s: EventSourceStatus): void {
    this.statusListeners.forEach((l) => l(s));
  }
}
