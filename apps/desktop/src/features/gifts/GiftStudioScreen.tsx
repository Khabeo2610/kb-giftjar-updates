import { confirmAction } from '../../components/ui/ConfirmDialog';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, FlaskConical, Pencil, Plus, Send, Trash2, Zap } from 'lucide-react';
import type { GiftRule } from '@kb/shared-types';
import { MOCK_GIFTS, createTestEvent, randomMockEvent, sortByPriority } from '@kb/event-engine';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { screenById } from '../../data/screens';
import { Badge, Button, Card, EmptyState, Field, IconButton, PageHeader, Select, Switch, TextInput } from '../../components/ui/primitives';
import { InfoTip } from '../../components/ui/overlays';
import { newId } from '../../lib/id';
import { cx } from '../../lib/cx';
import { dispatchLiveEvent, previewRule, setMockRunning, usePipeline } from '../live/livePipeline';
import { EffectsPreview } from '../live/EffectsPreview';
import { ActivityLog } from '../live/ActivityLog';
import { RuleEditor, emptyRule } from './RuleEditor';
import { describeAction, describeConditions, describeTrigger } from './ruleText';

export function GiftStudioScreen() {
  const ws = useWorkspace();
  const commit = useAppStore((s) => s.commit);
  const notify = useAppStore((s) => s.notify);
  const [editing, setEditing] = useState<GiftRule | null>(null);
  const [testGift, setTestGift] = useState('rose');
  const [testCount, setTestCount] = useState(1);
  const [testUser, setTestUser] = useState('Bông Gòn');
  const { queueSize, queueCapacity, processed, dropped, mockRunning } = usePipeline();
  const rules = sortByPriority(ws.rules);
  const screen = screenById('gifts');

  const saveRule = (r: GiftRule) => {
    const isNew = !r.id;
    commit(isNew ? `Tạo quy tắc "${r.name}"` : `Sửa quy tắc "${r.name}"`, (w) => {
      if (isNew) w.rules.push({ ...r, id: newId('r') });
      else w.rules = w.rules.map((x) => (x.id === r.id ? r : x));
    });
    setEditing(null);
    notify({ tone: 'success', message: isNew ? 'Đã tạo quy tắc mới.' : 'Đã lưu quy tắc.', undoable: true });
  };

  /** Đổi chỗ với quy tắc liền kề rồi đánh số lại priority theo thứ tự hiển thị. */
  const move = (id: string, d: -1 | 1) => {
    const order = rules.map((r) => r.id);
    const i = order.indexOf(id);
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j]!, order[i]!];
    commit('Đổi thứ tự ưu tiên', (w) => {
      w.rules.forEach((r) => {
        r.priority = order.indexOf(r.id) * 10;
      });
    });
  };

  const sendTest = (burst = 1) => {
    for (let k = 0; k < burst; k++) {
      const ev =
        burst > 1
          ? randomGiftEvent()
          : createTestEvent('gift', { giftId: testGift, count: testCount, nickname: testUser.trim() || 'Người xem thử' });
      dispatchLiveEvent(ev);
    }
  };

  return (
    <div>
      <PageHeader
        title={screen.label}
        description={screen.description}
        status={screen.status}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing(emptyRule(ws.rules.length * 10))}>
            Quy tắc mới
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-3">
          {rules.length === 0 && (
            <EmptyState
              icon={<Zap size={26} />}
              title="Chưa có quy tắc nào"
              action={
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing(emptyRule(0))}>
                  Tạo quy tắc đầu tiên
                </Button>
              }
            >
              Ví dụ: Khi nhận Hoa hồng → chờ 3 giây giữa 2 lần → phát âm thanh cảm ơn và hiện tên người tặng.
            </EmptyState>
          )}
          {rules.map((r, idx) => (
            <Card key={r.id} className={cx('p-4', !r.enabled && 'opacity-60')}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-2 text-xs font-bold text-muted"
                  title="Thứ tự ưu tiên"
                >
                  #{idx + 1}
                </span>
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold">{r.name}</h3>
                <Switch
                  label={r.enabled ? `Tắt quy tắc ${r.name}` : `Bật quy tắc ${r.name}`}
                  checked={r.enabled}
                  onChange={(v) =>
                    commit(v ? `Bật "${r.name}"` : `Tắt "${r.name}"`, (w) => {
                      const x = w.rules.find((y) => y.id === r.id);
                      if (x) x.enabled = v;
                    })
                  }
                />
                <div className="flex">
                  <IconButton label="Ưu tiên cao hơn" disabled={idx === 0} onClick={() => move(r.id, -1)}>
                    <ArrowUp size={16} />
                  </IconButton>
                  <IconButton label="Ưu tiên thấp hơn" disabled={idx === rules.length - 1} onClick={() => move(r.id, 1)}>
                    <ArrowDown size={16} />
                  </IconButton>
                  <IconButton
                    label="Nhân bản"
                    onClick={() => {
                      commit(`Nhân bản "${r.name}"`, (w) => {
                        w.rules.push({ ...structuredClone(r), id: newId('r'), name: `${r.name} (bản sao)`, priority: r.priority + 1 });
                      });
                      notify({ tone: 'success', message: 'Đã nhân bản quy tắc.', undoable: true });
                    }}
                  >
                    <Copy size={16} />
                  </IconButton>
                  <IconButton label="Sửa" onClick={() => setEditing(structuredClone(r))}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    label="Xoá"
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: 'Xoá quy tắc?',
                        message: `Quy tắc “${r.name}” sẽ bị xoá. Bạn có thể hoàn tác ngay sau đó.`,
                        confirmLabel: 'Xoá',
                        danger: true,
                      });
                      if (!ok) return;
                      commit(`Xoá quy tắc "${r.name}"`, (w) => {
                        w.rules = w.rules.filter((x) => x.id !== r.id);
                      });
                      notify({ tone: 'info', message: `Đã xoá quy tắc "${r.name}".`, undoable: true });
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
                <Button size="sm" variant="soft" icon={<FlaskConical size={15} />} onClick={() => previewRule(r)}>
                  Thử
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-[13px] md:grid-cols-3">
                <div className="rounded-xl bg-primary-soft/60 px-3 py-2">
                  <div className="text-[11px] font-bold text-muted">KHI</div>
                  {describeTrigger(r.trigger)}
                </div>
                <div className="rounded-xl bg-yellow/70 px-3 py-2">
                  <div className="text-[11px] font-bold text-muted">ĐIỀU KIỆN</div>
                  {describeConditions(r).join(' · ')}
                </div>
                <div className="rounded-xl bg-mint/70 px-3 py-2">
                  <div className="text-[11px] font-bold text-muted">THỰC HIỆN</div>
                  <ul>
                    {r.actions.map((a, i) => (
                      <li key={i} className="truncate">
                        {i + 1}. {describeAction(a, ws.media)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="flex items-center gap-1 text-base font-bold">
              Bảng thử nghiệm{' '}
              <InfoTip text="Gửi sự kiện giả lập qua đúng Rule Engine thật: có kiểm tra cooldown, xác suất, độ ưu tiên và hàng đợi." />
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Người tặng" htmlFor="test-user">
                  <TextInput id="test-user" value={testUser} maxLength={40} onChange={(e) => setTestUser(e.target.value)} />
                </Field>
              </div>
              <Field label="Quà" htmlFor="test-gift">
                <Select id="test-gift" value={testGift} onChange={(e) => setTestGift(e.target.value)}>
                  {MOCK_GIFTS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji} {g.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Số lượng" htmlFor="test-count">
                <TextInput
                  id="test-count"
                  type="number"
                  min={1}
                  max={999}
                  value={testCount}
                  onChange={(e) => setTestCount(Math.max(1, Math.min(999, Math.floor(Number(e.target.value)) || 1)))}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={<Send size={15} />} onClick={() => sendTest(1)}>
                Gửi quà thử
              </Button>
              <Button icon={<Zap size={15} />} onClick={() => sendTest(10)} title="Gửi 10 quà ngẫu nhiên cùng lúc để kiểm tra hàng đợi">
                10 quà cùng lúc
              </Button>
            </div>
            <label className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-[13px]">
              Giả lập LIVE liên tục
              <Switch label="Giả lập LIVE liên tục" checked={mockRunning} onChange={(v) => setMockRunning(v, randomMockEvent)} />
            </label>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge tone="info">
                Hàng đợi {queueSize}/{queueCapacity}
              </Badge>
              <Badge tone="success">Đã xử lý {processed}</Badge>
              {dropped > 0 && <Badge tone="warning">Đã bỏ {dropped}</Badge>}
            </div>
            <EffectsPreview className="h-44" />
          </Card>
          <Card>
            <ActivityLog className="h-72" />
          </Card>
        </aside>
      </div>

      <RuleEditor rule={editing} onClose={() => setEditing(null)} onSave={saveRule} />
    </div>
  );
}

function randomGiftEvent() {
  let ev = randomMockEvent();
  for (let i = 0; i < 20 && ev.type !== 'gift'; i++) ev = randomMockEvent();
  return ev.type === 'gift' ? { ...ev, source: 'test' as const } : createTestEvent('gift', { giftId: 'rose' });
}
