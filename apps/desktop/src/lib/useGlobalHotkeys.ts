import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { executeDeckAction } from '../features/live/livePipeline';
import { playMedia, stopMedia, useMediaRuntime } from '../features/media/mediaRuntime';
import { hotkeyFromEvent, isTypingTarget } from './hotkeys';

/** Phím tắt trong cửa sổ: Ctrl+K, Ctrl+Z/Y, và phím tắt của media / nút Stream Deck. */
export function useGlobalHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hk = hotkeyFromEvent(e);
      if (!hk) return;
      const st = useAppStore.getState();

      if (hk === 'Ctrl+K' || hk === 'Ctrl+F') {
        e.preventDefault();
        st.setSearchOpen(true);
        return;
      }
      // Không chặn hoàn tác mặc định của ô nhập liệu; và không chạy phím tắt khi đang gõ hoặc mở hộp thoại.
      if (isTypingTarget(e.target) || document.querySelector('[role="dialog"]')) return;

      if (hk === 'Ctrl+Z') {
        e.preventDefault();
        const l = st.undo();
        if (l) st.notify({ tone: 'info', message: `Đã hoàn tác: ${l}` });
        return;
      }
      if (hk === 'Ctrl+Y' || hk === 'Ctrl+Shift+Z') {
        e.preventDefault();
        const l = st.redo();
        if (l) st.notify({ tone: 'info', message: `Đã làm lại: ${l}` });
        return;
      }

      const ws = st.workspaces[st.activeProfileId];
      if (!ws) return;
      const btn = Object.values(ws.deck.buttons).find((b) => b.hotkey === hk);
      if (btn) {
        e.preventDefault();
        executeDeckAction(btn.action, btn.label);
        return;
      }
      const media = ws.media.find((m) => m.hotkey === hk);
      if (media) {
        e.preventDefault();
        // Bấm lần nữa để dừng.
        if (useMediaRuntime.getState().voices.some((v) => v.mediaId === media.id)) return stopMedia(media.id);
        const res = playMedia(media, { master: st.settings.masterVolume, lowPerformance: st.settings.lowPerformanceMode });
        if (!res.ok) st.notify({ tone: 'warning', message: res.reason });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
