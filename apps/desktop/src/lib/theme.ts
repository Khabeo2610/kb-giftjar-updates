import { useEffect, useSyncExternalStore } from 'react';
import { useAppStore } from '../store/appStore';

const subscribeMedia = (query: string) => (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Chủ đề thực tế đang áp dụng (đã xét tuỳ chọn "Theo hệ thống"). */
export function useResolvedTheme(): 'light' | 'dark' {
  const pref = useAppStore((s) => s.settings.theme);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}

export function useResolvedReducedMotion(): boolean {
  const pref = useAppStore((s) => s.settings.reducedMotion);
  const systemReduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  return pref === 'system' ? systemReduce : pref === 'on';
}

/** Gắn theme + giảm chuyển động lên thẻ <html> để CSS tokens đổi theo. */
export function useApplyTheme(): { reducedMotion: boolean } {
  const theme = useResolvedTheme();
  const reducedMotion = useResolvedReducedMotion();
  const lowPerf = useAppStore((s) => s.settings.lowPerformanceMode);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    // Chế độ hiệu năng thấp cũng tắt bớt chuyển động để nhường CPU/GPU cho OBS.
    document.documentElement.dataset.reducedMotion = String(reducedMotion || lowPerf);
  }, [reducedMotion, lowPerf]);
  return { reducedMotion: reducedMotion || lowPerf };
}
