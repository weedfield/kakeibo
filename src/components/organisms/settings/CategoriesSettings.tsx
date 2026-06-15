import { useState, useEffect } from 'react';
import {
  getAllCategories,
  addCategory,
  deleteCategory,
} from '../../../data/db';
import { generateId } from '../../../core/utils';
import type { Category, CategoryType } from '../../../core/types';
import styles from './settings.module.scss';

export function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewType, setViewType] = useState<CategoryType>('expense');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setCategories(await getAllCategories());
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addCategory({
      id: `${categoryType}-${generateId()}`,
      name: name.trim(),
      type: categoryType,
      parentId,
    });
    setName('');
    setParentId(null);
    setShowForm(false);
    await loadData();
  };

  const handleDelete = async (category: Category) => {
    const children = categories.filter(c => c.parentId === category.id);
    const msg = children.length > 0
      ? `「${category.name}」とその小分類 ${children.length} 件を削除しますか？`
      : `「${category.name}」を削除しますか？`;
    if (confirm(msg)) {
      await deleteCategory(category.id);
      await loadData();
    }
  };

  const parentCats = categories.filter(c => c.type === viewType && !c.parentId);

  return (
    <>
      <div className={styles.typeToggle}>
        {(['expense', 'income'] as CategoryType[]).map(type => (
          <button
            key={type}
            onClick={() => setViewType(type)}
            className={`${styles.typeBtn} ${
              viewType === type
                ? type === 'expense' ? styles.activeExpense : styles.activeIncome
                : ''
            }`}
          >
            {type === 'expense' ? '支出' : '収入'}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        {parentCats.map(cat => {
          const children = categories.filter(c => c.parentId === cat.id);
          return (
            <div key={cat.id}>
              <div className={styles.row}>
                <span className={styles.rowName}>{cat.name}</span>
                <button onClick={() => handleDelete(cat)} className={styles.delBtn}>✕</button>
              </div>
              {children.map(child => (
                <div key={child.id} className={styles.childRow}>
                  <span className={styles.childName}>{child.name}</span>
                  <button onClick={() => handleDelete(child)} className={styles.childDelBtn}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
        {parentCats.length === 0 && <p className={styles.empty}>カテゴリがありません</p>}
      </div>

      {showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>カテゴリを追加</p>
          <div>
            <label className={styles.fieldLabel}>種別</label>
            <div className={styles.segSmall}>
              {(['expense', 'income'] as CategoryType[]).map(type => (
                <button
                  key={type}
                  onClick={() => { setCategoryType(type); setParentId(null); }}
                  className={`${styles.segSmallBtn} ${
                    categoryType === type
                      ? type === 'expense' ? styles.activeExpense : styles.activeIncome
                      : ''
                  }`}
                >
                  {type === 'expense' ? '支出' : '収入'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={styles.fieldLabel}>名前</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="カテゴリ名"
              className={styles.input}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>親カテゴリ（小分類にする場合）</label>
            <select
              value={parentId || ''}
              onChange={e => setParentId(e.target.value || null)}
              className={styles.select}
            >
              <option value="">なし（大分類）</option>
              {categories
                .filter(c => c.type === categoryType && !c.parentId)
                .map(c => (
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
    </>
  );
}
