import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { GiftRule, RuleAction, RuleTrigger } from '@kb/shared-types';
import { MOCK_GIFTS } from '@kb/event-engine';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { Modal, InfoTip } from '../../components/ui/overlays';
import { Button, Field, IconButton, Select, Slider, TextInput } from '../../components/ui/primitives';
import { ACTION_KIND_LABEL } from './ruleText';
import { ANIMATION_LABEL } from '../live/livePipeline';

const TRIGGER_LABEL: Record<RuleTrigger['type'], string> = {
  gift: 'Nhận quà',
  like: 'Thả tim',
  comment: 'Bình luận',
  follow: 'Follow',
  share: 'Chia sẻ',
  join: 'Vào phòng',
  subscribe: 'Đăng ký',
};

function defaultTrigger(type: RuleTrigger['type']): RuleTrigger {
  switch (type) {
    case 'gift':
      return { type, giftId: 'rose', minCount: 1 };
    case 'like':
      return { type, minCount: 10 };
    case 'comment':
      return { type, keyword: '' };
    default:
      return { type };
  }
}

function defaultAction(kind: RuleAction['kind'], firstMediaId: string | undefined): RuleAction {
  switch (kind) {
    case 'playMedia':
      return { kind, mediaId: firstMediaId ?? '' };
    case 'showAnimation':
      return { kind, animation: 'hearts', durationMs: 2000 };
    case 'showName':
      return { kind, template: 'Cảm ơn {user} đã tặng {gift}!', durationMs: 3000 };
    case 'speak':
      return { kind, template: 'Cảm ơn {user} nhiều nha!' };
    case 'obsScene':
      return { kind, sceneName: 'Chính' };
  }
}

export function emptyRule(priority: number): GiftRule {
  return {
    id: '',
    name: 'Quy tắc mới',
    enabled: true,
    priority,
    trigger: { type: 'gift', giftId: 'rose', minCount: 1 },
    conditions: { cooldownMs: 2000, perUserCooldownMs: 0, probability: 100 },
    actions: [{ kind: 'showAnimation', animation: 'hearts', durationMs: 2000 }],
  };
}

/** Kiểm tra quy tắc trước khi lưu — trả về thông báo lỗi tiếng Việt hoặc null. */
export function validateRule(rule: GiftRule, mediaIds: string[]): string | null {
  if (!rule.name.trim()) return 'Vui lòng đặt tên cho quy tắc.';
  if (rule.actions.length === 0) return 'Quy tắc cần ít nhất một hành động.';
  for (const a of rule.actions) {
    if (a.kind === 'playMedia' && !mediaIds.includes(a.mediaId)) return 'Hãy chọn media cần phát (hoặc thêm media vào thư viện trước).';
    if ((a.kind === 'showName' || a.kind === 'speak') && !a.template.trim()) return 'Nội dung chữ/lời đọc không được để trống.';
    if (a.kind === 'obsScene' && !a.sceneName.trim()) return 'Vui lòng nhập tên scene OBS.';
  }
  return null;
}

export function RuleEditor({ rule, onClose, onSave }: { rule: GiftRule | null; onClose: () => void; onSave: (r: GiftRule) => void }) {
  const ws = useWorkspace();
  const advanced = useAppStore((s) => s.settings.uiMode === 'advanced');
  const notify = useAppStore((s) => s.notify);
  const [draft, setDraft] = useState<GiftRule | null>(rule);
  useEffect(() => setDraft(rule), [rule]);
  if (!draft) return null;

  const set = (patch: Partial<GiftRule>) => setDraft({ ...draft, ...patch });
  const setCond = (patch: Partial<GiftRule['conditions']>) => set({ conditions: { ...draft.conditions, ...patch } });
  const setAction = (i: number, a: RuleAction) => set({ actions: draft.actions.map((x, j) => (j === i ? a : x)) });
  const moveAction = (i: number, d: -1 | 1) => {
    const arr = [...draft.actions];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    set({ actions: arr });
  };
  const t = draft.trigger;

  const save = () => {
    const err = validateRule(
      draft,
      ws.media.map((m) => m.id),
    );
    if (err) return notify({ tone: 'warning', message: err });
    onSave({ ...draft, name: draft.name.trim().slice(0, 120) });
  };

  return (
    <Modal
      open={!!rule}
      onClose={onClose}
      title={rule?.id ? 'Sửa quy tắc' : 'Tạo quy tắc mới'}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={save}>
            Lưu quy tắc
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Tên quy tắc" htmlFor="rule-name">
          <TextInput id="rule-name" value={draft.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} />
        </Field>

        <section className="rounded-2xl bg-primary-soft/50 p-4">
          <h3 className="mb-3 text-sm font-bold">① KHI NÀO (Trigger)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Sự kiện" htmlFor="rule-trigger">
              <Select
                id="rule-trigger"
                value={t.type}
                onChange={(e) => set({ trigger: defaultTrigger(e.target.value as RuleTrigger['type']) })}
              >
                {Object.entries(TRIGGER_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            {t.type === 'gift' && (
              <>
                <Field label="Loại quà" htmlFor="rule-gift">
                  <Select id="rule-gift" value={t.giftId} onChange={(e) => set({ trigger: { ...t, giftId: e.target.value } })}>
                    <option value="*">Bất kỳ quà nào</option>
                    {MOCK_GIFTS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.emoji} {g.name} ({g.diamonds} 💎)
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Số lượng tối thiểu" htmlFor="rule-min">
                  <TextInput
                    id="rule-min"
                    type="number"
                    min={1}
                    max={10000}
                    value={t.minCount}
                    onChange={(e) => set({ trigger: { ...t, minCount: clampInt(e.target.value, 1, 10000) } })}
                  />
                </Field>
              </>
            )}
            {t.type === 'like' && (
              <Field label="Số tim tối thiểu" htmlFor="rule-like">
                <TextInput
                  id="rule-like"
                  type="number"
                  min={1}
                  value={t.minCount}
                  onChange={(e) => set({ trigger: { ...t, minCount: clampInt(e.target.value, 1, 1_000_000) } })}
                />
              </Field>
            )}
            {t.type === 'comment' && (
              <div className="sm:col-span-2">
                <Field label="Từ khoá (để trống = mọi bình luận)" htmlFor="rule-kw">
                  <TextInput
                    id="rule-kw"
                    value={t.keyword}
                    maxLength={100}
                    onChange={(e) => set({ trigger: { ...t, keyword: e.target.value } })}
                  />
                </Field>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            Danh sách quà hiện là dữ liệu mẫu. Danh sách quà thật sẽ lấy từ nguồn sự kiện ở giai đoạn 4.
          </p>
        </section>

        <section className="rounded-2xl bg-yellow/60 p-4">
          <h3 className="mb-3 flex items-center gap-1 text-sm font-bold">
            ② ĐIỀU KIỆN (Condition) <InfoTip text="Cooldown giúp tránh hiệu ứng bị lặp liên tục khi nhiều người tặng quà cùng lúc." />
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Slider
              label="Thời gian chờ (cooldown)"
              value={draft.conditions.cooldownMs / 1000}
              min={0}
              max={60}
              step={0.5}
              onChange={(v) => setCond({ cooldownMs: Math.round(v * 1000) })}
              format={(v) => (v ? `${v} giây` : 'Không chờ')}
            />
            <Slider
              label="Xác suất kích hoạt"
              value={draft.conditions.probability}
              min={1}
              max={100}
              onChange={(v) => setCond({ probability: v })}
              format={(v) => `${v}%`}
            />
            {advanced && (
              <>
                <Slider
                  label="Cooldown theo từng người"
                  value={draft.conditions.perUserCooldownMs / 1000}
                  min={0}
                  max={300}
                  step={5}
                  onChange={(v) => setCond({ perUserCooldownMs: Math.round(v * 1000) })}
                  format={(v) => (v ? `${v} giây` : 'Không')}
                />
                <Slider
                  label="Độ ưu tiên (số nhỏ chạy trước)"
                  value={draft.priority}
                  min={0}
                  max={999}
                  onChange={(v) => set({ priority: v })}
                />
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-mint/60 p-4">
          <h3 className="mb-3 text-sm font-bold">③ THỰC HIỆN (Action)</h3>
          <ol className="flex flex-col gap-2">
            {draft.actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-surface p-3 shadow-soft">
                <span className="mb-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                  {i + 1}
                </span>
                <div className="w-44">
                  <Field label="Hành động">
                    <Select
                      aria-label={`Loại hành động ${i + 1}`}
                      value={a.kind}
                      onChange={(e) => setAction(i, defaultAction(e.target.value as RuleAction['kind'], ws.media[0]?.id))}
                    >
                      {Object.entries(ACTION_KIND_LABEL).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="min-w-[180px] flex-1">
                  {a.kind === 'playMedia' && (
                    <Field label="Media">
                      <Select
                        aria-label="Media cần phát"
                        value={a.mediaId}
                        onChange={(e) => setAction(i, { ...a, mediaId: e.target.value })}
                      >
                        <option value="">— Chọn media —</option>
                        {ws.media.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.kind === 'video' ? '🎬' : '🎵'} {m.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  {a.kind === 'showAnimation' && (
                    <Field label="Hiệu ứng">
                      <Select
                        aria-label="Kiểu hiệu ứng"
                        value={a.animation}
                        onChange={(e) => setAction(i, { ...a, animation: e.target.value as typeof a.animation })}
                      >
                        {Object.entries(ANIMATION_LABEL).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  {(a.kind === 'showName' || a.kind === 'speak') && (
                    <Field label="Nội dung — dùng {user}, {gift}, {count}">
                      <TextInput
                        aria-label="Nội dung"
                        value={a.template}
                        maxLength={a.kind === 'speak' ? 300 : 200}
                        onChange={(e) => setAction(i, { ...a, template: e.target.value })}
                      />
                    </Field>
                  )}
                  {a.kind === 'obsScene' && (
                    <Field label="Tên scene (OBS chưa kết nối — giai đoạn 4)">
                      <TextInput
                        aria-label="Tên scene"
                        value={a.sceneName}
                        maxLength={120}
                        onChange={(e) => setAction(i, { ...a, sceneName: e.target.value })}
                      />
                    </Field>
                  )}
                </div>
                <div className="mb-0.5 flex">
                  <IconButton label="Đưa lên" disabled={i === 0} onClick={() => moveAction(i, -1)}>
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton label="Đưa xuống" disabled={i === draft.actions.length - 1} onClick={() => moveAction(i, 1)}>
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton label="Xoá hành động" onClick={() => set({ actions: draft.actions.filter((_, j) => j !== i) })}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
          <Button
            className="mt-3"
            size="sm"
            icon={<Plus size={15} />}
            disabled={draft.actions.length >= 20}
            onClick={() => set({ actions: [...draft.actions, defaultAction('showName', ws.media[0]?.id)] })}
          >
            Thêm hành động
          </Button>
        </section>
      </div>
    </Modal>
  );
}

function clampInt(v: string, min: number, max: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}
