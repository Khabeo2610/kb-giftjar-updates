import { z } from 'zod';

/**
 * Schema kiểm tra dữ liệu đầu vào (input validation) bằng zod.
 * Dùng khi: nạp cấu hình đã lưu, nhập (import) profile từ file.
 * Nguyên tắc: không tin dữ liệu từ bên ngoài — giới hạn độ dài chuỗi, số lượng phần tử, khoảng giá trị.
 */

const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_\-:.]+$/, 'ID chứa ký tự không hợp lệ');
const label = z.string().max(120);
const pastel = z.enum(['pink', 'lavender', 'mint', 'yellow', 'peach', 'sky']);
const hotkey = z.string().max(40).nullable();
const ms = z.number().int().min(0).max(600_000);

export const mediaGroupSchema = z.object({ id, name: label.min(1), color: pastel, builtIn: z.boolean() });

export const mediaItemSchema = z.object({
  id,
  name: label.min(1),
  kind: z.enum(['video', 'audio']),
  groupId: id,
  tags: z.array(z.string().max(40)).max(30),
  volume: z.number().min(0).max(1),
  fadeInMs: ms,
  fadeOutMs: ms,
  startSec: z.number().min(0).max(86_400),
  endSec: z.number().min(0).max(86_400).nullable(),
  hotkey,
  durationSec: z.number().min(0).max(86_400).nullable(),
  // Chỉ lưu TÊN file, không bao giờ chấp nhận đường dẫn (chống path traversal khi nhập cấu hình).
  fileName: z
    .string()
    .max(255)
    .refine((s) => !/[\\/]|\.\./.test(s), 'Tên file không được chứa đường dẫn')
    .nullable(),
  mimeType: z.string().max(100).nullable(),
  sizeBytes: z.number().int().min(0).nullable(),
  isSample: z.boolean(),
  addedAt: z.number().int().min(0),
});

const triggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gift'), giftId: z.string().max(64), minCount: z.number().int().min(1).max(10_000) }),
  z.object({ type: z.literal('like'), minCount: z.number().int().min(1).max(1_000_000) }),
  z.object({ type: z.literal('follow') }),
  z.object({ type: z.literal('share') }),
  z.object({ type: z.literal('join') }),
  z.object({ type: z.literal('subscribe') }),
  z.object({ type: z.literal('comment'), keyword: z.string().max(100) }),
]);

const ruleActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('playMedia'), mediaId: id }),
  z.object({
    kind: z.literal('showAnimation'),
    animation: z.enum(['hearts', 'confetti', 'sparkle', 'bounce']),
    durationMs: ms,
  }),
  z.object({ kind: z.literal('showName'), template: z.string().max(200), durationMs: ms }),
  z.object({ kind: z.literal('speak'), template: z.string().max(300) }),
  z.object({ kind: z.literal('obsScene'), sceneName: z.string().max(120) }),
]);

export const giftRuleSchema = z.object({
  id,
  name: label.min(1),
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(999),
  trigger: triggerSchema,
  conditions: z.object({
    cooldownMs: ms,
    perUserCooldownMs: ms,
    probability: z.number().min(0).max(100),
  }),
  actions: z.array(ruleActionSchema).max(20),
});

const simpleDeckAction = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('playMedia'), mediaId: id }),
  z.object({ kind: z.literal('stopAllMedia') }),
  z.object({ kind: z.literal('triggerRule'), ruleId: id }),
  z.object({ kind: z.literal('obsScene'), sceneName: z.string().max(120) }),
]);

const deckAction = z.union([
  simpleDeckAction,
  z.object({
    kind: z.literal('macro'),
    steps: z.array(z.object({ action: simpleDeckAction, delayMs: z.number().int().min(0).max(60_000) })).max(20),
  }),
]);

export const deckButtonSchema = z.object({
  id,
  label: z.string().max(40),
  icon: z
    .string()
    .max(40)
    .regex(/^[A-Za-z0-9]+$/),
  color: pastel,
  hotkey,
  action: deckAction,
});

export const deckLayoutSchema = z
  .object({
    rows: z.number().int().min(1).max(8),
    cols: z.number().int().min(1).max(10),
    pages: z
      .array(z.object({ id, name: label.min(1), slots: z.array(id.nullable()).max(80) }))
      .min(1)
      .max(20),
    buttons: z.record(id, deckButtonSchema),
  })
  .refine((d) => Object.keys(d.buttons).length <= 400, 'Quá nhiều nút');

export const workspaceSchema = z.object({
  groups: z.array(mediaGroupSchema).max(100),
  media: z.array(mediaItemSchema).max(5_000),
  rules: z.array(giftRuleSchema).max(500),
  deck: deckLayoutSchema,
});

export const profileSchema = z.object({
  id,
  name: label.min(1),
  kind: z.enum(['idol-female', 'idol-male', 'pk', 'entertainment', 'sales', 'custom']),
  createdAt: z.number().int().min(0),
});

export const settingsSchema = z.object({
  displayName: z.string().max(60),
  theme: z.enum(['light', 'dark', 'system']),
  reducedMotion: z.enum(['system', 'on', 'off']),
  uiMode: z.enum(['basic', 'advanced']),
  lowPerformanceMode: z.boolean(),
  masterVolume: z.number().min(0).max(1),
  onboardingDone: z.boolean(),
});

/** Định dạng file xuất profile (.kbprofile.json). */
export const PROFILE_EXPORT_FORMAT = 'kb-studio-profile';
export const PROFILE_EXPORT_VERSION = 1;

export const profileExportSchema = z.object({
  format: z.literal(PROFILE_EXPORT_FORMAT),
  version: z.literal(PROFILE_EXPORT_VERSION),
  exportedAt: z.string().max(40),
  profile: profileSchema,
  workspace: workspaceSchema,
});

export type ProfileExport = z.infer<typeof profileExportSchema>;

/** Kích thước tối đa file profile được phép nhập — chống file quá lớn làm treo app. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function describeZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Dữ liệu không hợp lệ.';
  const path = first.path.join(' › ');
  return path ? `Trường "${path}": ${first.message}` : first.message;
}
