import type { ModuleStatus } from '@kb/shared-types';

export type ScreenId = 'dashboard' | 'media' | 'gifts' | 'deck' | 'games' | 'npc' | 'tts' | 'obs' | 'overlay' | 'settings';

export interface ScreenInfo {
  id: ScreenId;
  label: string;
  description: string;
  icon: string;
  status: ModuleStatus;
  /** Giai đoạn dự kiến hoàn thiện. */
  phase: number;
  keywords: string[];
}

/**
 * Danh sách màn hình và TRẠNG THÁI THẬT của từng module.
 * Không đánh dấu "implemented" cho module chưa có logic thật.
 */
export const SCREENS: ScreenInfo[] = [
  {
    id: 'dashboard',
    label: 'Trang chủ',
    description: 'Tổng quan trạng thái LIVE, OBS, license và lối tắt nhanh.',
    icon: 'House',
    status: 'demo',
    phase: 2,
    keywords: ['dashboard', 'tổng quan', 'home'],
  },
  {
    id: 'media',
    label: 'Video & âm thanh',
    description: 'Thư viện media: thêm file, nhóm, tag, xem thử, âm lượng, fade, cắt đoạn.',
    icon: 'Clapperboard',
    status: 'demo',
    phase: 3,
    keywords: ['media', 'video', 'âm thanh', 'audio', 'nhạc', 'playlist', 'thư viện'],
  },
  {
    id: 'gifts',
    label: 'Hiệu ứng quà',
    description: 'Quy tắc Khi nhận quà → Kiểm tra điều kiện → Thực hiện hành động.',
    icon: 'Gift',
    status: 'demo',
    phase: 4,
    keywords: ['quà', 'gift', 'quy tắc', 'rule', 'hiệu ứng', 'cooldown'],
  },
  {
    id: 'deck',
    label: 'Stream Deck',
    description: 'Bảng nút bấm lớn để điều khiển nhanh khi đang LIVE.',
    icon: 'LayoutGrid',
    status: 'demo',
    phase: 2,
    keywords: ['stream deck', 'nút', 'phím tắt', 'macro', 'hotkey'],
  },
  {
    id: 'games',
    label: 'Hũ quà & Mini-game',
    description: 'Hũ quà, vòng quay, đua NPC, thanh mục tiêu, bảng xếp hạng.',
    icon: 'Gamepad2',
    status: 'planned',
    phase: 5,
    keywords: ['hũ quà', 'gift jar', 'mini game', 'vòng quay', 'pk', 'bảng xếp hạng'],
  },
  {
    id: 'npc',
    label: 'NPC Studio',
    description: 'Nhân vật ảo xuất hiện, nhảy múa và phản ứng với quà.',
    icon: 'Bot',
    status: 'planned',
    phase: 5,
    keywords: ['npc', 'nhân vật', 'avatar'],
  },
  {
    id: 'tts',
    label: 'Đọc bình luận (TTS)',
    description: 'Đọc bình luận, tên người tặng quà, lọc từ cấm và spam.',
    icon: 'MessageCircleHeart',
    status: 'planned',
    phase: 4,
    keywords: ['tts', 'đọc', 'giọng nói', 'chat', 'bình luận'],
  },
  {
    id: 'obs',
    label: 'Điều khiển OBS',
    description: 'Kết nối OBS WebSocket, đổi scene, bật/tắt source.',
    icon: 'MonitorPlay',
    status: 'planned',
    phase: 4,
    keywords: ['obs', 'scene', 'source', 'websocket'],
  },
  {
    id: 'overlay',
    label: 'Thiết kế Overlay',
    description: 'Canvas 1080×1920 / 1920×1080, tạo Browser Source cho OBS.',
    icon: 'Layers',
    status: 'planned',
    phase: 4,
    keywords: ['overlay', 'browser source', 'canvas', 'layer'],
  },
  {
    id: 'settings',
    label: 'Cài đặt',
    description: 'Giao diện, hiệu năng, profile, sao lưu và thông tin phần mềm.',
    icon: 'Settings',
    status: 'demo',
    phase: 2,
    keywords: ['cài đặt', 'settings', 'giao diện', 'dark mode', 'sao lưu', 'profile', 'license'],
  },
];

export const screenById = (id: ScreenId): ScreenInfo => SCREENS.find((s) => s.id === id)!;

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  planned: 'Dự kiến',
  'in-progress': 'Đang làm',
  demo: 'Bản demo',
  implemented: 'Đã có',
  tested: 'Đã kiểm thử',
  'production-ready': 'Sẵn sàng',
};
