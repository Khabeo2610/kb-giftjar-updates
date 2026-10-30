import { CloudAlert, CloudCheck, CloudOff, CloudUpload } from 'lucide-react';
import { usePersistence } from '../../persistence/persistence';
import { cx } from '../../lib/cx';

/** Chỉ báo trạng thái lưu cấu hình: đang lưu / đã lưu / lỗi / chế độ tạm không lưu. */
export function SaveIndicator() {
  const { saving, saveError, readOnly, backendKind } = usePersistence();
  const where = backendKind === 'sqlite' ? 'cơ sở dữ liệu trên máy' : 'bộ nhớ trình duyệt';
  const view = readOnly
    ? { icon: <CloudOff size={15} />, text: 'Không lưu', tone: 'text-warning', title: 'Đang mở tạm sau lỗi — thay đổi sẽ không được lưu.' }
    : saveError
      ? { icon: <CloudAlert size={15} />, text: 'Lỗi lưu', tone: 'text-danger', title: saveError }
      : saving
        ? { icon: <CloudUpload size={15} />, text: 'Đang lưu…', tone: 'text-muted', title: `Đang lưu vào ${where}` }
        : { icon: <CloudCheck size={15} />, text: 'Đã lưu', tone: 'text-muted', title: `Mọi thay đổi được tự động lưu vào ${where}` };
  return (
    <span role="status" title={view.title} className={cx('hidden items-center gap-1 text-xs whitespace-nowrap 2xl:inline-flex', view.tone)}>
      <span aria-hidden>{view.icon}</span>
      {view.text}
    </span>
  );
}
