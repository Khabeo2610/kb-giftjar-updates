import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, EmptyState } from '../ui/primitives';
import { CircleAlert } from 'lucide-react';

/**
 * Cách ly lỗi theo từng màn hình: một module gặp lỗi không làm sập toàn bộ ứng dụng
 * (và không ảnh hưởng media đang phát).
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[KB Studio] Lỗi giao diện:', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <EmptyState
          icon={<CircleAlert size={26} />}
          title="Màn hình này gặp sự cố"
          action={
            <Button variant="primary" onClick={() => this.setState({ error: null })}>
              Thử lại
            </Button>
          }
        >
          Đừng lo, các chức năng khác vẫn hoạt động bình thường. Nếu lỗi lặp lại, hãy gửi ảnh chụp màn hình cho KB Studio để được hỗ trợ.
        </EmptyState>
      );
    }
    return this.props.children;
  }
}
