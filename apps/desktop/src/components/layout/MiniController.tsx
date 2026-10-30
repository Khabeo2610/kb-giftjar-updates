import { useEffect, useRef, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { GripHorizontal, Pin, PinOff, Square, X } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { DeckTile } from '../../features/deck/DeckTile';
import { executeDeckAction } from '../../features/live/livePipeline';
import { stopAll, useMediaRuntime } from '../../features/media/mediaRuntime';
import { IconButton, Select } from '../ui/primitives';

/**
 * Mini Controller: bảng nút nổi gọn nhẹ, kéo thả được trong cửa sổ.
 * "Luôn trên cùng" giữ cửa sổ KB Studio nổi trên OBS/TikTok LIVE Studio — chỉ hoạt động trong bản desktop (Tauri).
 */
export function MiniController() {
  const open = useAppStore((s) => s.miniControllerOpen);
  const setOpen = useAppStore((s) => s.setMiniControllerOpen);
  const notify = useAppStore((s) => s.notify);
  const ws = useWorkspace();
  const voices = useMediaRuntime((s) => s.voices);
  const [pageId, setPageId] = useState(ws.deck.pages[0]?.id ?? '');
  const [pinned, setPinned] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const page = ws.deck.pages.find((p) => p.id === pageId) ?? ws.deck.pages[0];

  useEffect(() => {
    if (!ws.deck.pages.some((p) => p.id === pageId)) setPageId(ws.deck.pages[0]?.id ?? '');
  }, [ws.deck.pages, pageId]);

  const togglePin = async () => {
    if (!isTauri()) {
      notify({ tone: 'info', message: '"Luôn trên cùng" chỉ hoạt động trong ứng dụng desktop, không có trong bản xem trên trình duyệt.' });
      return;
    }
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setAlwaysOnTop(!pinned);
      setPinned(!pinned);
      notify({ tone: 'success', message: !pinned ? 'Cửa sổ KB Studio sẽ luôn nằm trên cùng.' : 'Đã tắt "Luôn trên cùng".' });
    } catch {
      notify({ tone: 'danger', message: 'Không đổi được chế độ "Luôn trên cùng". Vui lòng thử lại.' });
    }
  };

  if (!open || !page) return null;
  const buttons = page.slots.map((id) => (id ? ws.deck.buttons[id] : undefined));

  return (
    <div ref={constraintsRef} className="pointer-events-none fixed inset-0 z-40">
      <motion.section
        drag
        dragMomentum={false}
        dragConstraints={constraintsRef}
        dragListener={false}
        dragControls={dragControls}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        aria-label="Mini Controller"
        className="pointer-events-auto absolute right-6 bottom-24 w-[340px] rounded-card border border-line bg-surface p-3 shadow-float"
      >
        {/* Chỉ kéo bằng tay cầm để không bấm nhầm nút khi di chuyển panel. */}
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            aria-label="Kéo để di chuyển"
            title="Kéo để di chuyển"
            className="cursor-grab touch-none text-muted active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <GripHorizontal size={18} />
          </button>
          <h2 className="text-sm font-bold">Mini Controller</h2>
          <div className="ml-auto flex items-center gap-1">
            <IconButton label={pinned ? 'Tắt luôn trên cùng' : 'Luôn trên cùng'} onClick={togglePin} variant={pinned ? 'soft' : 'ghost'}>
              {pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </IconButton>
            <IconButton label="Đóng Mini Controller" onClick={() => setOpen(false)}>
              <X size={16} />
            </IconButton>
          </div>
        </div>
        {ws.deck.pages.length > 1 && (
          <Select aria-label="Trang nút" className="mb-2 h-8 text-xs" value={page.id} onChange={(e) => setPageId(e.target.value)}>
            {ws.deck.pages.map((p) => (
              <option key={p.id} value={p.id}>
                Trang: {p.name}
              </option>
            ))}
          </Select>
        )}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(ws.deck.cols, 4)}, minmax(0, 1fr))` }}>
          {buttons.map((b, i) =>
            b ? (
              <div key={`${b.id}-${i}`} className="aspect-square">
                <DeckTile compact button={b} onPress={() => executeDeckAction(b.action, b.label)} />
              </div>
            ) : null,
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs">
          <span className="flex-1 truncate text-muted">
            {voices.length ? `Đang phát: ${voices.map((v) => v.name).join(', ')}` : 'Không có media đang phát'}
          </span>
          <IconButton label="Dừng tất cả" variant="danger" className="h-7 w-7" disabled={!voices.length} onClick={stopAll}>
            <Square size={13} />
          </IconButton>
        </div>
      </motion.section>
    </div>
  );
}
