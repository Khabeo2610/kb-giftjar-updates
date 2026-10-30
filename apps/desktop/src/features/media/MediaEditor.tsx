import { useEffect, useState } from 'react';
import { Link2, Play } from 'lucide-react';
import type { MediaItem } from '@kb/shared-types';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { Modal } from '../../components/ui/overlays';
import { Button, Field, Select, Slider, TextInput } from '../../components/ui/primitives';
import { HotkeyInput } from '../../components/ui/HotkeyInput';
import { formatDuration } from './envelope';
import { playMedia, stopMedia } from './mediaRuntime';
import { findHotkeyOwner } from './hotkeyOwners';

/** Hộp thoại sửa một media: tên, nhóm, tag, âm lượng, fade, cắt đoạn, phím tắt. */
export function MediaEditor({ item, onClose, onAttach }: { item: MediaItem | null; onClose: () => void; onAttach: (id: string) => void }) {
  const ws = useWorkspace();
  const commit = useAppStore((s) => s.commit);
  const settings = useAppStore((s) => s.settings);
  const notify = useAppStore((s) => s.notify);
  const advanced = settings.uiMode === 'advanced';
  const [draft, setDraft] = useState<MediaItem | null>(item);
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    setDraft(item);
    setTagsText(item?.tags.join(', ') ?? '');
  }, [item]);

  if (!draft) return null;
  const set = (patch: Partial<MediaItem>) => setDraft({ ...draft, ...patch });
  const maxSec = draft.durationSec ?? 600;
  const endValue = draft.endSec ?? maxSec;
  const trimError = draft.endSec !== null && draft.endSec <= draft.startSec ? 'Điểm kết thúc phải sau điểm bắt đầu.' : null;

  const save = () => {
    if (!draft.name.trim()) return notify({ tone: 'warning', message: 'Tên media không được để trống.' });
    if (trimError) return notify({ tone: 'warning', message: trimError });
    const tags = [
      ...new Set(
        tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ]
      .slice(0, 30)
      .map((t) => t.slice(0, 40));
    commit(`Sửa media "${draft.name}"`, (w) => {
      const idx = w.media.findIndex((m) => m.id === draft.id);
      if (idx >= 0) w.media[idx] = { ...draft, name: draft.name.trim().slice(0, 120), tags };
    });
    notify({ tone: 'success', message: 'Đã lưu thay đổi.', undoable: true });
    onClose();
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Chỉnh sửa media"
      width="max-w-xl"
      footer={
        <>
          <Button
            icon={<Play size={16} />}
            onClick={() => {
              stopMedia(draft.id);
              const res = playMedia(draft, { master: settings.masterVolume, lowPerformance: settings.lowPerformanceMode });
              if (!res.ok) notify({ tone: 'warning', message: res.reason });
            }}
          >
            Nghe/xem thử
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={save}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Tên hiển thị" htmlFor="me-name">
            <TextInput id="me-name" value={draft.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
        <Field label="Nhóm" htmlFor="me-group">
          <Select id="me-group" value={draft.groupId} onChange={(e) => set({ groupId: e.target.value })}>
            {ws.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tag" hint="Cách nhau bằng dấu phẩy" htmlFor="me-tags">
          <TextInput id="me-tags" value={tagsText} placeholder="hài, pk, cảm ơn" onChange={(e) => setTagsText(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Slider
            label="Âm lượng"
            value={Math.round(draft.volume * 100)}
            min={0}
            max={100}
            onChange={(v) => set({ volume: v / 100 })}
            format={(v) => `${v}%`}
          />
        </div>
        <Slider
          label="Fade-in"
          value={draft.fadeInMs}
          min={0}
          max={5000}
          step={100}
          onChange={(v) => set({ fadeInMs: v })}
          format={(v) => `${(v / 1000).toFixed(1)} giây`}
        />
        <Slider
          label="Fade-out"
          value={draft.fadeOutMs}
          min={0}
          max={5000}
          step={100}
          onChange={(v) => set({ fadeOutMs: v })}
          format={(v) => `${(v / 1000).toFixed(1)} giây`}
        />
        {advanced && (
          <>
            <Slider
              label="Bắt đầu phát từ"
              value={draft.startSec}
              min={0}
              max={Math.max(1, maxSec)}
              step={0.5}
              onChange={(v) => set({ startSec: v })}
              format={formatDuration}
            />
            <Slider
              label="Kết thúc tại"
              value={endValue}
              min={0}
              max={Math.max(1, maxSec)}
              step={0.5}
              onChange={(v) => set({ endSec: v >= maxSec ? null : v })}
              format={(v) => (draft.endSec === null ? 'Hết file' : formatDuration(v))}
            />
            {trimError && <p className="text-xs text-danger sm:col-span-2">{trimError}</p>}
          </>
        )}
        <div className="sm:col-span-2">
          <Field label="Phím tắt">
            <HotkeyInput
              value={draft.hotkey}
              onChange={(hotkey) => set({ hotkey })}
              conflictWith={(hk) => findHotkeyOwner(ws, hk, draft.id)}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3 text-xs sm:col-span-2">
          <span className="text-muted">
            {draft.isSample ? 'Media mẫu — chưa có file.' : `File: ${draft.fileName ?? '—'} · ${formatDuration(draft.durationSec)}`}
          </span>
          <Button size="sm" icon={<Link2 size={14} />} onClick={() => onAttach(draft.id)}>
            Gắn file
          </Button>
        </div>
        {!advanced && <p className="text-xs text-muted sm:col-span-2">Bật chế độ “Nâng cao” ở thanh trên để cắt đoạn phát.</p>}
      </div>
    </Modal>
  );
}
