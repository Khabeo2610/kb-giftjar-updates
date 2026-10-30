import { useState } from 'react';
import { PanelTopOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import type { DeckButton } from '@kb/shared-types';
import { useAppStore, useWorkspace } from '../../store/appStore';
import { screenById } from '../../data/screens';
import { Button, Card, Field, IconButton, PageHeader, Select, Switch, TextInput } from '../../components/ui/primitives';
import { InfoTip, Modal } from '../../components/ui/overlays';
import { newId } from '../../lib/id';
import { cx } from '../../lib/cx';
import { executeDeckAction } from '../live/livePipeline';
import { ActivityLog } from '../live/ActivityLog';
import { DeckTile } from './DeckTile';
import { DeckButtonEditor } from './DeckButtonEditor';
import { pruneOrphanButtons, resizeDeck, swapSlots } from './deckLayout';

export function StreamDeckScreen() {
  const ws = useWorkspace();
  const deck = ws.deck;
  const commit = useAppStore((s) => s.commit);
  const notify = useAppStore((s) => s.notify);
  const setMini = useAppStore((s) => s.setMiniControllerOpen);
  const [pageId, setPageId] = useState(deck.pages[0]!.id);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<{ button: DeckButton; slot: number } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [pageModal, setPageModal] = useState<{ id: string | null; name: string } | null>(null);
  const page = deck.pages.find((p) => p.id === pageId) ?? deck.pages[0]!;
  const screen = screenById('deck');

  const changeSize = (rows: number, cols: number) => {
    const next = resizeDeck(deck, rows, cols);
    if (!next) return notify({ tone: 'warning', message: 'Lưới mới quá nhỏ so với số nút hiện có. Hãy xoá bớt nút trước.' });
    commit(`Đổi lưới thành ${rows}×${cols}`, (w) => {
      w.deck = next;
    });
  };

  const saveButton = (b: DeckButton, slot: number) => {
    const exists = !!deck.buttons[b.id];
    commit(exists ? `Sửa nút "${b.label}"` : `Tạo nút "${b.label}"`, (w) => {
      w.deck.buttons[b.id] = b;
      const p = w.deck.pages.find((x) => x.id === page.id);
      if (p && !exists) p.slots[slot] = b.id;
    });
    setEditing(null);
    notify({ tone: 'success', message: 'Đã lưu nút.', undoable: true });
  };

  const deleteButton = (id: string) => {
    const label = deck.buttons[id]?.label ?? '';
    commit(`Xoá nút "${label}"`, (w) => {
      w.deck.pages.forEach((p) => {
        p.slots = p.slots.map((s) => (s === id ? null : s));
      });
      delete w.deck.buttons[id];
    });
    setEditing(null);
    notify({ tone: 'info', message: `Đã xoá nút "${label}".`, undoable: true });
  };

  const savePage = () => {
    if (!pageModal) return;
    const name = pageModal.name.trim().slice(0, 40);
    if (!name) return notify({ tone: 'warning', message: 'Vui lòng nhập tên trang.' });
    const newPageId = newId('p');
    commit(pageModal.id ? `Đổi tên trang "${name}"` : `Thêm trang "${name}"`, (w) => {
      if (pageModal.id) {
        const p = w.deck.pages.find((x) => x.id === pageModal.id);
        if (p) p.name = name;
      } else w.deck.pages.push({ id: newPageId, name, slots: Array.from({ length: w.deck.rows * w.deck.cols }, () => null) });
    });
    if (!pageModal.id) setPageId(newPageId);
    setPageModal(null);
  };

  const deletePage = () => {
    if (deck.pages.length <= 1) return notify({ tone: 'warning', message: 'Cần giữ lại ít nhất một trang.' });
    commit(`Xoá trang "${page.name}"`, (w) => {
      w.deck.pages = w.deck.pages.filter((p) => p.id !== page.id);
      w.deck = pruneOrphanButtons(w.deck);
    });
    setPageId(deck.pages.find((p) => p.id !== page.id)!.id);
    notify({ tone: 'info', message: `Đã xoá trang "${page.name}".`, undoable: true });
  };

  return (
    <div>
      <PageHeader
        title={screen.label}
        description={screen.description}
        status={screen.status}
        actions={
          <>
            <label className="flex items-center gap-2 rounded-control border border-line-strong bg-surface px-3 py-2 text-sm font-medium">
              Chế độ chỉnh sửa
              <Switch label="Chế độ chỉnh sửa" checked={editMode} onChange={setEditMode} />
            </label>
            <Button variant="primary" icon={<PanelTopOpen size={16} />} onClick={() => setMini(true)}>
              Mini Controller
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Trang nút" className="flex flex-wrap gap-1 rounded-control border border-line bg-surface p-1">
          {deck.pages.map((p) => (
            <button
              key={p.id}
              role="tab"
              type="button"
              aria-selected={p.id === page.id}
              onClick={() => setPageId(p.id)}
              className={cx(
                'kb-transition rounded-[10px] px-4 py-1.5 text-sm font-semibold',
                p.id === page.id ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        {editMode && (
          <>
            <IconButton label="Thêm trang" onClick={() => setPageModal({ id: null, name: '' })}>
              <Plus size={17} />
            </IconButton>
            <IconButton label="Đổi tên trang" onClick={() => setPageModal({ id: page.id, name: page.name })}>
              <Pencil size={16} />
            </IconButton>
            <IconButton label="Xoá trang" onClick={deletePage}>
              <Trash2 size={16} />
            </IconButton>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="font-medium">Lưới</span>
              <Select
                aria-label="Số hàng"
                className="h-9 w-20"
                value={deck.rows}
                onChange={(e) => changeSize(Number(e.target.value), deck.cols)}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} hàng
                  </option>
                ))}
              </Select>
              <span>×</span>
              <Select
                aria-label="Số cột"
                className="h-9 w-20"
                value={deck.cols}
                onChange={(e) => changeSize(deck.rows, Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} cột
                  </option>
                ))}
              </Select>
              <InfoTip text="Kéo thả các nút để đổi vị trí. Bấm vào nút để sửa, bấm vào ô trống để tạo nút mới." />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${deck.cols}, minmax(0, 1fr))` }} aria-label="Lưới nút">
            {page.slots.map((id, slot) => {
              const b = id ? deck.buttons[id] : undefined;
              return (
                <div
                  key={slot}
                  className={cx('aspect-[4/3] min-h-[92px] rounded-2xl', dragOverSlot === slot && 'ring-4 ring-primary')}
                  draggable={editMode && !!b}
                  onDragStart={(e) => {
                    setDragFrom(slot);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (dragFrom === null) return;
                    e.preventDefault();
                    setDragOverSlot(slot);
                  }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null && dragFrom !== slot) {
                      commit('Di chuyển nút', (w) => {
                        w.deck = swapSlots(w.deck, page.id, dragFrom, slot);
                      });
                    }
                    setDragFrom(null);
                    setDragOverSlot(null);
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setDragOverSlot(null);
                  }}
                >
                  {b ? (
                    <DeckTile
                      button={b}
                      active={editMode && dragFrom === slot}
                      onPress={() => (editMode ? setEditing({ button: structuredClone(b), slot }) : executeDeckAction(b.action, b.label))}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!editMode}
                      onClick={() =>
                        setEditing({
                          slot,
                          button: {
                            id: newId('b'),
                            label: 'Nút mới',
                            icon: 'Sparkles',
                            color: 'pink',
                            hotkey: null,
                            action: { kind: 'none' },
                          },
                        })
                      }
                      className={cx(
                        'kb-transition flex h-full w-full items-center justify-center rounded-2xl border-2 border-dashed text-muted',
                        editMode ? 'border-line-strong hover:border-primary hover:bg-primary-soft/40 hover:text-accent' : 'border-line',
                      )}
                      aria-label={editMode ? 'Tạo nút ở ô trống' : 'Ô trống'}
                    >
                      {editMode && <Plus size={22} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!editMode && <p className="mt-3 text-xs text-muted">Bấm nút để thực hiện. Bật “Chế độ chỉnh sửa” để thêm, sửa, kéo thả nút.</p>}
        </Card>
        <Card>
          <ActivityLog className="h-80" />
        </Card>
      </div>

      <DeckButtonEditor
        button={editing?.button ?? null}
        onClose={() => setEditing(null)}
        onSave={(b) => editing && saveButton(b, editing.slot)}
        onDelete={deleteButton}
      />

      <Modal
        open={!!pageModal}
        onClose={() => setPageModal(null)}
        title={pageModal?.id ? 'Đổi tên trang' : 'Thêm trang'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPageModal(null)}>
              Huỷ
            </Button>
            <Button variant="primary" onClick={savePage}>
              Lưu
            </Button>
          </>
        }
      >
        {pageModal && (
          <Field label="Tên trang" htmlFor="page-name">
            <TextInput
              id="page-name"
              value={pageModal.name}
              maxLength={40}
              onChange={(e) => setPageModal({ ...pageModal, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && savePage()}
            />
          </Field>
        )}
      </Modal>
    </div>
  );
}
