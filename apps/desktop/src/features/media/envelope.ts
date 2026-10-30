import type { MediaItem } from '@kb/shared-types';

/**
 * Các hàm thuần cho media — tách riêng để kiểm thử được mà không cần trình duyệt phát thật.
 */

export const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus'] as const;
export const VIDEO_EXT = ['mp4', 'webm', 'm4v', 'mov', 'ogv'] as const;
/** Giới hạn kích thước 1 file khi thêm vào thư viện (bảo vệ khỏi file bất thường). */
export const MAX_MEDIA_BYTES = 2 * 1024 * 1024 * 1024;

export type MediaFileCheck = { ok: true; kind: 'audio' | 'video'; baseName: string } | { ok: false; reason: string };

/** Kiểm tra file người dùng chọn trước khi đưa vào thư viện. */
export function checkMediaFile(name: string, mimeType: string, size: number): MediaFileCheck {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const baseName = name.replace(/\.[^.]+$/, '').trim() || name;
  if (size <= 0) return { ok: false, reason: `"${name}" là file rỗng.` };
  if (size > MAX_MEDIA_BYTES) return { ok: false, reason: `"${name}" lớn hơn 2 GB — vui lòng nén hoặc cắt bớt.` };
  if (mimeType.startsWith('audio/') || (AUDIO_EXT as readonly string[]).includes(ext)) return { ok: true, kind: 'audio', baseName };
  if (mimeType.startsWith('video/') || (VIDEO_EXT as readonly string[]).includes(ext)) return { ok: true, kind: 'video', baseName };
  return { ok: false, reason: `"${name}" không phải file âm thanh/video được hỗ trợ.` };
}

/**
 * Hệ số âm lượng (0..1) tại thời điểm `t` (giây) — áp dụng fade-in/fade-out trong đoạn đã cắt.
 * Trả về đã nhân với âm lượng riêng của media và âm lượng tổng.
 */
export function volumeAt(
  t: number,
  item: Pick<MediaItem, 'volume' | 'fadeInMs' | 'fadeOutMs' | 'startSec' | 'endSec'>,
  duration: number | null,
  master: number,
): number {
  const start = item.startSec;
  const end = item.endSec ?? duration ?? Infinity;
  const base = clamp01(item.volume) * clamp01(master);
  if (t < start || t > end) return 0;
  let gain = 1;
  const fadeIn = item.fadeInMs / 1000;
  const fadeOut = item.fadeOutMs / 1000;
  if (fadeIn > 0 && t - start < fadeIn) gain = Math.min(gain, (t - start) / fadeIn);
  if (fadeOut > 0 && Number.isFinite(end) && end - t < fadeOut) gain = Math.min(gain, (end - t) / fadeOut);
  return clamp01(gain) * base;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Thông báo lỗi media dễ hiểu bằng tiếng Việt (theo mã lỗi chuẩn HTMLMediaElement). */
export function describeMediaError(code: number | undefined, fileName: string): string {
  switch (code) {
    case 1:
      return `Đã dừng tải "${fileName}".`;
    case 2:
      return `Không đọc được "${fileName}". File có thể đã bị di chuyển hoặc xoá.`;
    case 3:
      return `"${fileName}" bị lỗi khi giải mã. File có thể bị hỏng — thử xuất lại file.`;
    case 4:
      return `Định dạng/codec của "${fileName}" chưa được hỗ trợ. Nên chuyển sang MP4 (H.264 + AAC) cho video hoặc MP3 cho âm thanh.`;
    default:
      return `Không phát được "${fileName}". Vui lòng thử file khác.`;
  }
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '--:--';
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Chọn bài tiếp theo trong playlist: tuần tự (quay vòng) hoặc ngẫu nhiên (tránh lặp lại bài vừa phát). */
export function pickNext(
  ids: readonly string[],
  currentId: string | null,
  mode: 'sequential' | 'random',
  random = Math.random,
): string | null {
  if (ids.length === 0) return null;
  if (mode === 'sequential') {
    const idx = currentId ? ids.indexOf(currentId) : -1;
    return ids[(idx + 1) % ids.length]!;
  }
  if (ids.length === 1) return ids[0]!;
  const pool = ids.filter((id) => id !== currentId);
  return pool[Math.floor(random() * pool.length)]!;
}
