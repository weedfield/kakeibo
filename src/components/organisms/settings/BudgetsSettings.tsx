import { useState, useEffect } from 'react';
import { getAllCategories, getAllBudgets, setBudget, deleteBudget } from '../../../data/db';
import type { Category } from '../../../core/types';
import styles from './settings.module.scss';

export function BudgetsSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map());
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [cats, buds] = await Promise.all([getAllCategories(), getAllBudgets()]);
    setCategories(cats);
    const draftMap = new Map<string, string>();
    cats.filter(c => c.type === 'expense' && !c.parentId).forEach(cat => {
      const b = buds.find(b => b.categoryId === cat.id);
      draftMap.set(cat.id, b ? String(b.amount) : '');
    });
    setDrafts(draftMap);
  };

  const handleSave = async () => {
    const expenseCats = categories.filter(c => c.type === 'expense' && !c.parentId);
    await Promise.all(expenseCats.map(async cat => {
      const val = drafts.get(cat.id) || '';
      const amount = parseInt(val);
      const id = `budget-${cat.id}`;
      if (val && !isNaN(amount) && amount > 0) {
        await setBudget({ id, categoryId: cat.id, amount });
      } else {
        await deleteBudget(id);
      }
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const expenseCats = categories.filter(c => c.type === 'expense' && !c.parentId);

  return (
    <>
      <div className={styles.card}>
        {expenseCats.length === 0 && <p className={styles.empty}>支出カテゴリがありません</p>}
        {expenseCats.map(cat => (
          <div key={cat.id} className={styles.budgetRow}>
            <span className={styles.rowName}>{cat.name}</span>
            <div className={styles.budgetInputWrap}>
              <span className={styles.budgetYen}>¥</span>
              <input
                type="number"
                inputMode="numeric"
                value={drafts.get(cat.id) || ''}
                onChange={e => setDrafts(prev => new Map(prev).set(cat.id, e.target.value))}
                placeholder="─"
                className={styles.budgetInput}
              />
            </div>
          </div>
        ))}
      </div>
      {expenseCats.length > 0 && (
        <button onClick={handleSave} className={`${styles.addBtn} ${styles.budgetSaveBtn}`}>
          {saved ? '保存しました ✓' : '保存'}
        </button>
      )}
    </>
  );
}
