import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { resetAppStore, useAppStore } from '../store/appStore';
import { resetPipeline, usePipeline } from '../features/live/livePipeline';

beforeEach(() => {
  resetAppStore();
  resetPipeline();
  // Bỏ qua hướng dẫn lần đầu cho các test màn hình.
  useAppStore.getState().updateSettings({ onboardingDone: true, displayName: 'Kha' });
});

const nav = () => screen.getByRole('navigation', { name: 'Điều hướng chính' });
/** Bấm menu rồi chờ màn hình mới hiện (có hiệu ứng chuyển cảnh nên màn mới xuất hiện sau màn cũ). */
const go = async (label: string) => {
  await userEvent.click(within(nav()).getByRole('button', { name: label }));
  const heading = label === 'Trang chủ' ? /Xin chào/ : label;
  await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 3000 });
};

describe('Giao diện', () => {
  it('hiện hướng dẫn lần đầu và lưu tên người dùng', async () => {
    useAppStore.getState().updateSettings({ onboardingDone: false, displayName: '' });
    render(<App />);
    expect(screen.getByRole('dialog', { name: 'Hướng dẫn nhanh' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Bạn muốn được gọi là gì?'), 'Kha');
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(useAppStore.getState().settings).toMatchObject({ onboardingDone: true, displayName: 'Kha' });
  });

  it('Dashboard hiển thị lời chào và trạng thái trung thực', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Xin chào, Kha!' })).toBeInTheDocument();
    expect(screen.getAllByText('Chưa kết nối').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Bản phát triển').length).toBeGreaterThan(0);
  });

  it('điều hướng tới mọi màn hình mà không lỗi', async () => {
    render(<App />);
    const labels = [
      'Video & âm thanh',
      'Hiệu ứng quà',
      'Stream Deck',
      'Cài đặt',
      'Hũ quà & Mini-game',
      'NPC Studio',
      'Đọc bình luận (TTS)',
      'Điều khiển OBS',
      'Thiết kế Overlay',
      'Trang chủ',
    ];
    for (const l of labels) {
      await go(l);
      expect(within(nav()).getByRole('button', { name: l })).toHaveAttribute('aria-current', 'page');
    }
    expect(screen.queryByText('Màn hình này gặp sự cố')).not.toBeInTheDocument();
  });

  it('module chưa làm hiển thị trạng thái "Dự kiến", không có nút giả', async () => {
    render(<App />);
    await go('Điều khiển OBS');
    expect(screen.getByText('Sẽ có ở giai đoạn 4')).toBeInTheDocument();
  });

  it('Gift Studio: gửi quà thử chạy qua rule engine', async () => {
    render(<App />);
    await go('Hiệu ứng quà');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi quà thử' }));
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(usePipeline.getState().processed).toBe(1);
    expect(screen.getAllByText(/Cảm ơn Hoa hồng/).length).toBeGreaterThan(0);
  });

  it('Gift Studio: tắt quy tắc rồi hoàn tác', async () => {
    render(<App />);
    await go('Hiệu ứng quà');
    await userEvent.click(screen.getByRole('switch', { name: /Tắt quy tắc Cảm ơn Hoa hồng/ }));
    expect(useAppStore.getState().workspaces.pf_default!.rules.find((r) => r.id === 'r_rose')!.enabled).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tác (Ctrl+Z)' }));
    expect(useAppStore.getState().workspaces.pf_default!.rules.find((r) => r.id === 'r_rose')!.enabled).toBe(true);
  });

  it('Gift Studio: tạo quy tắc mới qua hộp thoại', async () => {
    render(<App />);
    await go('Hiệu ứng quà');
    await userEvent.click(screen.getByRole('button', { name: 'Quy tắc mới' }));
    const dialog = screen.getByRole('dialog', { name: 'Tạo quy tắc mới' });
    const name = within(dialog).getByLabelText('Tên quy tắc');
    await userEvent.clear(name);
    await userEvent.type(name, 'Cảm ơn Donut');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu quy tắc' }));
    expect(useAppStore.getState().workspaces.pf_default!.rules.some((r) => r.name === 'Cảm ơn Donut')).toBe(true);
  });

  it('Stream Deck: bấm nút "Dừng tất cả" ghi nhật ký', async () => {
    render(<App />);
    await go('Stream Deck');
    await userEvent.click(screen.getByRole('button', { name: /Dừng tất cả/ }));
    expect(usePipeline.getState().log[0]?.text).toContain('Đã dừng tất cả');
  });

  it('Stream Deck: chế độ chỉnh sửa mở hộp thoại sửa nút', async () => {
    render(<App />);
    await go('Stream Deck');
    await userEvent.click(screen.getByRole('switch', { name: 'Chế độ chỉnh sửa' }));
    await userEvent.click(screen.getByRole('button', { name: /^Cảm ơn/ }));
    expect(screen.getByRole('dialog', { name: 'Sửa nút' })).toBeInTheDocument();
  });

  it('Media Center: lọc theo tìm kiếm và từ chối file không phải media', async () => {
    render(<App />);
    await go('Video & âm thanh');
    await userEvent.type(screen.getByLabelText('Tìm media'), 'pk');
    const list = screen.getByRole('list', { name: 'Danh sách media' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    const input = screen.getByTestId('media-file-input');
    fireEvent.change(input, { target: { files: [new File(['x'], 'tai-lieu.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText(/không phải file âm thanh\/video/)).toBeInTheDocument();
  });

  it('Media Center: phát media mẫu chưa có file báo hướng dẫn rõ ràng', async () => {
    render(<App />);
    await go('Video & âm thanh');
    await userEvent.click(screen.getByRole('button', { name: 'Phát Cảm ơn bạn yêu' }));
    expect(await screen.findByText(/là media mẫu, chưa có file/)).toBeInTheDocument();
  });

  it('Cài đặt: đổi chủ đề tối được áp dụng', async () => {
    render(<App />);
    await go('Cài đặt');
    await userEvent.selectOptions(screen.getByLabelText('Chủ đề màu'), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('Cài đặt: nhập file profile không hợp lệ báo lỗi tiếng Việt', async () => {
    render(<App />);
    await go('Cài đặt');
    await userEvent.click(screen.getByRole('tab', { name: /Profile & sao lưu/ }));
    const input = screen.getByTestId('profile-import-input');
    fireEvent.change(input, { target: { files: [new File(['{"format":"x"}'], 'a.json', { type: 'application/json' })] } });
    expect(await screen.findByText(/không phải file profile/)).toBeInTheDocument();
  });

  it('tìm kiếm không dấu vẫn ra kết quả có dấu', async () => {
    render(<App />);
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.type(screen.getByLabelText('Từ khoá tìm kiếm'), 'hieu ung qua');
    expect(within(screen.getByRole('listbox')).getAllByText('Hiệu ứng quà').length).toBeGreaterThan(0);
  });
});
