/**
 * Interface OBS Integration — Sprint 1 chỉ định nghĩa hợp đồng, CHƯA kết nối OBS thật.
 *
 * Bản cài đặt dự kiến dùng OBS WebSocket v5 (mặc định ws://127.0.0.1:4455).
 * Nguyên tắc: không thay đổi cài đặt OBS nếu người dùng chưa đồng ý; mật khẩu OBS lưu trong
 * Windows Credential Manager (KHÔNG lưu trong SQLite / file cấu hình).
 */

export type ObsConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting'; attempt: number }
  | { status: 'connected'; obsVersion: string }
  | { status: 'error'; message: string; retryInMs: number | null };

export interface ObsConnectionConfig {
  host: string;
  port: number;
  /** Tham chiếu tới secret trong kho bảo mật của hệ điều hành — không phải mật khẩu thật. */
  passwordRef: string | null;
}

export interface ObsScene {
  name: string;
  isCurrent: boolean;
}

export interface ObsSource {
  sceneName: string;
  sourceName: string;
  sceneItemId: number;
  enabled: boolean;
}

export interface ObsClient {
  readonly state: ObsConnectionState;
  connect(config: ObsConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  /** Đăng ký nhận thay đổi trạng thái kết nối; trả về hàm huỷ đăng ký. */
  onStateChange(listener: (state: ObsConnectionState) => void): () => void;
  listScenes(): Promise<ObsScene[]>;
  setCurrentScene(name: string): Promise<void>;
  listSources(sceneName: string): Promise<ObsSource[]>;
  setSourceEnabled(sceneName: string, sceneItemId: number, enabled: boolean): Promise<void>;
  setInputVolume(inputName: string, volumeDb: number): Promise<void>;
}

/** Bản giữ chỗ: luôn báo "chưa kết nối" — dùng tới khi có bản cài đặt thật. */
export class NotConnectedObsClient implements ObsClient {
  readonly state: ObsConnectionState = { status: 'disconnected' };
  private fail(): never {
    throw new Error('Chưa kết nối OBS. Tính năng điều khiển OBS sẽ có ở giai đoạn 4.');
  }
  async connect(): Promise<void> {
    this.fail();
  }
  async disconnect(): Promise<void> {}
  onStateChange(): () => void {
    return () => {};
  }
  async listScenes(): Promise<ObsScene[]> {
    return this.fail();
  }
  async setCurrentScene(): Promise<void> {
    this.fail();
  }
  async listSources(): Promise<ObsSource[]> {
    return this.fail();
  }
  async setSourceEnabled(): Promise<void> {
    this.fail();
  }
  async setInputVolume(): Promise<void> {
    this.fail();
  }
}
