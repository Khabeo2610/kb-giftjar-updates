import { KeyRound, MonitorPlay, PanelTopOpen, Radio, UserRound } from 'lucide-react';
import { randomMockEvent } from '@kb/event-engine';
import { SCREENS } from '../../data/screens';
import { PROFILE_KIND_LABELS } from '../../data/defaults';
import { useActiveProfile, useAppStore, useWorkspace } from '../../store/appStore';
import { Badge, Button, Card, Dot, StatusBadge, Switch } from '../../components/ui/primitives';
import { InfoTip } from '../../components/ui/overlays';
import { Icon } from '../../components/ui/Icon';
import { setMockRunning, usePipeline } from '../live/livePipeline';
import { EffectsPreview } from '../live/EffectsPreview';
import { ActivityLog } from '../live/ActivityLog';
import { useMediaRuntime } from '../media/mediaRuntime';

function greeting(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

const QUICK_CARDS: Array<{ screen: (typeof SCREENS)[number]['id']; title: string; color: string }> = [
  { screen: 'media', title: 'Phát video', color: 'bg-primary-soft' },
  { screen: 'media', title: 'Âm thanh', color: 'bg-sky' },
  { screen: 'gifts', title: 'Hiệu ứng quà', color: 'bg-yellow' },
  { screen: 'games', title: 'Hũ quà', color: 'bg-mint' },
  { screen: 'npc', title: 'NPC', color: 'bg-lavender' },
  { screen: 'games', title: 'Mini-game', color: 'bg-peach' },
  { screen: 'deck', title: 'Stream Deck', color: 'bg-lavender' },
  { screen: 'obs', title: 'OBS', color: 'bg-sky' },
  { screen: 'media', title: 'Thư viện', color: 'bg-yellow' },
  { screen: 'settings', title: 'Cài đặt', color: 'bg-mint' },
];

export function DashboardScreen() {
  const name = useAppStore((s) => s.settings.displayName);
  const setScreen = useAppStore((s) => s.setScreen);
  const setMini = useAppStore((s) => s.setMiniControllerOpen);
  const profile = useActiveProfile();
  const ws = useWorkspace();
  const { mockRunning, processed, queueSize, dropped } = usePipeline();
  const voices = useMediaRuntime((s) => s.voices);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-gradient-to-r from-primary-soft via-yellow to-lavender p-6">
        <div>
          <p className="text-sm font-semibold text-muted">{greeting(new Date().getHours())} 🌸</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight">{name ? `Xin chào, ${name}!` : 'Xin chào!'}</h1>
          <p className="mt-1 text-sm text-muted">Hôm nay mình cùng làm một buổi LIVE thật dễ thương nhé.</p>
        </div>
        <Button variant="primary" size="lg" icon={<PanelTopOpen size={18} />} onClick={() => setMini(true)}>
          Mở Mini Controller
        </Button>
      </section>

      <section aria-label="Trạng thái" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Radio size={18} className="text-accent" aria-hidden /> TikTok LIVE
            <InfoTip text="Kết nối LIVE thật chỉ được bật khi có nguồn dữ liệu hợp lệ (giai đoạn 4). Hiện có thể giả lập sự kiện để thử hiệu ứng." />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Dot tone={mockRunning ? 'warning' : 'neutral'} />
            {mockRunning ? 'Đang giả lập sự kiện' : 'Chưa kết nối'}
          </div>
          <label className="mt-auto flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[13px]">
            Giả lập sự kiện (demo)
            <Switch label="Giả lập sự kiện" checked={mockRunning} onChange={(v) => setMockRunning(v, randomMockEvent)} />
          </label>
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <MonitorPlay size={18} className="text-accent" aria-hidden /> OBS Studio
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Dot tone="neutral" /> Chưa kết nối
          </div>
          <p className="mt-auto text-xs text-muted">Kết nối OBS WebSocket sẽ có ở giai đoạn 4.</p>
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <KeyRound size={18} className="text-accent" aria-hidden /> License
          </div>
          <div>
            <Badge tone="info">Bản phát triển</Badge>
          </div>
          <p className="mt-auto text-xs text-muted">Chưa kích hoạt. Hệ thống license sẽ có ở giai đoạn 6.</p>
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <UserRound size={18} className="text-accent" aria-hidden /> Profile hiện tại
          </div>
          <div className="text-sm font-semibold">{profile.name}</div>
          <div className="mt-auto flex flex-wrap gap-1.5 text-xs">
            <Badge tone="pink">{PROFILE_KIND_LABELS[profile.kind]}</Badge>
            <Badge>{ws.media.length} media</Badge>
            <Badge>{ws.rules.length} quy tắc</Badge>
          </div>
        </Card>
      </section>

      <section aria-label="Phiên LIVE" className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-4 text-base font-bold">Điều khiển nhanh</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {QUICK_CARDS.map((c) => {
              const s = SCREENS.find((x) => x.id === c.screen)!;
              return (
                <button
                  key={c.title}
                  type="button"
                  onClick={() => setScreen(c.screen)}
                  className="kb-transition flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left hover:-translate-y-0.5 hover:shadow-card"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${c.color}`}>
                    <Icon name={s.icon} size={20} />
                  </span>
                  <span className="text-sm font-semibold">{c.title}</span>
                  <StatusBadge status={s.status} />
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-bold">Phiên hiện tại</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Sự kiện đã xử lý', processed],
              ['Đang chờ', queueSize],
              ['Đã bỏ (quá tải)', dropped],
              ['Media đang phát', voices.length],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-xl font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <EffectsPreview className="h-36" />
        </Card>
      </section>

      <Card>
        <ActivityLog className="h-56" limit={30} />
      </Card>
    </div>
  );
}
