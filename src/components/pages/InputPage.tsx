import { useState, useEffect } from 'react';
import {
  getAllFunds,
  getAllPaymentMethods,
  getAllCategories,
  getAllTransactions,
  getAllBudgets,
  addTransaction,
  updateTransaction,
} from '../../data/db';
import { computeDeductions, calculateBalance } from '../../core/logic';
import { generateId, getTodayString, formatCurrency, getCurrentMonthRange } from '../../core/utils';
import { NumberPad } from '../molecules/NumberPad';
import { Chip } from '../atoms/Chip';
import type { Fund, PaymentMethod, Category, Txn, Budget } from '../../core/types';
import styles from './InputPage.module.css';

type InputKind = 'expense' | 'income' | 'transfer';

interface InputPageProps {
  editingTxn?: Txn | null;
  onEditDone?: () => void;
}

export function InputPage({ editingTxn, onEditDone }: InputPageProps) {
  const [kind, setKind] = useState<InputKind>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [memo, setMemo] = useState('');

  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');

  const [selectedFundId, setSelectedFundId] = useState('');
  const [selectedIncomeCategoryId, setSelectedIncomeCategoryId] = useState('');

  const [fromFundId, setFromFundId] = useState('');
  const [toFundId, setToFundId] = useState('');

  const [funds, setFunds] = useState<Fund[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1000);
  };

  useEffect(() => {
    if (!editingTxn) return;
    setKind(editingTxn.kind);
    setAmount(String(editingTxn.amount));
    setDate(editingTxn.date);
    setMemo(editingTxn.memo);
    if (editingTxn.kind === 'expense') {
      setSelectedMethodId(editingTxn.methodId);
      setSelectedCategoryId(editingTxn.categoryId);
      setSelectedSubId(editingTxn.subId ?? '');
    } else if (editingTxn.kind === 'income') {
      setSelectedFundId(editingTxn.fundId);
      setSelectedIncomeCategoryId(editingTxn.categoryId);
    } else {
      setFromFundId(editingTxn.fromFundId);
      setToFundId(editingTxn.toFundId);
    }
  }, [editingTxn]);

  const loadData = async () => {
    const [fundsData, methodsData, categoriesData, txnsData, budgetsData] = await Promise.all([
      getAllFunds(),
      getAllPaymentMethods(),
      getAllCategories(),
      getAllTransactions(),
      getAllBudgets(),
    ]);
    setFunds(fundsData);
    setMethods(methodsData);
    setCategories(categoriesData);
    setTransactions(txnsData);
    setBudgets(budgetsData);
  };

  const resetForm = () => {
    setAmount('');
    setMemo('');
    setDate(getTodayString());
    setSelectedMethodId('');
    setSelectedCategoryId('');
    setSelectedSubId('');
    setSelectedFundId('');
    setSelectedIncomeCategoryId('');
    setFromFundId('');
    setToFundId('');
  };

  const handleSave = async () => {
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const isEditing = !!editingTxn;
    const txnsForBalance = isEditing
      ? transactions.filter((t) => t.id !== editingTxn!.id)
      : transactions;

    let txn: Txn;

    if (kind === 'expense') {
      if (!selectedMethodId || !selectedCategoryId) return;
      const method = methods.find((m) => m.id === selectedMethodId);
      if (!method) return;
      const primaryFund = funds.find((f) => f.id === method.primaryFundId);
      if (!primaryFund) return;
      const primaryBalance = calculateBalance(primaryFund, txnsForBalance);
      const deductions = computeDeductions(method, amountNum, primaryBalance);
      txn = {
        id: isEditing ? editingTxn!.id : generateId(),
        kind: 'expense',
        date,
        amount: amountNum,
        methodId: selectedMethodId,
        categoryId: selectedCategoryId,
        subId: selectedSubId || null,
        memo,
        deductions,
      };
    } else if (kind === 'income') {
      if (!selectedFundId || !selectedIncomeCategoryId) return;
      txn = {
        id: isEditing ? editingTxn!.id : generateId(),
        kind: 'income',
        date,
        amount: amountNum,
        fundId: selectedFundId,
        categoryId: selectedIncomeCategoryId,
        memo,
      };
    } else {
      if (!fromFundId || !toFundId || fromFundId === toFundId) return;
      txn = {
        id: isEditing ? editingTxn!.id : generateId(),
        kind: 'transfer',
        date,
        amount: amountNum,
        fromFundId,
        toFundId,
        memo,
      };
    }

    try {
      if (isEditing) {
        await updateTransaction(txn);
        onEditDone?.();
      } else {
        await addTransaction(txn);
        resetForm();
        await loadData();
        showToast('登録しました');
      }
    } catch (e) {
      console.error('保存エラー:', e);
      alert('保存に失敗しました。コンソールを確認してください。');
    }
  };

  const getDeductionPreview = () => {
    if (kind !== 'expense' || !selectedMethodId || !amount) return null;
    const method = methods.find((m) => m.id === selectedMethodId);
    if (!method) return null;
    const primaryFund = funds.find((f) => f.id === method.primaryFundId);
    if (!primaryFund) return null;
    const amountNum = parseInt(amount);
    if (isNaN(amountNum)) return null;
    const txnsForBalance = editingTxn
      ? transactions.filter((t) => t.id !== editingTxn.id)
      : transactions;
    const primaryBalance = calculateBalance(primaryFund, txnsForBalance);
    const deductions = computeDeductions(method, amountNum, primaryBalance);
    if (deductions.length <= 1) return null;
    return (
      <div className={styles.deductionPreview}>
        <p className={styles.deductionPreviewTitle}>内訳</p>
        {deductions.map((ded, idx) => {
          const fund = funds.find((f) => f.id === ded.fundId);
          return (
            <div key={idx} className={styles.deductionPreviewRow}>
              <span>{fund?.name}</span>
              <span>¥{formatCurrency(ded.amount)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.parentId);
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const subcategories = selectedCategoryId
    ? categories.filter((c) => c.parentId === selectedCategoryId)
    : [];

  const canSave =
    amount &&
    date &&
    ((kind === 'expense' && selectedMethodId && selectedCategoryId) ||
      (kind === 'income' && selectedFundId && selectedIncomeCategoryId) ||
      (kind === 'transfer' && fromFundId && toFundId && fromFundId !== toFundId));

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}
      <div className={styles.scroll}>
        <div className={styles.kindToggle}>
          <button
            onClick={() => setKind('expense')}
            className={`${styles.kindBtn} ${kind === 'expense' ? styles.activeExpense : ''}`}
          >
            支出
          </button>
          <button
            onClick={() => setKind('income')}
            className={`${styles.kindBtn} ${kind === 'income' ? styles.activeIncome : ''}`}
          >
            収入
          </button>
          <button
            onClick={() => setKind('transfer')}
            className={`${styles.kindBtn} ${kind === 'transfer' ? styles.activeTransfer : ''}`}
          >
            振替
          </button>
        </div>

        <div className={styles.amountCard}>
          <p className={styles.amountLabel}>金額</p>
          <p className={styles.amountValue}>
            ¥{amount ? formatCurrency(parseInt(amount) || 0) : '0'}
          </p>
        </div>

        <NumberPad value={amount} onChange={setAmount} />

        {kind === 'expense' && (
          <>
            <div>
              <label className={styles.fieldLabel}>支払い方法</label>
              <div className={styles.chips}>
                {methods.map((method) => (
                  <Chip
                    key={method.id}
                    label={method.name}
                    selected={selectedMethodId === method.id}
                    onClick={() => setSelectedMethodId(method.id)}
                  />
                ))}
              </div>
            </div>

            {getDeductionPreview()}

            <div>
              <label className={styles.fieldLabel}>カテゴリ</label>
              <div className={styles.chips}>
                {expenseCategories.map((cat) => (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    selected={selectedCategoryId === cat.id}
                    onClick={() => { setSelectedCategoryId(cat.id); setSelectedSubId(''); }}
                  />
                ))}
              </div>
              {selectedCategoryId && (() => {
                const budget = budgets.find(b => b.categoryId === selectedCategoryId);
                if (!budget) return null;
                const { start, end } = getCurrentMonthRange();
                const spent = transactions
                  .filter(t => t.kind === 'expense' && t.categoryId === selectedCategoryId && t.date >= start && t.date <= end)
                  .reduce((s, t) => s + t.amount, 0);
                const remaining = budget.amount - spent;
                const isOver = remaining < 0;
                return (
                  <p className={`${styles.budgetHint} ${isOver ? styles.budgetHintOver : ''}`}>
                    今月の残り予算：{isOver
                      ? `¥${formatCurrency(Math.abs(remaining))} オーバー`
                      : `¥${formatCurrency(remaining)} / ¥${formatCurrency(budget.amount)}`}
                  </p>
                );
              })()}
            </div>

            {subcategories.length > 0 && (
              <div>
                <label className={styles.fieldLabel}>小分類（任意）</label>
                <div className={styles.chips}>
                  {subcategories.map((sub) => (
                    <Chip
                      key={sub.id}
                      label={sub.name}
                      selected={selectedSubId === sub.id}
                      onClick={() => setSelectedSubId(sub.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {kind === 'income' && (
          <>
            <div>
              <label className={styles.fieldLabel}>入金先</label>
              <div className={styles.chips}>
                {funds.map((fund) => (
                  <Chip
                    key={fund.id}
                    label={fund.name}
                    selected={selectedFundId === fund.id}
                    onClick={() => setSelectedFundId(fund.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={styles.fieldLabel}>カテゴリ</label>
              <div className={styles.chips}>
                {incomeCategories.map((cat) => (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    selected={selectedIncomeCategoryId === cat.id}
                    onClick={() => setSelectedIncomeCategoryId(cat.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {kind === 'transfer' && (
          <>
            <div>
              <label className={styles.fieldLabel}>移動元</label>
              <div className={styles.chips}>
                {funds.map((fund) => (
                  <Chip
                    key={fund.id}
                    label={fund.name}
                    selected={fromFundId === fund.id}
                    onClick={() => setFromFundId(fund.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={styles.fieldLabel}>移動先</label>
              <div className={styles.chips}>
                {funds.map((fund) => (
                  <Chip
                    key={fund.id}
                    label={fund.name}
                    selected={toFundId === fund.id}
                    onClick={() => setToFundId(fund.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <div>
          <label className={styles.fieldLabel}>日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.input}
          />
        </div>

        <div>
          <label className={styles.fieldLabel}>メモ（任意）</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを入力"
            className={styles.input}
          />
        </div>

        <button onClick={handleSave} disabled={!canSave} className={styles.saveBtn}>
          {editingTxn ? '更新' : '保存'}
        </button>
      </div>
    </div>
  );
}
