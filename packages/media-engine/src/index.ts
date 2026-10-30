import type { MediaItem } from '@kb/shared-types';

/**
 * Interface Media Engine — Sprint 1 chỉ định nghĩa hợp đồng.
 *
 * Bản hiện tại (`apps/desktop/src/features/media/mediaRuntime.ts`) phát bằng HTMLMediaElement trong WebView.
 * Sprint sau sẽ có bản native (Rust) nhớ đường dẫn file và chọn thiết bị âm thanh, cài đặt cùng interface này
 * để UI không phải sửa.
 */

export type PlayResult = { ok: true; voiceId: string } | { ok: false; reason: string };

export interface PlayOptions {
  /** Âm lượng tổng 0..1. */
  master: number;
  lowPerformance: boolean;
  /** ID thiết bị âm thanh đầu ra (null = mặc định của hệ điều hành). */
  outputDeviceId?: string | null;
}

export interface VoiceState {
  voiceId: string;
  mediaId: string;
  currentTime: number;
  duration: number | null;
}

export interface AudioOutputDevice {
  id: string;
  label: string;
  isDefault: boolean;
}

export interface MediaEngine {
  /** Liên kết media với một file trên máy. Engine phải kiểm tra đường dẫn (chống path traversal) và loại file. */
  attach(mediaId: string, source: { kind: 'file'; file: File } | { kind: 'path'; path: string }): Promise<{ durationSec: number }>;
  detach(mediaId: string): void;
  isAttached(mediaId: string): boolean;
  play(item: MediaItem, options: PlayOptions): PlayResult;
  stop(voiceId: string): void;
  stopAll(): void;
  /** Đăng ký nhận cập nhật tiến trình phát; trả về hàm huỷ đăng ký. */
  subscribe(listener: (voices: VoiceState[]) => void): () => void;
  listOutputDevices(): Promise<AudioOutputDevice[]>;
}
