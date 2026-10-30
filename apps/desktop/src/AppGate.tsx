import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { App } from './App';
import { defaultBackend, type StorageBackend } from './persistence/backends';
import {
  continueWithoutSaving,
  dismissPersistenceWarning,
  flushPersistence,
  startPersistence,
  usePersistence,
} from './persistence/persistence';
import { useAppStore } from './store/appStore';
import { useApplyTheme } from './lib/theme';
import { Button } from './components/ui/primitives';
import { ErrorState, LoadingState } from './components/ui/states';

/**
 * Cổng khởi động: nạp cấu hình đã lưu trước khi hiện giao diện chính.
 * Loading → (Ready | Error). Khi đóng cửa sổ desktop: ghi nốt thay đổi cuối cùng rồi mới đóng.
 */
export function AppGate({ backend }: { backend?: StorageBackend }) {
  const { phase, error, warning } = usePersistence();
  useApplyTheme();

  useEffect(() => {
    void startPersistence(backend ?? defaultBackend());
  }, [backend]);

  // Thông báo (ví dụ: đã chuyển dữ liệu cũ / DB hỏng đã được sao lưu) hiện một lần bằng toast.
  useEffect(() => {
    if (phase === 'ready' && warning) {
      useAppStore.getState().notify({ tone: 'warning', message: warning });
      dismissPersistenceWarning();
    }
  }, [phase, warning]);

  useEffect(() => {
    const onUnload = () => void flushPersistence();
    window.addEventListener('beforeunload', onUnload);
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
        unlisten = await getCurrentWindow().onCloseRequested(async () => {
          // Handler được chờ xong rồi cửa sổ mới đóng.
          await flushPersistence();
        });
      });
    }
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      unlisten?.();
    };
  }, []);

  if (phase === 'ready') return <App />;

  return (
    <div className="flex h-full items-center justify-center bg-bg p-6 text-ink">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/kb-logo.svg" alt="" className="h-12 w-12" />
          <div>
            <div className="text-lg font-extrabold">KB Studio Pro</div>
            <div className="text-xs text-muted">Sweet Pastel Edition</div>
          </div>
        </div>
        {phase === 'error' ? (
          <ErrorState
            title="Chưa mở được dữ liệu cấu hình"
            message={
              <>
                <p>{error}</p>
                <p className="mt-2">
                  Dữ liệu của bạn chưa bị thay đổi. Hãy thử lại, hoặc mở tạm với cấu hình mặc định (mọi thay đổi sẽ không được lưu).
                </p>
              </>
            }
            actions={
              <>
                <Button variant="primary" onClick={() => void startPersistence(backend ?? defaultBackend())}>
                  Thử lại
                </Button>
                <Button onClick={continueWithoutSaving}>Mở tạm, không lưu</Button>
              </>
            }
          />
        ) : (
          <LoadingState title="Đang mở dữ liệu của bạn…">Chỉ mất một chút thôi 🌸</LoadingState>
        )}
      </div>
    </div>
  );
}
