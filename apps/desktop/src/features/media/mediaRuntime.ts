import { create } from 'zustand';
import type { MediaItem } from '@kb/shared-types';
import { describeMediaError, volumeAt } from './envelope';
import { newId } from '../../lib/id';

/**
 * Media Runtime — bộ phát media thật chạy trong WebView (HTMLMediaElement).
 *
 * - File người dùng chọn được giữ bằng object URL trong bộ nhớ của phiên làm việc này.
 *   (Giai đoạn 3 sẽ chuyển sang đường dẫn file qua Rust + asset protocol để nhớ sau khi khởi động lại.)
 * - Âm thanh phát chồng tối đa MAX_VOICES (giảm còn 2 ở chế độ hiệu năng thấp).
 * - Video chỉ 1 kênh: video mới thay video cũ.
 */

export interface Voice {
  id: string;
  mediaId: string;
  name: string;
  kind: 'audio' | 'video';
  currentTime: number;
  duration: number | null;
  element: HTMLMediaElement;
}

interface RuntimeState {
  voices: Voice[];
  /** mediaId → object URL của file đã liên kết trong phiên này. */
  urls: Record<string, string>;
  lastError: string | null;
}

export const useMediaRuntime = create<RuntimeState>(() => ({ voices: [], urls: {}, lastError: null }));

const MAX_VOICES = 4;
const MAX_VOICES_LOW_PERF = 2;

export function attachFile(mediaId: string, file: File): string {
  const prev = useMediaRuntime.getState().urls[mediaId];
  if (prev) URL.revokeObjectURL(prev);
  const url = URL.createObjectURL(file);
  useMediaRuntime.setState((s) => ({ urls: { ...s.urls, [mediaId]: url } }));
  return url;
}

export function detachFile(mediaId: string): void {
  const url = useMediaRuntime.getState().urls[mediaId];
  stopMedia(mediaId);
  if (url) URL.revokeObjectURL(url);
  useMediaRuntime.setState((s) => {
    const urls = { ...s.urls };
    delete urls[mediaId];
    return { urls };
  });
}

export const hasFile = (mediaId: string): boolean => !!useMediaRuntime.getState().urls[mediaId];

/** Đọc thời lượng file để kiểm tra codec ngay khi thêm vào thư viện. */
export function probeDuration(url: string, kind: 'audio' | 'video', fileName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(kind);
    el.preload = 'metadata';
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Hết thời gian đọc thông tin "${fileName}".`));
    }, 8000);
    const cleanup = () => {
      clearTimeout(timer);
      el.removeAttribute('src');
      el.load();
    };
    el.onloadedmetadata = () => {
      const d = el.duration;
      cleanup();
      resolve(Number.isFinite(d) ? d : 0);
    };
    el.onerror = () => {
      const code = el.error?.code;
      cleanup();
      reject(new Error(describeMediaError(code, fileName)));
    };
    el.src = url;
  });
}

export type PlayResult = { ok: true } | { ok: false; reason: string };

export function playMedia(item: MediaItem, opts: { master: number; lowPerformance: boolean }): PlayResult {
  const url = useMediaRuntime.getState().urls[item.id];
  if (!url) {
    return {
      ok: false,
      reason: item.isSample
        ? `"${item.name}" là media mẫu, chưa có file. Hãy bấm "Gắn file" để chọn file thật.`
        : `Chưa liên kết file cho "${item.name}" trong phiên này. Hãy bấm "Gắn file".`,
    };
  }

  const state = useMediaRuntime.getState();
  // Video chỉ một kênh.
  if (item.kind === 'video') state.voices.filter((v) => v.kind === 'video').forEach((v) => stopVoice(v.id));
  // Giới hạn số âm thanh phát chồng: dừng cái cũ nhất.
  const limit = opts.lowPerformance ? MAX_VOICES_LOW_PERF : MAX_VOICES;
  const audios = useMediaRuntime.getState().voices.filter((v) => v.kind === 'audio');
  if (item.kind === 'audio' && audios.length >= limit) stopVoice(audios[0]!.id);

  const el = document.createElement(item.kind);
  el.src = url;
  el.preload = 'auto';
  if (el instanceof HTMLVideoElement) {
    el.playsInline = true;
    el.className = 'h-full w-full rounded-xl bg-black object-contain';
  }
  const voice: Voice = {
    id: newId('v'),
    mediaId: item.id,
    name: item.name,
    kind: item.kind,
    currentTime: item.startSec,
    duration: item.durationSec,
    element: el,
  };

  let raf = 0;
  let lastReported = -1;
  const tick = () => {
    const t = el.currentTime;
    const duration = Number.isFinite(el.duration) ? el.duration : item.durationSec;
    el.volume = volumeAt(t, item, duration, opts.master);
    const end = item.endSec ?? duration ?? Infinity;
    if (t >= end) {
      stopVoice(voice.id);
      return;
    }
    // Chỉ cập nhật UI ~4 lần/giây để không làm nặng máy đang LIVE.
    if (Math.abs(t - lastReported) >= 0.25) {
      lastReported = t;
      updateVoice(voice.id, { currentTime: t, duration });
    }
    raf = requestAnimationFrame(tick);
  };

  el.addEventListener('loadedmetadata', () => {
    if (item.startSec > 0) el.currentTime = Math.min(item.startSec, el.duration || item.startSec);
  });
  el.addEventListener('ended', () => stopVoice(voice.id));
  el.addEventListener('error', () => {
    const message = describeMediaError(el.error?.code, item.fileName ?? item.name);
    useMediaRuntime.setState({ lastError: message });
    stopVoice(voice.id);
  });
  (el as HTMLMediaElement & { __kbStop?: () => void }).__kbStop = () => cancelAnimationFrame(raf);

  el.volume = volumeAt(item.startSec, item, item.durationSec, opts.master);
  useMediaRuntime.setState((s) => ({ voices: [...s.voices, voice], lastError: null }));
  el.play()
    .then(() => {
      raf = requestAnimationFrame(tick);
    })
    .catch((err: unknown) => {
      // NotAllowedError/AbortError: thường do dừng ngay sau khi phát — không phải lỗi nghiêm trọng.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      useMediaRuntime.setState({ lastError: describeMediaError(el.error?.code, item.fileName ?? item.name) });
      stopVoice(voice.id);
    });
  return { ok: true };
}

function updateVoice(id: string, patch: Partial<Voice>): void {
  useMediaRuntime.setState((s) => ({ voices: s.voices.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
}

export function stopVoice(id: string): void {
  const voice = useMediaRuntime.getState().voices.find((v) => v.id === id);
  if (!voice) return;
  const el = voice.element as HTMLMediaElement & { __kbStop?: () => void };
  el.__kbStop?.();
  el.pause();
  el.removeAttribute('src');
  el.load();
  el.remove();
  useMediaRuntime.setState((s) => ({ voices: s.voices.filter((v) => v.id !== id) }));
}

export function stopMedia(mediaId: string): void {
  useMediaRuntime
    .getState()
    .voices.filter((v) => v.mediaId === mediaId)
    .forEach((v) => stopVoice(v.id));
}

export function stopAll(): void {
  useMediaRuntime.getState().voices.forEach((v) => stopVoice(v.id));
}

export const isPlaying = (mediaId: string, voices: Voice[]): boolean => voices.some((v) => v.mediaId === mediaId);
