import { beforeEach, describe, expect, it } from 'vitest';
import { defaultDeck, defaultWorkspace, DEFAULT_PROFILE } from '../data/defaults';
import { resetAppStore, useAppStore, validatePersisted } from '../store/appStore';
import { buildProfileExport, parseProfileImport, safeFileName } from '../lib/profileIO';
import { workspaceSchema } from '../lib/schemas';
import { checkMediaFile, describeMediaError, formatDuration, pickNext, volumeAt } from '../features/media/envelope';
import { hotkeyFromEvent, isAssignableHotkey } from '../lib/hotkeys';
import { pruneOrphanButtons, resizeDeck, swapSlots } from '../features/deck/deckLayout';
import { validateRule, emptyRule } from '../features/gifts/RuleEditor';
import { validateDeckButton } from '../features/deck/DeckButtonEditor';

beforeEach(() => resetAppStore());

describe('Store: hoàn tác / làm lại', () => {
  it('commit ghi lịch sử, undo/redo khôi phục đúng', () => {
    const before = useAppStore.getState().workspaces[DEFAULT_PROFILE.id]!.rules.length;
    useAppStore.getState().commit('Xoá hết quy tắc', (w) => {
      w.rules = [];
    });
    expect(useAppStore.getState().workspaces[DEFAULT_PROFILE.id]!.rules).toHaveLength(0);
    expect(useAppStore.getState().undo()).toBe('Xoá hết quy tắc');
    expect(useAppStore.getState().workspaces[DEFAULT_PROFILE.id]!.rules).toHaveLength(before);
    expect(useAppStore.getState().redo()).toBe('Xoá hết quy tắc');
    expect(useAppStore.getState().workspaces[DEFAULT_PROFILE.id]!.rules).toHaveLength(0);
  });

  it('undo khi không có lịch sử trả về null', () => {
    expect(useAppStore.getState().undo()).toBeNull();
    expect(useAppStore.getState().redo()).toBeNull();
  });

  it('giới hạn lịch sử 50 bước', () => {
    for (let i = 0; i < 60; i++) useAppStore.getState().commit(`b${i}`, (w) => void w.media.pop());
    expect(useAppStore.getState().past).toHaveLength(50);
  });

  it('commit không làm thay đổi object cũ (bất biến)', () => {
    const old = useAppStore.getState().workspaces[DEFAULT_PROFILE.id]!;
    useAppStore.getState().commit('x', (w) => {
      w.media[0]!.name = 'Đổi tên';
    });
    expect(old.media[0]!.name).not.toBe('Đổi tên');
  });
});

describe('Store: profile', () => {
  it('tạo, chuyển, nhân bản và xoá profile', () => {
    const s = useAppStore.getState();
    const id = s.createProfile('PK tối', 'pk');
    expect(useAppStore.getState().activeProfileId).toBe(id);
    const copy = useAppStore.getState().duplicateProfile(id)!;
    expect(useAppStore.getState().workspaces[copy]).toEqual(useAppStore.getState().workspaces[id]);
    expect(useAppStore.getState().deleteProfile(id)).toBe(true);
    expect(useAppStore.getState().activeProfileId).not.toBe(id);
    expect(useAppStore.getState().workspaces[id]).toBeUndefined();
  });

  it('không cho xoá profile cuối cùng', () => {
    expect(useAppStore.getState().deleteProfile(DEFAULT_PROFILE.id)).toBe(false);
  });

  it('profile Tùy chỉnh bắt đầu trống', () => {
    const id = useAppStore.getState().createProfile('Trống', 'custom');
    expect(useAppStore.getState().workspaces[id]!.media).toHaveLength(0);
  });

  it('đổi profile xoá lịch sử hoàn tác', () => {
    useAppStore.getState().commit('x', () => {});
    const id = useAppStore.getState().createProfile('B', 'pk');
    useAppStore.getState().switchProfile(DEFAULT_PROFILE.id);
    expect(useAppStore.getState().past).toHaveLength(0);
    expect(id).toBeTruthy();
  });
});

describe('Kiểm tra dữ liệu đã lưu', () => {
  it('chấp nhận dữ liệu hợp lệ', () => {
    const s = useAppStore.getState();
    expect(
      validatePersisted({ settings: s.settings, profiles: s.profiles, activeProfileId: s.activeProfileId, workspaces: s.workspaces }),
    ).not.toBeNull();
  });

  it('dữ liệu bản cũ chưa có sidebarCollapsed vẫn hợp lệ (nhận mặc định)', () => {
    const s = useAppStore.getState();
    const { sidebarCollapsed: _omit, ...oldSettings } = s.settings;
    const v = validatePersisted({
      settings: oldSettings,
      profiles: s.profiles,
      activeProfileId: s.activeProfileId,
      workspaces: s.workspaces,
    });
    expect(v?.settings.sidebarCollapsed).toBe(false);
  });

  it('từ chối dữ liệu hỏng', () => {
    expect(validatePersisted({ settings: {}, profiles: [] })).toBeNull();
    const s = useAppStore.getState();
    expect(
      validatePersisted({ settings: s.settings, profiles: s.profiles, activeProfileId: 'khong-ton-tai', workspaces: s.workspaces }),
    ).toBeNull();
  });

  it('dữ liệu mặc định của mọi loại profile đều hợp lệ', () => {
    for (const k of ['idol-female', 'idol-male', 'pk', 'entertainment', 'sales', 'custom'] as const) {
      expect(workspaceSchema.safeParse(defaultWorkspace(k)).success).toBe(true);
    }
  });
});

describe('Xuất / nhập profile', () => {
  const ws = defaultWorkspace();
  const exp = () => JSON.stringify(buildProfileExport(DEFAULT_PROFILE, ws, new Date('2026-10-30T00:00:00Z')));

  it('xuất rồi nhập lại thành công', () => {
    const text = exp();
    const res = parseProfileImport(text, text.length);
    expect(res.ok).toBe(true);
  });

  it('nhập vào sẽ tạo profile mới, không ghi đè', () => {
    const res = parseProfileImport(exp(), 100);
    if (!res.ok) throw new Error(res.error);
    const id = useAppStore.getState().importProfile(res.data);
    expect(id).not.toBe(DEFAULT_PROFILE.id);
    expect(useAppStore.getState().profiles).toHaveLength(2);
  });

  it('từ chối JSON hỏng, sai định dạng, file quá lớn', () => {
    expect(parseProfileImport('{abc', 4)).toMatchObject({ ok: false, error: expect.stringContaining('JSON') });
    expect(parseProfileImport('{"format":"other"}', 10)).toMatchObject({ ok: false });
    expect(parseProfileImport(exp(), 6 * 1024 * 1024)).toMatchObject({ ok: false, error: expect.stringContaining('5 MB') });
  });

  it('chặn tên file chứa đường dẫn (path traversal)', () => {
    const bad = buildProfileExport(DEFAULT_PROFILE, {
      ...ws,
      media: [{ ...ws.media[0]!, fileName: '..\\..\\Windows\\system32\\evil.mp3', isSample: false }],
    });
    const text = JSON.stringify(bad);
    const res = parseProfileImport(text, text.length);
    expect(res.ok).toBe(false);
  });

  it('chặn icon không nằm trong danh sách ký tự cho phép', () => {
    const deck = defaultDeck();
    const firstId = Object.keys(deck.buttons)[0]!;
    deck.buttons[firstId]!.icon = '<img src=x onerror=alert(1)>';
    const text = JSON.stringify(buildProfileExport(DEFAULT_PROFILE, { ...ws, deck }));
    expect(parseProfileImport(text, text.length).ok).toBe(false);
  });

  it('tạo tên file an toàn, bỏ dấu tiếng Việt', () => {
    expect(safeFileName('Idol nữ — PK tối/../x')).toBe('Idol-nu-PK-toi-x.kbprofile.json');
  });
});

describe('Media', () => {
  const item = { volume: 1, fadeInMs: 1000, fadeOutMs: 1000, startSec: 0, endSec: null };

  it('volumeAt áp dụng fade-in / fade-out và âm lượng tổng', () => {
    expect(volumeAt(0, item, 10, 1)).toBe(0);
    expect(volumeAt(0.5, item, 10, 1)).toBeCloseTo(0.5);
    expect(volumeAt(5, item, 10, 0.5)).toBeCloseTo(0.5);
    expect(volumeAt(9.5, item, 10, 1)).toBeCloseTo(0.5);
    expect(volumeAt(11, item, 10, 1)).toBe(0);
  });

  it('volumeAt tôn trọng đoạn cắt', () => {
    const cut = { ...item, fadeInMs: 0, fadeOutMs: 0, startSec: 2, endSec: 4 };
    expect(volumeAt(1, cut, 10, 1)).toBe(0);
    expect(volumeAt(3, cut, 10, 1)).toBe(1);
    expect(volumeAt(5, cut, 10, 1)).toBe(0);
  });

  it('checkMediaFile nhận diện loại file và từ chối file lạ', () => {
    expect(checkMediaFile('cam on.mp3', '', 100)).toEqual({ ok: true, kind: 'audio', baseName: 'cam on' });
    expect(checkMediaFile('clip.MP4', 'video/mp4', 100)).toMatchObject({ ok: true, kind: 'video' });
    expect(checkMediaFile('virus.exe', 'application/x-msdownload', 100).ok).toBe(false);
    expect(checkMediaFile('rong.mp3', 'audio/mpeg', 0).ok).toBe(false);
  });

  it('thông báo lỗi codec bằng tiếng Việt', () => {
    expect(describeMediaError(4, 'a.mkv')).toContain('codec');
  });

  it('pickNext tuần tự quay vòng và ngẫu nhiên không lặp bài vừa phát', () => {
    expect(pickNext(['a', 'b', 'c'], 'c', 'sequential')).toBe('a');
    expect(pickNext(['a', 'b'], 'a', 'random', () => 0)).toBe('b');
    expect(pickNext([], null, 'random')).toBeNull();
  });

  it('formatDuration', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(null)).toBe('--:--');
  });
});

describe('Phím tắt', () => {
  const ev = (key: string, code: string, mods: Partial<KeyboardEvent> = {}) =>
    ({ key, code, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...mods }) as KeyboardEvent;

  it('chuẩn hoá tổ hợp phím', () => {
    expect(hotkeyFromEvent(ev('1', 'Digit1', { ctrlKey: true }))).toBe('Ctrl+1');
    expect(hotkeyFromEvent(ev('F2', 'F2'))).toBe('F2');
    expect(hotkeyFromEvent(ev('K', 'KeyK', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+K');
    expect(hotkeyFromEvent(ev('Control', 'ControlLeft', { ctrlKey: true }))).toBeNull();
  });

  it('chỉ cho gán phím an toàn', () => {
    expect(isAssignableHotkey('Ctrl+1')).toBe(true);
    expect(isAssignableHotkey('F5')).toBe(true);
    expect(isAssignableHotkey('A')).toBe(false);
    expect(isAssignableHotkey('Shift+A')).toBe(false);
    expect(isAssignableHotkey('Ctrl+Z')).toBe(false);
  });
});

describe('Stream Deck layout', () => {
  it('đổi lưới giữ vị trí nút còn vừa', () => {
    const d = defaultDeck();
    const r = resizeDeck(d, 4, 4)!;
    expect(r.pages[0]!.slots).toHaveLength(16);
    expect(r.pages[0]!.slots[0]).toBe(d.pages[0]!.slots[0]);
  });

  it('từ chối lưới quá nhỏ', () => {
    expect(resizeDeck(defaultDeck(), 1, 2)).toBeNull();
  });

  it('dồn nút bị cắt vào ô trống', () => {
    const d = defaultDeck(); // 3x4, 8 nút ở 2 hàng đầu
    const r = resizeDeck(d, 4, 2)!;
    expect(r.pages[0]!.slots.filter(Boolean)).toHaveLength(8);
  });

  it('kéo thả đổi chỗ 2 ô', () => {
    const d = defaultDeck();
    const r = swapSlots(d, 'p_main', 0, 11);
    expect(r.pages[0]!.slots[11]).toBe(d.pages[0]!.slots[0]);
    expect(r.pages[0]!.slots[0]).toBeNull();
  });

  it('dọn nút mồ côi', () => {
    const d = defaultDeck();
    d.pages[0]!.slots = d.pages[0]!.slots.map(() => null);
    expect(Object.keys(pruneOrphanButtons(d).buttons)).toHaveLength(0);
  });
});

describe('Kiểm tra form', () => {
  it('validateRule', () => {
    const r = emptyRule(0);
    expect(validateRule(r, [])).toBeNull();
    expect(validateRule({ ...r, name: ' ' }, [])).toContain('tên');
    expect(validateRule({ ...r, actions: [] }, [])).toContain('hành động');
    expect(validateRule({ ...r, actions: [{ kind: 'playMedia', mediaId: 'x' }] }, [])).toContain('media');
  });

  it('validateDeckButton kiểm tra cả bước macro', () => {
    const b = {
      id: 'b',
      label: 'A',
      icon: 'Heart',
      color: 'pink' as const,
      hotkey: null,
      action: { kind: 'macro' as const, steps: [{ action: { kind: 'playMedia' as const, mediaId: 'missing' }, delayMs: 0 }] },
    };
    expect(validateDeckButton(b, [], [])).toContain('media');
    expect(validateDeckButton({ ...b, action: { kind: 'stopAllMedia' } }, [], [])).toBeNull();
  });
});
