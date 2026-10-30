import { useState } from 'react';
import { Clapperboard, Gift, LayoutGrid, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Modal } from '../ui/overlays';
import { Button, Field, TextInput } from '../ui/primitives';
import { cx } from '../../lib/cx';

const STEPS = [
  {
    icon: <Sparkles size={28} />,
    title: 'Chào mừng tới KB Studio Pro!',
    body: 'Trung tâm điều khiển LIVE dễ thương của bạn. Chỉ mất khoảng 3 phút để làm quen các chức năng cơ bản.',
  },
  {
    icon: <Clapperboard size={28} />,
    title: '1. Thêm video & âm thanh',
    body: 'Vào "Video & âm thanh", kéo thả file vào thư viện. Mỗi file có thể đặt phím tắt, âm lượng và hiệu ứng fade.',
  },
  {
    icon: <Gift size={28} />,
    title: '2. Tạo hiệu ứng quà',
    body: 'Trong "Hiệu ứng quà", mỗi quy tắc là: Khi nhận quà → Kiểm tra điều kiện → Thực hiện hành động. Bấm "Thử" để xem trước.',
  },
  {
    icon: <LayoutGrid size={28} />,
    title: '3. Điều khiển bằng Stream Deck',
    body: 'Gom các thao tác hay dùng thành nút lớn. Mở "Mini Controller" để bấm nhanh khi đang LIVE.',
  },
];

export function Onboarding() {
  const done = useAppStore((s) => s.settings.onboardingDone);
  const currentName = useAppStore((s) => s.settings.displayName);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(currentName);
  const last = step === STEPS.length - 1;
  const s = STEPS[step]!;

  const finish = () => updateSettings({ onboardingDone: true, displayName: name.trim().slice(0, 60) });

  return (
    <Modal
      open={!done}
      onClose={finish}
      title="Hướng dẫn nhanh"
      footer={
        <>
          <Button variant="ghost" onClick={finish}>
            Bỏ qua
          </Button>
          {step > 0 && <Button onClick={() => setStep(step - 1)}>Quay lại</Button>}
          <Button variant="primary" data-autofocus onClick={() => (last ? finish() : setStep(step + 1))}>
            {last ? 'Bắt đầu thôi!' : 'Tiếp theo'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-soft to-lavender text-accent">
          {s.icon}
        </div>
        <h3 className="text-lg font-bold">{s.title}</h3>
        <p className="max-w-sm text-sm text-muted">{s.body}</p>
        {step === 0 && (
          <div className="mt-2 w-full max-w-xs text-left">
            <Field label="Bạn muốn được gọi là gì?" htmlFor="onb-name">
              <TextInput id="onb-name" placeholder="Ví dụ: Kha" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="mt-2 flex gap-1.5" aria-label={`Bước ${step + 1}/${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span key={i} className={cx('h-2 rounded-full kb-transition', i === step ? 'w-6 bg-primary' : 'w-2 bg-line-strong')} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
