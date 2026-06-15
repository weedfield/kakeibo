import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../../../data/db';
import { IconChevronDown } from '../../atoms/Icon';
import { generateId } from '../../../core/utils';
import type { Category, CategoryType } from '../../../core/types';
import styles from './settings.module.scss';

const sorted = (items: Category[]) =>
  [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// ─── Sortable行コンポーネント ────────────────────────────────

interface ParentRowProps {
  cat: Category;
  hasChildren: boolean;
  isExpanded: boolean;
  onEdit: (cat: Category) => void;
  onToggle: () => void;
  children?: React.ReactNode;
}

function SortableParentRow({ cat, hasChildren, isExpanded, onEdit, onToggle, children }: ParentRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div className={styles.row}>
        <button className={styles.dragHandleBtn} {...attributes} {...listeners}>⠿</button>
        <button className={styles.rowContent} onClick={() => onEdit(cat)}>
          <span className={styles.rowName}>{cat.name}</span>
        </button>
        {hasChildren ? (
          <button className={styles.chevronBtn} onClick={onToggle}>
            <IconChevronDown className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`} />
          </button>
        ) : (
          <span className={styles.chevronPlaceholder} />
        )}
      </div>
      {isExpanded && children}
    </div>
  );
}

interface ChildRowProps {
  cat: Category;
  onEdit: (cat: Category) => void;
}

function SortableChildRow({ cat, onEdit }: ChildRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div className={styles.childRow}>
        <button className={styles.dragHandleBtn} {...attributes} {...listeners}>⠿</button>
        <button className={styles.rowContent} onClick={() => onEdit(cat)}>
          <span className={styles.childName}>{cat.name}</span>
        </button>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────

export function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewType, setViewType] = useState<CategoryType>('expense');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [parentId, setParentId] = useState<string | null>(null);
  const [editParentId, setEditParentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => setCategories(await getAllCategories());

  const active = categories.filter(c => !c.archived);
  const parentCats = sorted(active.filter(c => c.type === viewType && !c.parentId));
  const childrenOf = (pid: string) => sorted(active.filter(c => c.parentId === pid));

  // ─── ドラッグ ───

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const isParentDrag = parentCats.some(c => c.id === active.id);

    if (isParentDrag) {
      const oldIdx = parentCats.findIndex(c => c.id === active.id);
      const newIdx = parentCats.findIndex(c => c.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return;
      const reordered = arrayMove(parentCats, oldIdx, newIdx).map((c, i) => ({ ...c, order: i }));
      setCategories(prev => {
        const rest = prev.filter(c => !reordered.some(r => r.id === c.id));
        return [...rest, ...reordered];
      });
      await Promise.all(reordered.map(c => updateCategory(c)));
    } else {
      const activeChild = categories.find(c => c.id === active.id);
      if (!activeChild?.parentId) return;
      const siblings = childrenOf(activeChild.parentId);
      const oldIdx = siblings.findIndex(c => c.id === active.id);
      const newIdx = siblings.findIndex(c => c.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return;
      const reordered = arrayMove(siblings, oldIdx, newIdx).map((c, i) => ({ ...c, order: i }));
      setCategories(prev => {
        const rest = prev.filter(c => !reordered.some(r => r.id === c.id));
        return [...rest, ...reordered];
      });
      await Promise.all(reordered.map(c => updateCategory(c)));
    }
  };

  // ─── 追加 ───

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addCategory({
      id: `${categoryType}-${generateId()}`,
      name: name.trim(),
      type: categoryType,
      parentId,
      order: 0,
    });
    setName(''); setParentId(null); setShowForm(false);
    await loadData();
  };

  // ─── 編集 ───

  const handleEditStart = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setEditParentId(cat.parentId);
  };

  const handleEditClose = () => { setEditingCat(null); setName(''); setEditParentId(null); };

  const handleEditSave = async () => {
    if (!editingCat || !name.trim()) return;
    await updateCategory({ ...editingCat, name: name.trim(), parentId: editParentId });
    handleEditClose();
    await loadData();
  };

  const handleDelete = async (cat: Category) => {
    const children = categories.filter(c => c.parentId === cat.id);
    const msg = children.length > 0
      ? `「${cat.name}」とその小分類 ${children.length} 件を削除しますか？`
      : `「${cat.name}」を削除しますか？`;
    if (confirm(msg)) {
      await deleteCategory(cat.id);
      handleEditClose();
      await loadData();
    }
  };

  const activeCat = activeId ? categories.find(c => c.id === activeId) : null;

  return (
    <>
      <div className={styles.typeToggle}>
        {(['expense', 'income'] as CategoryType[]).map(type => (
          <button key={type} onClick={() => setViewType(type)}
            className={`${styles.typeBtn} ${
              viewType === type ? (type === 'expense' ? styles.activeExpense : styles.activeIncome) : ''
            }`}>
            {type === 'expense' ? '支出' : '収入'}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.card}>
          <SortableContext items={parentCats.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {parentCats.map(cat => {
              const children = childrenOf(cat.id);
              const isExpanded = expandedIds.has(cat.id);
              return (
                <SortableParentRow
                  key={cat.id}
                  cat={cat}
                  hasChildren={children.length > 0}
                  isExpanded={isExpanded}
                  onEdit={handleEditStart}
                  onToggle={() => setExpandedIds(prev => {
                    const next = new Set(prev);
                    next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                    return next;
                  })}
                >
                  <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {children.map(child => (
                      <SortableChildRow key={child.id} cat={child} onEdit={handleEditStart} />
                    ))}
                  </SortableContext>
                </SortableParentRow>
              );
            })}
          </SortableContext>
          {parentCats.length === 0 && <p className={styles.empty}>カテゴリがありません</p>}
        </div>

        <DragOverlay>
          {activeCat && (
            <div className={`${styles.card} ${styles.dragOverlayItem}`}>
              <div className={activeCat.parentId ? styles.childRow : styles.row}>
                <span className={styles.dragHandleBtn}>⠿</span>
                <span className={activeCat.parentId ? styles.childName : styles.rowName}>
                  {activeCat.name}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>カテゴリを追加</p>
          <div>
            <label className={styles.fieldLabel}>種別</label>
            <div className={styles.segSmall}>
              {(['expense', 'income'] as CategoryType[]).map(type => (
                <button key={type}
                  onClick={() => { setCategoryType(type); setParentId(null); }}
                  className={`${styles.segSmallBtn} ${
                    categoryType === type ? (type === 'expense' ? styles.activeExpense : styles.activeIncome) : ''
                  }`}>
                  {type === 'expense' ? '支出' : '収入'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={styles.fieldLabel}>名前</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="カテゴリ名" className={styles.input} />
          </div>
          <div>
            <label className={styles.fieldLabel}>親カテゴリ（小分類にする場合）</label>
            <select value={parentId || ''} onChange={e => setParentId(e.target.value || null)}
              className={styles.select}>
              <option value="">なし（大分類）</option>
              {active.filter(c => c.type === categoryType && !c.parentId).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formBtns}>
            <button onClick={() => setShowForm(false)} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!name.trim()} className={styles.addBtn}>追加</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ カテゴリを追加
        </button>
      )}

      {editingCat && (
        <div className={styles.confirmOverlay} onClick={handleEditClose}>
          <div className={styles.editSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.dragHandle} />
            <p className={styles.formTitle}>{editingCat.name}</p>
            <div>
              <label className={styles.fieldLabel}>名前</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className={styles.input} />
            </div>
            <div>
              <label className={styles.fieldLabel}>親カテゴリ</label>
              <select value={editParentId || ''} onChange={e => setEditParentId(e.target.value || null)}
                className={styles.select}>
                <option value="">なし（大分類）</option>
                {active
                  .filter(c => c.type === editingCat.type && !c.parentId && c.id !== editingCat.id)
                  .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                }
              </select>
            </div>
            <div className={styles.sheetBtns}>
              <button onClick={() => handleDelete(editingCat)} className={styles.deleteRecurringBtn}>削除</button>
              <button onClick={handleEditSave} disabled={!name.trim()} className={styles.addBtn}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
