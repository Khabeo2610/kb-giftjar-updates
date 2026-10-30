import { create } from 'zustand';
import type { ReactNode } from 'react';
import { Modal } from './overlays';
import { Button } from './primitives';

/**
 * Hộp thoại xác nhận dùng chung.
 * Gọi: `if (await confirmAction({ title, message, confirmLabel, danger: true })) { ... }`
 */

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
}

const useConfirmStore = create<ConfirmState>(() => ({ request: null }));

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // Nếu đang có hộp thoại khác thì coi như huỷ hộp cũ.
  useConfirmStore.getState().request?.resolve(false);
  return new Promise((resolve) => useConfirmStore.setState({ request: { ...options, resolve } }));
}

export function ConfirmDialogHost() {
  const request = useConfirmStore((s) => s.request);
  const close = (ok: boolean) => {
    request?.resolve(ok);
    useConfirmStore.setState({ request: null });
  };
  return (
    <Modal
      open={!!request}
      onClose={() => close(false)}
      title={request?.title ?? ''}
      footer={
        <>
          <Button variant="ghost" data-autofocus onClick={() => close(false)}>
            {request?.cancelLabel ?? 'Huỷ'}
          </Button>
          <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {request?.confirmLabel ?? 'Đồng ý'}
          </Button>
        </>
      }
    >
      <div className="text-sm">{request?.message}</div>
    </Modal>
  );
}
