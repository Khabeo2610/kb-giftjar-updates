/** Tạo ID ngẫu nhiên đủ an toàn cho dữ liệu cục bộ (không dùng cho mục đích bảo mật). */
export function newId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}
