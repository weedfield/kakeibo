import { useState, useEffect } from 'react';
import {
  getAllRecurringTxns,
  getAllFunds,
  getAllPaymentMethods,
  getAllCategories,
  addRecurringTxn,
  updateRecurringTxn,
  deleteRecurringTxn,
} from '../../../data/db';
import { generateId, formatCurrency } from '../../../core/utils';
import type { Fund, PaymentMethod, Category, RecurringTxn } from '../../../core/types';
import styles from './settings.module.css';

type RecurringKind = 'expense' | 'income' | 'transfer';

export function RecurringSettings() {
  const [items, setItems] = useState<RecurringTxn[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTxn | null>(null);

  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<RecurringKind>('expense');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [methodId, setMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subId, setSubId] = useState('');
  const [fundId, setFundId] = useState('');
  const [incomeCategoryId, setIncomeCategoryId] = useState('');
  const [fromFundId, setFromFundId] = useState('');
  const [toFundId, setToFundId] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [itemsData, fundsData, methodsData, catsData] = await Promise.all([
      getAllRecurringTxns(), getAllFunds(), getAllPaymentMethods(), getAllCategories(),
    ]);
    setItems(itemsData.sort((a, b) => a.dayOfMonth - b.dayOfMonth));
    setFunds(fundsData);
    setMethods(methodsData);
    setCategories(catsData);
  };

  const resetForm = () => {
    setLabel(''); setKind('expense'); setDayOfMonth(''); setAmount(''); setMemo('');
    setMethodId(''); setCategoryId(''); setSubId(''); setFundId('');
    setIncomeCategoryId(''); setFromFundId(''); setToFundId('');
  };

  const handleAdd = async () => {
    const amountNum = parseInt(amount);
    const day = parseInt(dayOfMonth);
    if (!label.trim() || isNaN(amountNum) || amountNum <= 0 || isNaN(day) || day < 1 || day > 28) return;
    if (kind === 'expense' && (!methodId || !categoryId)) return;
    if (kind === 'income' && (!fundId || !incomeCategoryId)) return;
    if (kind === 'transfer' && (!fromFundId || !toFundId || fromFundId === toFundId)) return;

    await addRecurringTxn({
      id: `recurring-${generateId()}`,
      label: label.trim(), kind, dayOfMonth: day, amount: amountNum, memo,
      methodId: kind === 'expense' ? methodId : null,
      categoryId: kind === 'expense' ? categoryId : null,
      subId: kind === 'expense' ? (subId || null) : null,
      fundId: kind === 'income' ? fundId : null,
      incomeCategoryId: kind === 'income' ? incomeCategoryId : null,
      fromFundId: kind === 'transfer' ? fromFundId : null,
      toFundId: kind === 'transfer' ? toFundId : null,
      lastExecutedYearMonth: null,
    });
    resetForm();
    setShowForm(false);
    await loadData();
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    const amountNum = parseInt(amount);
    const day = parseInt(dayOfMonth);
    if (isNaN(amountNum) || amountNum <= 0 || isNaN(day) || day < 1 || day > 28) return;
    await updateRecurringTxn({ ...editingItem, label: label.trim(), amount: amountNum, dayOfMonth: day, memo });
    setEditingItem(null);
    await loadData();
  };

  const openEdit = (item: RecurringTxn) => {
    setEditingItem(item);
    setLabel(item.label);
    setAmount(String(item.amount));
    setDayOfMonth(String(item.dayOfMonth));
    setMemo(item.memo);
  };

  const handleDelete = async (item: RecurringTxn) => {
    if (confirm(`「${item.label}」を削除しますか？`)) {
      await deleteRecurringTxn(item.id);
      setEditingItem(null);
      await loadData();
    }
  };

  const getDescription = (item: RecurringTxn) => {
    if (item.kind === 'expense') {
      return `${methods.find(m => m.id === item.methodId)?.name ?? '?'} / ${categories.find(c => c.id === item.categoryId)?.name ?? '?'}`;
    } else if (item.kind === 'income') {
      return `${funds.find(f => f.id === item.fundId)?.name ?? '?'} / ${categories.find(c => c.id === item.incomeCategoryId)?.name ?? '?'}`;
    } else {
      return `${funds.find(f => f.id === item.fromFundId)?.name ?? '?'} → ${funds.find(f => f.id === item.toFundId)?.name ?? '?'}`;
    }
  };

  const KIND_LABEL: Record<RecurringKind, string> = { expense: '支出', income: '収入', transfer: '振替' };
  const KIND_STYLE: Record<RecurringKind, string> = { expense: styles.kindExpense, income: styles.kindIncome, transfer: styles.kindTransfer };
  const expenseCats = categories.filter(c => c.type === 'expense' && !c.parentId);
  const incomeCats = categories.filter(c => c.type === 'income' && !c.parentId);
  const subCats = categoryId ? categories.filter(c => c.parentId === categoryId) : [];

  const canAdd = label.trim() && amount && dayOfMonth &&
    (kind === 'expense' ? methodId && categoryId :
     kind === 'income' ? fundId && incomeCategoryId :
     fromFundId && toFundId && fromFundId !== toFundId);

  return (
    <>
      <div className={styles.card}>
        {items.length === 0 && <p className={styles.empty}>繰り返し取引がありません</p>}
        {items.map(item => (
          <button key={item.id} className={styles.recurringRow} onClick={() => openEdit(item)}>
            <div className={styles.recurringLeft}>
              <div className={styles.recurringTitle}>
                <span className={`${styles.kindBadge} ${KIND_STYLE[item.kind]}`}>{KIND_LABEL[item.kind]}</span>
                <span className={styles.rowName}>{item.label}</span>
              </div>
              <p className={styles.rowMeta}>{getDescription(item)}</p>
            </div>
            <div className={styles.recurringRight}>
              <p className={styles.recurringAmount}>¥{formatCurrency(item.amount)}</p>
              <p className={styles.recurringDay}>毎月{item.dayOfMonth}日</p>
            </div>
          </button>
        ))}
      </div>

      {!showForm && (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ 繰り返しを追加
        </button>
      )}

      {showForm && (
        <div className={styles.form}>
          <p className={styles.formTitle}>繰り返しを追加</p>
          <div>
            <label className={styles.fieldLabel}>名前</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="例：Netflix、給与" className={styles.input} />
          </div>
          <div>
            <label className={styles.fieldLabel}>種別</label>
            <div className={styles.segSmall}>
              {(['expense', 'income', 'transfer'] as RecurringKind[]).map(k => (
                <button key={k} onClick={() => setKind(k)} className={`${styles.segSmallBtn} ${kind === k ? styles.active : ''}`}>{KIND_LABEL[k]}</button>
              ))}
            </div>
          </div>
          <div className={styles.recurringFormRow}>
            <div style={{ flex: 1 }}>
              <label className={styles.fieldLabel}>金額（円）</label>
              <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className={styles.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label className={styles.fieldLabel}>毎月何日（1–28）</label>
              <input type="number" inputMode="numeric" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} placeholder="25" min={1} max={28} className={styles.input} />
            </div>
          </div>

          {kind === 'expense' && (
            <>
              <div>
                <label className={styles.fieldLabel}>支払い方法</label>
                <select value={methodId} onChange={e => setMethodId(e.target.value)} className={styles.select}>
                  <option value="">選択</option>
                  {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className={styles.fieldLabel}>カテゴリ</label>
                <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubId(''); }} className={styles.select}>
                  <option value="">選択</option>
                  {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {subCats.length > 0 && (
                <div>
                  <label className={styles.fieldLabel}>小分類（任意）</label>
                  <select value={subId} onChange={e => setSubId(e.target.value)} className={styles.select}>
                    <option value="">なし</option>
                    {subCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {kind === 'income' && (
            <>
              <div>
                <label className={styles.fieldLabel}>入金先</label>
                <select value={fundId} onChange={e => setFundId(e.target.value)} className={styles.select}>
                  <option value="">選択</option>
                  {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className={styles.fieldLabel}>カテゴリ</label>
                <select value={incomeCategoryId} onChange={e => setIncomeCategoryId(e.target.value)} className={styles.select}>
                  <option value="">選択</option>
                  {incomeCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </>
          )}

          {kind === 'transfer' && (
            <>
              <div>
                <label className={styles.fieldLabel}>移動元</label>
                <select value={fromFundId} onChange={e => setFromFundId(e.target.value)} className={styles.select}>
                  <option value="">選択</option>
                  {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className={styles.fieldLabel}>移動先</label>
                <select value={toFundId} onChange={e => setToFundId(e.target.value)} className={styles.select}>
                  <option value="">選択</option>
                  {funds.filter(f => f.id !== fromFundId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className={styles.fieldLabel}>メモ（任意）</label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="メモ" className={styles.input} />
          </div>
          <div className={styles.formBtns}>
            <button onClick={() => { resetForm(); setShowForm(false); }} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!canAdd} className={styles.addBtn}>追加</button>
          </div>
        </div>
      )}

      {editingItem && (
        <div className={styles.confirmOverlay} onClick={() => setEditingItem(null)}>
          <div className={styles.editSheet} onClick={e => e.stopPropagation()}>
            <p className={styles.formTitle}>{editingItem.label} を編集</p>
            <p className={styles.rowMeta}>{getDescription(editingItem)}</p>
            <div className={styles.recurringFormRow}>
              <div style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>金額（円）</label>
                <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} className={styles.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>実行日（1–28）</label>
                <input type="number" inputMode="numeric" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min={1} max={28} className={styles.input} />
              </div>
            </div>
            <div>
              <label className={styles.fieldLabel}>名前</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.fieldLabel}>メモ（任意）</label>
              <input type="text" value={memo} onChange={e => setMemo(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.formBtns}>
              <button onClick={() => handleDelete(editingItem)} className={styles.deleteRecurringBtn}>削除</button>
              <button onClick={handleEditSave} className={styles.addBtn}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
