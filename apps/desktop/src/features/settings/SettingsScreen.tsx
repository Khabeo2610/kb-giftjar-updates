import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Copy,
  Download,
  Gauge,
  Info,
  KeyRound,
  Keyboard,
  MonitorPlay,
  Palette,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Video,
  Volume2,
} from 'lucide-react';
import type { ProfileKind } from '@kb/shared-types';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { useActiveProfile, useAppStore, useWorkspace, STORAGE_KEY, CORRUPT_BACKUP_KEY } from '../../store/appStore';
import { PROFILE_KIND_LABELS } from '../../data/defaults';
import { screenById } from '../../data/screens';
import { Badge, Button, Card, Field, IconButton, Kbd, PageHeader, Select, Slider, Switch, TextInput } from '../../components/ui/primitives';
import { Modal } from '../../components/ui/overlays';
import { cx } from '../../lib/cx';
import { buildProfileExport, downloadText, parseProfileImport, safeFileName } from '../../lib/profileIO';

type SectionId =
  | 'account'
  | 'appearance'
  | 'audio'
  | 'video'
  | 'obs'
  | 'tiktok'
  | 'performance'
  | 'hotkeys'
  | 'backup'
  | 'security'
  | 'license'
  | 'update'
  | 'about';

const SECTIONS: Array<{ id: SectionId; label: string; icon: ReactNode }> = [
  { id: 'account', label: 'Tài khoản', icon: <UserRound size={17} /> },
  { id: 'appearance', label: 'Giao diện', icon: <Palette size={17} /> },
  { id: 'audio', label: 'Âm thanh', icon: <Volume2 size={17} /> },
  { id: 'video', label: 'Video', icon: <Video size={17} /> },
  { id: 'obs', label: 'OBS', icon: <MonitorPlay size={17} /> },
  { id: 'tiktok', label: 'TikTok', icon: <Radio size={17} /> },
  { id: 'performance', label: 'Hiệu năng', icon: <Gauge size={17} /> },
  { id: 'hotkeys', label: 'Phím tắt', icon: <Keyboard size={17} /> },
  { id: 'backup', label: 'Profile & sao lưu', icon: <Save size={17} /> },
  { id: 'security', label: 'Bảo mật & dữ liệu', icon: <ShieldCheck size={17} /> },
  { id: 'license', label: 'License', icon: <KeyRound size={17} /> },
  { id: 'update', label: 'Cập nhật', icon: <RefreshCw size={17} /> },
  { id: 'about', label: 'Thông tin phần mềm', icon: <Info size={17} /> },
];

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 last:border-0">
      <div className="min-w-0 max-w-xl">
        <div className="text-sm font-semibold">{title}</div>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Planned({ phase, children }: { phase: number; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface-2 p-4 text-sm">
      <Badge>Dự kiến — giai đoạn {phase}</Badge>
      <div className="mt-2 text-muted">{children}</div>
    </div>
  );
}

export function SettingsScreen() {
  const [section, setSection] = useState<SectionId>('appearance');
  const screen = screenById('settings');
  return (
    <div>
      <PageHeader title={screen.label} description={screen.description} status={screen.status} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_1fr]">
        <Card className="h-fit p-2">
          <ul className="flex flex-col gap-0.5" role="tablist" aria-label="Nhóm cài đặt" aria-orientation="vertical">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === s.id}
                  onClick={() => setSection(s.id)}
                  className={cx(
                    'kb-transition flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm',
                    section === s.id ? 'bg-primary-soft font-semibold' : 'hover:bg-surface-2',
                  )}
                >
                  <span className="text-muted">{s.icon}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card role="tabpanel" aria-label={SECTIONS.find((s) => s.id === section)!.label}>
          <h2 className="mb-2 text-lg font-bold">{SECTIONS.find((s) => s.id === section)!.label}</h2>
          <SectionBody id={section} />
        </Card>
      </div>
    </div>
  );
}

function SectionBody({ id }: { id: SectionId }) {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  switch (id) {
    case 'account':
      return (
        <>
          <Row title="Tên hiển thị" desc="Dùng để chào bạn trên trang chủ. Chỉ lưu trên máy này.">
            <TextInput
              aria-label="Tên hiển thị"
              className="w-64"
              maxLength={60}
              value={settings.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
            />
          </Row>
          <Planned phase={6}>
            Đăng nhập tài khoản KB Studio để đồng bộ license. KB Studio Pro không bao giờ yêu cầu mật khẩu TikTok.
          </Planned>
        </>
      );
    case 'appearance':
      return (
        <>
          <Row title="Chủ đề màu" desc="Sáng (Sweet Pastel), Tối (Midnight Candy) hoặc theo Windows.">
            <Select
              aria-label="Chủ đề màu"
              className="w-48"
              value={settings.theme}
              onChange={(e) => update({ theme: e.target.value as typeof settings.theme })}
            >
              <option value="light">Sáng</option>
              <option value="dark">Tối</option>
              <option value="system">Theo hệ thống</option>
            </Select>
          </Row>
          <Row
            title="Giảm chuyển động"
            desc="Tắt bớt hiệu ứng chuyển động của giao diện (dành cho người nhạy cảm với chuyển động hoặc máy yếu)."
          >
            <Select
              aria-label="Giảm chuyển động"
              className="w-48"
              value={settings.reducedMotion}
              onChange={(e) => update({ reducedMotion: e.target.value as typeof settings.reducedMotion })}
            >
              <option value="system">Theo hệ thống</option>
              <option value="on">Bật</option>
              <option value="off">Tắt</option>
            </Select>
          </Row>
          <Row
            title="Chế độ hiển thị"
            desc="Cơ bản: chỉ hiện thiết lập cần thiết. Nâng cao: hiện thêm cắt đoạn, độ ưu tiên, cooldown theo người…"
          >
            <Select
              aria-label="Chế độ hiển thị"
              className="w-48"
              value={settings.uiMode}
              onChange={(e) => update({ uiMode: e.target.value as typeof settings.uiMode })}
            >
              <option value="basic">Cơ bản</option>
              <option value="advanced">Nâng cao</option>
            </Select>
          </Row>
          <Row title="Hướng dẫn lần đầu" desc="Xem lại phần giới thiệu nhanh 3 phút.">
            <Button onClick={() => update({ onboardingDone: false })}>Xem lại hướng dẫn</Button>
          </Row>
        </>
      );
    case 'audio':
      return (
        <>
          <div className="py-4">
            <Slider
              label="Âm lượng tổng"
              value={Math.round(settings.masterVolume * 100)}
              min={0}
              max={100}
              onChange={(v) => update({ masterVolume: v / 100 })}
              format={(v) => `${v}%`}
            />
            <p className="mt-1 text-xs text-muted">
              Áp dụng cho mọi âm thanh/video phát từ KB Studio (nhân với âm lượng riêng của từng file).
            </p>
          </div>
          <Planned phase={3}>Chọn thiết bị phát âm thanh riêng (ví dụ: tai nghe hoặc cáp âm thanh ảo để đưa vào OBS).</Planned>
        </>
      );
    case 'video':
      return (
        <Planned phase={3}>
          Cửa sổ phát video riêng để OBS bắt (Window Capture / Browser Source), chọn kích thước khung hình và nền trong suốt.
        </Planned>
      );
    case 'obs':
      return (
        <Planned phase={4}>
          Kết nối OBS WebSocket (mặc định 127.0.0.1:4455) có hướng dẫn từng bước. KB Studio sẽ chỉ đổi cài đặt OBS khi bạn đồng ý.
        </Planned>
      );
    case 'tiktok':
      return (
        <Planned phase={4}>
          Kết nối sự kiện TikTok LIVE thông qua Event Adapter. Chỉ dùng nguồn dữ liệu hợp lệ; KB Studio không yêu cầu mật khẩu TikTok và
          không vượt các biện pháp bảo vệ của TikTok. Hiện tại có thể dùng “Giả lập sự kiện” để thử hiệu ứng.
        </Planned>
      );
    case 'performance':
      return (
        <>
          <Row
            title="Chế độ hiệu năng thấp"
            desc="Dành cho máy vừa LIVE vừa chạy OBS: giảm số âm thanh phát chồng (4 → 2), giảm hiệu ứng đồng thời (6 → 2) và tắt chuyển động giao diện."
          >
            <Switch
              label="Chế độ hiệu năng thấp"
              checked={settings.lowPerformanceMode}
              onChange={(v) => update({ lowPerformanceMode: v })}
            />
          </Row>
          <Planned phase={7}>Theo dõi CPU/RAM của KB Studio theo thời gian thực và cảnh báo khi quá tải.</Planned>
        </>
      );
    case 'hotkeys':
      return <HotkeyList />;
    case 'backup':
      return <ProfileManager />;
    case 'security':
      return <SecurityPanel />;
    case 'license':
      return (
        <>
          <Row title="Trạng thái" desc="Bản phát triển nội bộ — chưa kích hoạt license.">
            <Badge tone="info">Bản phát triển</Badge>
          </Row>
          <Planned phase={6}>
            Kích hoạt bằng license key, license được ký số bởi máy chủ KB Studio, quản lý thiết bị và hỗ trợ chuyển máy khi thay SSD/cài lại
            Windows.
          </Planned>
        </>
      );
    case 'update':
      return <Planned phase={8}>Kiểm tra và cài bản cập nhật có chữ ký số. Bạn luôn được hỏi trước khi cập nhật.</Planned>;
    case 'about':
      return <About />;
  }
}

function HotkeyList() {
  const ws = useWorkspace();
  const items = [
    ...ws.media.filter((m) => m.hotkey).map((m) => ({ key: m.hotkey!, what: `Phát media “${m.name}”` })),
    ...Object.values(ws.deck.buttons)
      .filter((b) => b.hotkey)
      .map((b) => ({ key: b.hotkey!, what: `Nút Stream Deck “${b.label}”` })),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const app = [
    ['Ctrl+K', 'Mở tìm kiếm nhanh'],
    ['Ctrl+Z', 'Hoàn tác'],
    ['Ctrl+Y', 'Làm lại'],
    ['Esc', 'Đóng hộp thoại'],
  ];
  return (
    <div className="flex flex-col gap-4 py-2">
      <section>
        <h3 className="mb-2 text-sm font-bold">Phím tắt của profile hiện tại</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Chưa gán phím tắt nào. Gán trong phần sửa media hoặc nút Stream Deck.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {items.map((i) => (
              <li key={i.key + i.what} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{i.what}</span>
                <Kbd>{i.key}</Kbd>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-bold">Phím tắt ứng dụng</h3>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {app.map(([k, w]) => (
            <li key={k} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{w}</span>
              <Kbd>{k}</Kbd>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted">
        Hiện phím tắt hoạt động khi cửa sổ KB Studio đang được chọn. Phím tắt toàn hệ thống (khi đang ở OBS) sẽ có ở giai đoạn 3.
      </p>
    </div>
  );
}

function ProfileManager() {
  const profiles = useAppStore((s) => s.profiles);
  const workspaces = useAppStore((s) => s.workspaces);
  const active = useActiveProfile();
  const { createProfile, renameProfile, duplicateProfile, deleteProfile, importProfile, switchProfile, notify } = useAppStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<ProfileKind>('pk');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const exportProfile = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    const ws = workspaces[id];
    if (!p || !ws) return;
    downloadText(safeFileName(p.name), JSON.stringify(buildProfileExport(p, ws), null, 2));
    notify({ tone: 'success', message: `Đã xuất profile “${p.name}”. File không chứa media gốc — chỉ chứa cấu hình.` });
  };

  const onImport = async (file: File) => {
    const res = parseProfileImport(await file.text(), file.size);
    if (!res.ok) return notify({ tone: 'danger', message: res.error });
    const id = importProfile(res.data);
    switchProfile(id);
    notify({ tone: 'success', message: `Đã nhập profile “${res.data.profile.name}”. Hãy gắn lại file media nếu cần.` });
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          Tạo profile
        </Button>
        <Button icon={<Upload size={16} />} onClick={() => importRef.current?.click()}>
          Nhập profile từ file
        </Button>
        <input
          ref={importRef}
          hidden
          type="file"
          accept=".json,application/json"
          data-testid="profile-import-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
      </div>
      <ul className="flex flex-col gap-2">
        {profiles.map((p) => (
          <li
            key={p.id}
            className={cx(
              'flex flex-wrap items-center gap-3 rounded-2xl border p-3',
              p.id === active.id ? 'border-primary bg-primary-soft/40' : 'border-line',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{p.name}</div>
              <div className="mt-0.5 flex gap-1.5 text-xs">
                <Badge tone="pink">{PROFILE_KIND_LABELS[p.kind]}</Badge>
                {p.id === active.id && <Badge tone="success">Đang dùng</Badge>}
              </div>
            </div>
            {p.id !== active.id && (
              <Button size="sm" onClick={() => switchProfile(p.id)}>
                Dùng profile này
              </Button>
            )}
            <IconButton label="Đổi tên" onClick={() => setRenaming({ id: p.id, name: p.name })}>
              <Pencil size={15} />
            </IconButton>
            <IconButton
              label="Nhân bản"
              onClick={() => {
                duplicateProfile(p.id);
                notify({ tone: 'success', message: 'Đã nhân bản profile.' });
              }}
            >
              <Copy size={15} />
            </IconButton>
            <IconButton label="Xuất ra file" onClick={() => exportProfile(p.id)}>
              <Download size={15} />
            </IconButton>
            <IconButton label="Xoá profile" disabled={profiles.length <= 1} onClick={() => setConfirmDelete(p.id)}>
              <Trash2 size={15} />
            </IconButton>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Mỗi profile có thư viện media, hiệu ứng quà và Stream Deck riêng. Cấu hình được tự động lưu trên máy sau mỗi thay đổi.
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo profile mới"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                createProfile(newName || PROFILE_KIND_LABELS[newKind], newKind);
                setCreateOpen(false);
                setNewName('');
                notify({ tone: 'success', message: 'Đã tạo và chuyển sang profile mới.' });
              }}
            >
              Tạo
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Tên profile" htmlFor="pf-name">
            <TextInput
              id="pf-name"
              maxLength={60}
              placeholder="Ví dụ: PK tối thứ 7"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Field>
          <Field label="Loại profile" hint="“Tùy chỉnh” bắt đầu trống; các loại khác có sẵn dữ liệu mẫu." htmlFor="pf-kind">
            <Select id="pf-kind" value={newKind} onChange={(e) => setNewKind(e.target.value as ProfileKind)}>
              {Object.entries(PROFILE_KIND_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Đổi tên profile"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Huỷ
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (renaming) renameProfile(renaming.id, renaming.name.slice(0, 60));
                setRenaming(null);
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        {renaming && (
          <Field label="Tên mới" htmlFor="pf-rename">
            <TextInput
              id="pf-rename"
              maxLength={60}
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
            />
          </Field>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Xoá profile?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Giữ lại
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete && deleteProfile(confirmDelete)) notify({ tone: 'info', message: 'Đã xoá profile.' });
                setConfirmDelete(null);
              }}
            >
              Xoá vĩnh viễn
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Profile “{profiles.find((p) => p.id === confirmDelete)?.name}” cùng toàn bộ cấu hình của nó sẽ bị xoá và <b>không thể hoàn tác</b>
          . Bạn nên “Xuất ra file” để sao lưu trước. File media gốc trên máy không bị ảnh hưởng.
        </p>
      </Modal>
    </div>
  );
}

function SecurityPanel() {
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  return (
    <div className="flex flex-col gap-4 py-2 text-sm">
      <ul className="flex flex-col gap-2">
        {[
          'Không yêu cầu và không lưu mật khẩu TikTok.',
          'Không gửi dữ liệu ra Internet — mọi cấu hình nằm trên máy này.',
          'Dữ liệu nạp lại và file profile nhập vào đều được kiểm tra hợp lệ trước khi dùng.',
          'Macro Stream Deck chỉ chạy hành động nội bộ, không chạy lệnh hệ thống.',
          'Giao diện chạy với Content Security Policy chặn tải script lạ.',
        ].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden /> {t}
          </li>
        ))}
      </ul>
      <Row
        title="Xoá toàn bộ dữ liệu trên máy"
        desc="Xoá mọi profile, cấu hình và thiết lập của KB Studio Pro trên máy này. File media gốc không bị xoá."
      >
        <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirm(true)}>
          Xoá dữ liệu
        </Button>
      </Row>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Xoá toàn bộ dữ liệu?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              disabled={typed.trim().toUpperCase() !== 'XOA'}
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(CORRUPT_BACKUP_KEY);
                window.location.reload();
              }}
            >
              Xoá và khởi động lại
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Thao tác này <b>không thể hoàn tác</b>. Gõ <Kbd>XOA</Kbd> để xác nhận.
        </p>
        <TextInput className="mt-3" aria-label="Gõ XOA để xác nhận" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </Modal>
    </div>
  );
}

function About() {
  const [native, setNative] = useState<{ version: string; os: string; arch: string } | null>(null);
  useEffect(() => {
    if (!isTauri()) return;
    invoke<{ version: string; os: string; arch: string }>('app_info')
      .then(setNative)
      .catch(() => setNative(null));
  }, []);
  return (
    <div className="flex flex-col gap-1 py-2">
      <Row title="Sản phẩm">KB Studio Pro — Sweet Pastel Edition</Row>
      <Row title="Phiên bản giao diện">0.1.0 (giai đoạn 1–2, bản demo)</Row>
      <Row title="Môi trường">
        {native ? `Desktop · ${native.os} ${native.arch} · lõi ${native.version}` : isTauri() ? 'Desktop' : 'Trình duyệt (chế độ xem thử)'}
      </Row>
      <Row title="Chủ sở hữu">KB Studio</Row>
    </div>
  );
}
