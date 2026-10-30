import { useEffect, useState } from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { DeckAction, DeckButton } from '@kb/shared-types';
import { PASTEL_COLORS, PASTEL_LABELS, PASTEL_VAR } from '@kb/ui-design-system';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { Modal } from '../../components/ui/overlays';
import { Button, Field, IconButton, Select, TextInput } from '../../components/ui/primitives';
import { HotkeyInput } from '../../components/ui/HotkeyInput';
import { DECK_ICON_CHOICES, Icon } from '../../components/ui/Icon';
import { cx } from '../../lib/cx';
import { findHotkeyOwner } from '../media/hotkeyOwners';

type SimpleAction = Exclude<DeckAction, { kind: 'macro' }>;

const ACTION_LABEL: Record<DeckAction['kind'], string> = {
  none: 'Chưa gán',
  playMedia: 'Phát video/âm thanh',
  stopAllMedia: 'Dừng tất cả media',
  triggerRule: 'Kích hoạt hiệu ứng quà',
  obsScene: 'Chuyển scene OBS',
  macro: 'Macro (nhiều bước)',
};

function defaultAction(kind: DeckAction['kind'], mediaId?: string, ruleId?: string): DeckAction {
  switch (kind) {
    case 'playMedia':
      return { kind, mediaId: mediaId ?? '' };
    case 'triggerRule':
      return { kind, ruleId: ruleId ?? '' };
    case 'obsScene':
      return { kind, sceneName: 'Chính' };
    case 'macro':
      return { kind, steps: [] };
    default:
      return { kind } as DeckAction;
  }
}

export function validateDeckButton(b: DeckButton, mediaIds: string[], ruleIds: string[]): string | null {
  if (!b.label.trim()) return 'Vui lòng đặt tên cho nút.';
  const check = (a: DeckAction): string | null => {
    if (a.kind === 'playMedia' && !mediaIds.includes(a.mediaId)) return 'Hãy chọn media cho nút.';
    if (a.kind === 'triggerRule' && !ruleIds.includes(a.ruleId)) return 'Hãy chọn quy tắc hiệu ứng cho nút.';
    if (a.kind === 'obsScene' && !a.sceneName.trim()) return 'Vui lòng nhập tên scene.';
    if (a.kind === 'macro') {
      if (a.steps.length === 0) return 'Macro cần ít nhất một bước.';
      for (const s of a.steps) {
        const e = check(s.action);
        if (e) return e;
      }
    }
    return null;
  };
  return check(b.action);
}

function ActionFields({ action, onChange, allowMacro }: { action: DeckAction; onChange: (a: DeckAction) => void; allowMacro: boolean }) {
  const ws = useWorkspace();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Hành động">
        <Select
          aria-label="Loại hành động"
          value={action.kind}
          onChange={(e) => onChange(defaultAction(e.target.value as DeckAction['kind'], ws.media[0]?.id, ws.rules[0]?.id))}
        >
          {Object.entries(ACTION_LABEL)
            .filter(([k]) => allowMacro || k !== 'macro')
            .map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
        </Select>
      </Field>
      {action.kind === 'playMedia' && (
        <Field label="Media">
          <Select aria-label="Media" value={action.mediaId} onChange={(e) => onChange({ ...action, mediaId: e.target.value })}>
            <option value="">— Chọn media —</option>
            {ws.media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kind === 'video' ? '🎬' : '🎵'} {m.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {action.kind === 'triggerRule' && (
        <Field label="Quy tắc hiệu ứng">
          <Select aria-label="Quy tắc" value={action.ruleId} onChange={(e) => onChange({ ...action, ruleId: e.target.value })}>
            <option value="">— Chọn quy tắc —</option>
            {ws.rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {action.kind === 'obsScene' && (
        <Field label="Tên scene (OBS — giai đoạn 4)">
          <TextInput
            aria-label="Tên scene"
            value={action.sceneName}
            maxLength={120}
            onChange={(e) => onChange({ ...action, sceneName: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}

export function DeckButtonEditor({
  button,
  onClose,
  onSave,
  onDelete,
}: {
  button: DeckButton | null;
  onClose: () => void;
  onSave: (b: DeckButton) => void;
  onDelete: (id: string) => void;
}) {
  const ws = useWorkspace();
  const notify = useAppStore((s) => s.notify);
  const [draft, setDraft] = useState<DeckButton | null>(button);
  useEffect(() => setDraft(button), [button]);
  if (!draft) return null;
  const set = (patch: Partial<DeckButton>) => setDraft({ ...draft, ...patch });
  const isExisting = !!button && !!ws.deck.buttons[button.id];

  const save = () => {
    const err = validateDeckButton(
      draft,
      ws.media.map((m) => m.id),
      ws.rules.map((r) => r.id),
    );
    if (err) return notify({ tone: 'warning', message: err });
    onSave({ ...draft, label: draft.label.trim().slice(0, 40) });
  };

  return (
    <Modal
      open={!!button}
      onClose={onClose}
      title={isExisting ? 'Sửa nút' : 'Tạo nút mới'}
      width="max-w-2xl"
      footer={
        <>
          {isExisting && (
            <Button variant="danger" className="mr-auto" icon={<Trash2 size={15} />} onClick={() => onDelete(draft.id)}>
              Xoá nút
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={save}>
            Lưu nút
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tên nút" htmlFor="deck-label">
            <TextInput id="deck-label" value={draft.label} maxLength={40} onChange={(e) => set({ label: e.target.value })} />
          </Field>
          <Field label="Phím tắt">
            <HotkeyInput
              value={draft.hotkey}
              onChange={(hotkey) => set({ hotkey })}
              conflictWith={(hk) => findHotkeyOwner(ws, hk, draft.id)}
            />
          </Field>
        </div>
        <Field label="Màu nền">
          <div className="flex flex-wrap gap-2">
            {PASTEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={PASTEL_LABELS[c]}
                aria-pressed={draft.color === c}
                onClick={() => set({ color: c })}
                className={cx('h-9 w-9 rounded-full border-2', draft.color === c ? 'border-accent' : 'border-line')}
                style={{ background: PASTEL_VAR[c] }}
              />
            ))}
          </div>
        </Field>
        <Field label="Biểu tượng">
          <div className="grid max-h-36 grid-cols-10 gap-1.5 overflow-y-auto rounded-xl bg-surface-2 p-2">
            {DECK_ICON_CHOICES.map((name) => (
              <button
                key={name}
                type="button"
                aria-label={`Icon ${name}`}
                aria-pressed={draft.icon === name}
                onClick={() => set({ icon: name })}
                className={cx(
                  'flex h-9 items-center justify-center rounded-lg',
                  draft.icon === name ? 'bg-primary text-on-primary' : 'hover:bg-primary-soft',
                )}
              >
                <Icon name={name} size={18} />
              </button>
            ))}
          </div>
        </Field>

        <ActionFields action={draft.action} allowMacro onChange={(action) => set({ action })} />

        {draft.action.kind === 'macro' && (
          <section className="rounded-2xl bg-lavender/50 p-3">
            <h3 className="mb-2 text-sm font-bold">Các bước macro</h3>
            <ol className="flex flex-col gap-2">
              {draft.action.steps.map((step, i) => {
                const macro = draft.action as Extract<DeckAction, { kind: 'macro' }>;
                const update = (patch: Partial<(typeof macro.steps)[number]>) =>
                  set({ action: { ...macro, steps: macro.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) } });
                return (
                  <li key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-surface p-2">
                    <div className="min-w-0 flex-1">
                      <ActionFields action={step.action} allowMacro={false} onChange={(a) => update({ action: a as SimpleAction })} />
                    </div>
                    <div className="w-28">
                      <Field label="Chờ trước (ms)">
                        <TextInput
                          aria-label="Thời gian chờ"
                          type="number"
                          min={0}
                          max={60000}
                          step={100}
                          value={step.delayMs}
                          onChange={(e) => update({ delayMs: Math.max(0, Math.min(60000, Math.floor(Number(e.target.value)) || 0)) })}
                        />
                      </Field>
                    </div>
                    <IconButton
                      label="Xoá bước"
                      onClick={() => set({ action: { ...macro, steps: macro.steps.filter((_, j) => j !== i) } })}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </li>
                );
              })}
            </ol>
            <Button
              size="sm"
              className="mt-2"
              icon={<Plus size={14} />}
              disabled={draft.action.steps.length >= 20}
              onClick={() => {
                const macro = draft.action as Extract<DeckAction, { kind: 'macro' }>;
                set({ action: { ...macro, steps: [...macro.steps, { action: { kind: 'stopAllMedia' }, delayMs: 0 }] } });
              }}
            >
              Thêm bước
            </Button>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck size={14} aria-hidden /> Vì an toàn, macro chỉ dùng các hành động có sẵn trong KB Studio — không chạy lệnh hệ
              thống.
            </p>
          </section>
        )}
      </div>
    </Modal>
  );
}
