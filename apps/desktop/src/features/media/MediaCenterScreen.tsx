import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderPlus, Link2, ListMusic, Music, Pencil, Play, Plus, Search, Shuffle, Square, Trash2, Upload, Video } from 'lucide-react';
import type { MediaItem, PastelColor } from '@kb/shared-types';
import { PASTEL_COLORS, PASTEL_LABELS, PASTEL_VAR } from '@kb/ui-design-system';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { screenById } from '../../data/screens';
import { Badge, Button, Card, EmptyState, Field, IconButton, PageHeader, PastelSwatch, TextInput } from '../../components/ui/primitives';
import { InfoTip, Modal } from '../../components/ui/overlays';
import { newId } from '../../lib/id';
import { cx } from '../../lib/cx';
import { normalizeVi } from '../../components/layout/SearchPalette';
import { checkMediaFile, formatBytes, formatDuration, pickNext } from './envelope';
import { attachFile, detachFile, isPlaying, playMedia, probeDuration, stopMedia, useMediaRuntime } from './mediaRuntime';
import { MediaEditor } from './MediaEditor';

const ACCEPT = 'audio/*,video/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.mp4,.webm,.m4v,.mov';

export function MediaCenterScreen() {
  const ws = useWorkspace();
  const commit = useAppStore((s) => s.commit);
  const notify = useAppStore((s) => s.notify);
  const settings = useAppStore((s) => s.settings);
  const voices = useMediaRuntime((s) => s.voices);
  const urls = useMediaRuntime((s) => s.urls);

  const [groupId, setGroupId] = useState<string>('all');
  const [kind, setKind] = useState<'all' | 'audio' | 'video'>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [groupModal, setGroupModal] = useState<{ id: string | null; name: string; color: PastelColor } | null>(null);
  const [playlist, setPlaylist] = useState<{ mode: 'sequential' | 'random'; current: string | null } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const relinkInput = useRef<HTMLInputElement>(null);
  const relinkTarget = useRef<string | null>(null);

  const opts = { master: settings.masterVolume, lowPerformance: settings.lowPerformanceMode };

  const filtered = useMemo(() => {
    const q = normalizeVi(query);
    return ws.media.filter(
      (m) =>
        (groupId === 'all' || m.groupId === groupId) &&
        (kind === 'all' || m.kind === kind) &&
        (!q || normalizeVi(m.name).includes(q) || m.tags.some((t) => normalizeVi(t).includes(q))),
    );
  }, [ws.media, groupId, kind, query]);

  // Playlist: khi bài hiện tại phát xong thì tự chuyển bài tiếp theo (chỉ trong các file đã gắn).
  const playable = filtered.filter((m) => urls[m.id]).map((m) => m.id);
  useEffect(() => {
    if (!playlist?.current) return;
    if (voices.some((v) => v.mediaId === playlist.current)) return;
    const nextId = pickNext(playable, playlist.current, playlist.mode);
    const next = ws.media.find((m) => m.id === nextId);
    if (!next) return setPlaylist(null);
    playMedia(next, opts);
    setPlaylist({ ...playlist, current: next.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices]);

  const startPlaylist = (mode: 'sequential' | 'random') => {
    const first = pickNext(playable, null, mode);
    const item = ws.media.find((m) => m.id === first);
    if (!item) {
      notify({ tone: 'warning', message: 'Chưa có file nào được gắn trong danh sách đang lọc. Hãy thêm hoặc gắn file trước.' });
      return;
    }
    if (playMedia(item, opts).ok) setPlaylist({ mode, current: item.id });
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    const added: MediaItem[] = [];
    const errors: string[] = [];
    const targetGroup = groupId === 'all' ? (ws.groups[0]?.id ?? 'g_user') : groupId;
    for (const file of list.slice(0, 200)) {
      const check = checkMediaFile(file.name, file.type, file.size);
      if (!check.ok) {
        errors.push(check.reason);
        continue;
      }
      const id = newId('m');
      const url = attachFile(id, file);
      try {
        const duration = await probeDuration(url, check.kind, file.name);
        added.push({
          id,
          name: check.baseName.slice(0, 120),
          kind: check.kind,
          groupId: targetGroup,
          tags: [],
          volume: 0.8,
          fadeInMs: 0,
          fadeOutMs: 300,
          startSec: 0,
          endSec: null,
          hotkey: null,
          durationSec: duration,
          fileName: file.name.slice(0, 255),
          mimeType: file.type || null,
          sizeBytes: file.size,
          isSample: false,
          addedAt: Date.now(),
        });
      } catch (err) {
        detachFile(id);
        errors.push(err instanceof Error ? err.message : `Không đọc được "${file.name}".`);
      }
    }
    if (list.length > 200) errors.push('Mỗi lần chỉ thêm tối đa 200 file.');
    if (added.length) {
      commit(`Thêm ${added.length} media`, (w) => {
        w.media.push(...added);
      });
      notify({ tone: 'success', message: `Đã thêm ${added.length} file vào thư viện.`, undoable: true });
    }
    errors.slice(0, 3).forEach((e) => notify({ tone: 'danger', message: e }));
    if (errors.length > 3) notify({ tone: 'danger', message: `…và ${errors.length - 3} file khác không thêm được.` });
    setBusy(false);
  };

  const relink = async (mediaId: string, file: File) => {
    const check = checkMediaFile(file.name, file.type, file.size);
    if (!check.ok) return notify({ tone: 'danger', message: check.reason });
    const url = attachFile(mediaId, file);
    try {
      const duration = await probeDuration(url, check.kind, file.name);
      commit('Gắn file cho media', (w) => {
        const m = w.media.find((x) => x.id === mediaId);
        if (!m) return;
        Object.assign(m, {
          kind: check.kind,
          durationSec: duration,
          fileName: file.name.slice(0, 255),
          mimeType: file.type || null,
          sizeBytes: file.size,
          isSample: false,
        });
      });
      setEditing((e) =>
        e && e.id === mediaId ? { ...e, kind: check.kind, durationSec: duration, fileName: file.name, isSample: false } : e,
      );
      notify({ tone: 'success', message: `Đã gắn "${file.name}".` });
    } catch (err) {
      detachFile(mediaId);
      notify({ tone: 'danger', message: err instanceof Error ? err.message : 'Không đọc được file.' });
    }
  };

  const remove = (m: MediaItem) => {
    stopMedia(m.id);
    commit(`Xoá "${m.name}"`, (w) => {
      w.media = w.media.filter((x) => x.id !== m.id);
    });
    notify({ tone: 'info', message: `Đã xoá "${m.name}" khỏi thư viện (file gốc trên máy không bị xoá).`, undoable: true });
  };

  const saveGroup = () => {
    if (!groupModal) return;
    const name = groupModal.name.trim().slice(0, 40);
    if (!name) return notify({ tone: 'warning', message: 'Vui lòng nhập tên nhóm.' });
    if (ws.groups.some((g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== groupModal.id)) {
      return notify({ tone: 'warning', message: `Đã có nhóm tên "${name}".` });
    }
    commit(groupModal.id ? `Sửa nhóm "${name}"` : `Tạo nhóm "${name}"`, (w) => {
      if (groupModal.id) {
        const g = w.groups.find((x) => x.id === groupModal.id);
        if (g) Object.assign(g, { name, color: groupModal.color });
      } else w.groups.push({ id: newId('g'), name, color: groupModal.color, builtIn: false });
    });
    setGroupModal(null);
  };

  const deleteGroup = (id: string) => {
    const g = ws.groups.find((x) => x.id === id);
    if (!g || g.builtIn) return;
    const fallback = ws.groups[0]!.id;
    commit(`Xoá nhóm "${g.name}"`, (w) => {
      w.groups = w.groups.filter((x) => x.id !== id);
      w.media.forEach((m) => {
        if (m.groupId === id) m.groupId = fallback;
      });
    });
    setGroupId('all');
    notify({
      tone: 'info',
      message: `Đã xoá nhóm "${g.name}". Media trong nhóm được chuyển sang "${ws.groups[0]!.name}".`,
      undoable: true,
    });
  };

  const screen = screenById('media');

  return (
    <div
      className="flex flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
      }}
    >
      <PageHeader
        title={screen.label}
        description={screen.description}
        status={screen.status}
        actions={
          <>
            <Button icon={<FolderPlus size={16} />} onClick={() => setGroupModal({ id: null, name: '', color: 'pink' })}>
              Nhóm mới
            </Button>
            <Button variant="primary" icon={<Upload size={16} />} disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? 'Đang kiểm tra file…' : 'Thêm file'}
            </Button>
          </>
        }
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPT}
        hidden
        data-testid="media-file-input"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={relinkInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && relinkTarget.current) void relink(relinkTarget.current, f);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-3">
          <h2 className="px-2 pb-2 text-xs font-bold tracking-wider text-muted uppercase">Nhóm</h2>
          <ul className="flex flex-col gap-0.5">
            {[{ id: 'all', name: 'Tất cả', color: 'pink' as PastelColor, builtIn: true }, ...ws.groups].map((g) => {
              const count = g.id === 'all' ? ws.media.length : ws.media.filter((m) => m.groupId === g.id).length;
              return (
                <li key={g.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => setGroupId(g.id)}
                    aria-pressed={groupId === g.id}
                    className={cx(
                      'kb-transition flex flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left text-sm',
                      groupId === g.id ? 'bg-primary-soft font-semibold' : 'hover:bg-surface-2',
                    )}
                  >
                    <PastelSwatch color={g.color} className="h-3 w-3" />
                    <span className="flex-1 truncate">{g.name}</span>
                    <span className="text-xs text-muted tabular-nums">{count}</span>
                  </button>
                  {g.id !== 'all' && (
                    <IconButton
                      label={`Sửa nhóm ${g.name}`}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={() => setGroupModal({ id: g.id, name: g.name, color: g.color })}
                    >
                      <Pencil size={13} />
                    </IconButton>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-control border border-line-strong bg-surface px-3">
              <Search size={16} className="text-muted" aria-hidden />
              <input
                aria-label="Tìm media"
                className="h-10 flex-1 bg-transparent text-sm outline-none"
                placeholder="Tìm theo tên hoặc tag…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex rounded-control border border-line-strong p-0.5" role="group" aria-label="Lọc loại media">
              {(
                [
                  ['all', 'Tất cả'],
                  ['audio', 'Âm thanh'],
                  ['video', 'Video'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={cx(
                    'rounded-[10px] px-3 py-1.5 text-xs font-semibold',
                    kind === k ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            {playlist ? (
              <Button
                variant="danger"
                size="sm"
                icon={<Square size={14} />}
                onClick={() => {
                  if (playlist.current) stopMedia(playlist.current);
                  setPlaylist(null);
                }}
              >
                Dừng playlist
              </Button>
            ) : (
              <>
                <Button size="sm" icon={<ListMusic size={15} />} onClick={() => startPlaylist('sequential')}>
                  Phát tuần tự
                </Button>
                <Button size="sm" icon={<Shuffle size={15} />} onClick={() => startPlaylist('random')}>
                  Ngẫu nhiên
                </Button>
              </>
            )}
            <InfoTip text="Playlist phát lần lượt các file ĐÃ GẮN trong danh sách đang lọc. Media mẫu (chưa có file) sẽ được bỏ qua." />
          </Card>

          {groupId !== 'all' && !ws.groups.find((g) => g.id === groupId)?.builtIn && (
            <div className="flex justify-end">
              <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => deleteGroup(groupId)}>
                Xoá nhóm này
              </Button>
            </div>
          )}

          <div className={cx('kb-transition rounded-card', dragOver && 'ring-4 ring-primary ring-offset-4 ring-offset-bg')}>
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Upload size={26} />}
                title={ws.media.length ? 'Không có media phù hợp' : 'Thư viện đang trống'}
                action={
                  <Button variant="primary" icon={<Plus size={16} />} onClick={() => fileInput.current?.click()}>
                    Thêm file
                  </Button>
                }
              >
                Kéo thả file âm thanh hoặc video vào đây, hoặc bấm “Thêm file”. Hỗ trợ MP3, WAV, OGG, M4A, MP4, WEBM…
              </EmptyState>
            ) : (
              <ul className="grid grid-cols-1 gap-3 2xl:grid-cols-2" aria-label="Danh sách media">
                {filtered.map((m) => {
                  const group = ws.groups.find((g) => g.id === m.groupId);
                  const linked = !!urls[m.id];
                  const playing = isPlaying(m.id, voices);
                  return (
                    <li
                      key={m.id}
                      className="kb-transition flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft hover:shadow-card"
                    >
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: PASTEL_VAR[group?.color ?? 'pink'] }}
                      >
                        {m.kind === 'video' ? <Video size={20} aria-hidden /> : <Music size={20} aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{m.name}</span>
                          {m.hotkey && <Badge tone="info">{m.hotkey}</Badge>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          <span>{group?.name ?? '—'}</span>
                          <span>·</span>
                          <span className="tabular-nums">{formatDuration(m.durationSec)}</span>
                          {m.sizeBytes ? <span>· {formatBytes(m.sizeBytes)}</span> : null}
                          {m.isSample ? (
                            <Badge tone="warning">Mẫu — chưa có file</Badge>
                          ) : !linked ? (
                            <Badge tone="danger">Cần gắn lại file</Badge>
                          ) : null}
                          {m.tags.slice(0, 3).map((t) => (
                            <Badge key={t} tone="pink">
                              #{t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {!linked && (
                        <IconButton
                          label="Gắn file"
                          onClick={() => {
                            relinkTarget.current = m.id;
                            relinkInput.current?.click();
                          }}
                        >
                          <Link2 size={16} />
                        </IconButton>
                      )}
                      <IconButton
                        label={playing ? `Dừng ${m.name}` : `Phát ${m.name}`}
                        variant={playing ? 'danger' : 'soft'}
                        onClick={() => {
                          if (playing) return stopMedia(m.id);
                          const res = playMedia(m, opts);
                          if (!res.ok) notify({ tone: 'warning', message: res.reason });
                        }}
                      >
                        {playing ? <Square size={15} /> : <Play size={16} />}
                      </IconButton>
                      <IconButton label={`Sửa ${m.name}`} onClick={() => setEditing(m)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton label={`Xoá ${m.name}`} onClick={() => remove(m)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted">
            Lưu ý bản demo: file được đọc trực tiếp từ máy trong phiên làm việc này. Sau khi mở lại ứng dụng cần bấm “Gắn file” lại — giai
            đoạn 3 sẽ ghi nhớ đường dẫn file tự động.
          </p>
        </div>
      </div>

      <MediaEditor
        item={editing}
        onClose={() => setEditing(null)}
        onAttach={(id) => {
          relinkTarget.current = id;
          relinkInput.current?.click();
        }}
      />

      <Modal
        open={!!groupModal}
        onClose={() => setGroupModal(null)}
        title={groupModal?.id ? 'Sửa nhóm' : 'Tạo nhóm mới'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGroupModal(null)}>
              Huỷ
            </Button>
            <Button variant="primary" onClick={saveGroup}>
              Lưu
            </Button>
          </>
        }
      >
        {groupModal && (
          <div className="flex flex-col gap-4">
            <Field label="Tên nhóm" htmlFor="grp-name">
              <TextInput
                id="grp-name"
                value={groupModal.name}
                maxLength={40}
                onChange={(e) => setGroupModal({ ...groupModal, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && saveGroup()}
              />
            </Field>
            <Field label="Màu">
              <div className="flex flex-wrap gap-2">
                {PASTEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={PASTEL_LABELS[c]}
                    aria-pressed={groupModal.color === c}
                    onClick={() => setGroupModal({ ...groupModal, color: c })}
                    className={cx('h-9 w-9 rounded-full border-2', groupModal.color === c ? 'border-accent' : 'border-line')}
                    style={{ background: PASTEL_VAR[c] }}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
