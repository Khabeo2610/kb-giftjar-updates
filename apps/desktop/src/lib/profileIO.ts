import type { Profile } from '@kb/shared-types';
import type { Workspace } from '../data/defaults';
import {
  MAX_IMPORT_BYTES,
  PROFILE_EXPORT_FORMAT,
  PROFILE_EXPORT_VERSION,
  describeZodError,
  profileExportSchema,
  type ProfileExport,
} from './schemas';

/** Tạo nội dung file xuất profile. Không chứa đường dẫn file trên máy, không chứa secret. */
export function buildProfileExport(profile: Profile, workspace: Workspace, now = new Date()): ProfileExport {
  return {
    format: PROFILE_EXPORT_FORMAT,
    version: PROFILE_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    profile,
    workspace,
  };
}

export type ParseResult = { ok: true; data: ProfileExport } | { ok: false; error: string };

/** Đọc và kiểm tra file profile do người dùng chọn. */
export function parseProfileImport(text: string, sizeBytes: number): ParseResult {
  if (sizeBytes > MAX_IMPORT_BYTES) return { ok: false, error: 'File quá lớn (tối đa 5 MB).' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File không đúng định dạng JSON.' };
  }
  if (typeof json !== 'object' || json === null || (json as { format?: unknown }).format !== PROFILE_EXPORT_FORMAT) {
    return { ok: false, error: 'Đây không phải file profile của KB Studio Pro.' };
  }
  const parsed = profileExportSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: `File profile không hợp lệ. ${describeZodError(parsed.error)}` };
  return { ok: true, data: parsed.data };
}

export function safeFileName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'profile'}.kbprofile.json`;
}

export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
