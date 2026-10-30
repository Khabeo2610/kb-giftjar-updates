import { Construction } from 'lucide-react';
import type { ScreenId } from '../../data/screens';
import { screenById } from '../../data/screens';
import { EmptyState, PageHeader } from '../../components/ui/primitives';
import { useAppStore } from '../../store/appStore';
import { Button } from '../../components/ui/primitives';

const PLANS: Partial<Record<ScreenId, string[]>> = {
  games: [
    'Hũ quà',
    'Vòng quay',
    'Thả bóng',
    'Đua NPC',
    'Trộm quà',
    'Mưa trái tim',
    'Thanh mục tiêu',
    'PK Battle',
    'Bảng xếp hạng',
    'Điểm người xem',
  ],
  npc: [
    'Xuất hiện / di chuyển / nhảy / ăn mừng',
    'Phản ứng với quà',
    'Hiện tên, avatar, lời thoại',
    'State machine animation',
    'Giới hạn số nhân vật đồng thời',
  ],
  tts: [
    'Đọc bình luận & tên người tặng',
    'Chọn giọng, tốc độ, âm lượng',
    'Lọc từ cấm & spam',
    'Cooldown, hàng đợi, ưu tiên',
    'Từ điển phát âm tiếng Việt',
  ],
  obs: [
    'Kết nối OBS WebSocket',
    'Đổi scene, bật/tắt source',
    'Điều chỉnh âm thanh & media source',
    'Lưu profile OBS',
    'Hướng dẫn kết nối tự động/thủ công',
  ],
  overlay: [
    'Canvas 1080×1920 / 1920×1080 / tuỳ chỉnh',
    'Text, ảnh, video, avatar, leaderboard',
    'Layer, căn chỉnh, khoá lớp',
    'Lưu preset',
    'Browser Source cho OBS',
  ],
};

/** Màn hình cho module chưa làm — hiển thị trung thực trạng thái "Dự kiến", không có nút giả. */
export function PlannedScreen({ id }: { id: ScreenId }) {
  const s = screenById(id);
  const setScreen = useAppStore((st) => st.setScreen);
  return (
    <div>
      <PageHeader title={s.label} description={s.description} status={s.status} />
      <EmptyState
        icon={<Construction size={26} />}
        title={`Sẽ có ở giai đoạn ${s.phase}`}
        action={<Button onClick={() => setScreen('dashboard')}>Về trang chủ</Button>}
      >
        <p>Module này đang được lên kế hoạch. Các chức năng dự kiến:</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {(PLANS[id] ?? []).map((f) => (
            <li key={f} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink shadow-soft">
              {f}
            </li>
          ))}
        </ul>
      </EmptyState>
    </div>
  );
}
