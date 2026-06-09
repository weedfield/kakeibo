import { useState, useEffect } from 'react';
import { getAllTransactions, getAllFunds, getAllPaymentMethods, getAllCategories, deleteTransaction } from '../data/db';
import { formatCurrency, formatDateWithDay } from '../core/utils';
import type { Txn, Fund, PaymentMethod, Category } from '../core/types';
import styles from './HistoryScreen.module.css'

interface HistoryScreenProps {
  onEditTxn: (txn: Txn) => void;
}

export function HistoryScreen({ onEditTxn }: HistoryScreenProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<Txn | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [year, month]);

  const loadData = async () => {
    const [txnsData, fundsData, methodsData, categoriesData] = await Promise.all([
      getAllTransactions(), getAllFunds(), getAllPaymentMethods(), getAllCategories(),
    ]);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setTransactions(txnsData.filter(t => t.date >= startDate && t.date <= endDate));
    setFunds(fundsData);
    setMethods(methodsData);
    setCategories(categoriesData);
  };

  const goToPrevMonth = () => { month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1); };
  const goToNextMonth = () => { month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1); };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteTransaction(confirmDeleteId);
    setConfirmDeleteId(null);
    setSelectedTxn(null);
    await loadData();
  };

  const groupedByDate = transactions.reduce((acc, txn) => {
    if (!acc[txn.date]) acc[txn.date] = [];
    acc[txn.date].push(txn);
    return acc;
  }, {} as Record<string, Txn[]>);

  const dates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const getDetail = (txn: Txn) => {
    if (txn.kind === 'income') {
      return `${funds.find(f => f.id === txn.fundId)?.name} / ${categories.find(c => c.id === txn.categoryId)?.name}`;
    } else if (txn.kind === 'expense') {
      return `${methods.find(m => m.id === txn.methodId)?.name} / ${categories.find(c => c.id === txn.categoryId)?.name}`;
    } else {
      return `${funds.find(f => f.id === txn.fromFundId)?.name} → ${funds.find(f => f.id === txn.toFundId)?.name}`;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.monthNav}>
        <button className={styles.monthNavBtn} onClick={goToPrevMonth}>← 前月</button>
        <h2 className={styles.monthLabel}>{year}年{month}月</h2>
        <button className={styles.monthNavBtn} onClick={goToNextMonth}>翌月 →</button>
      </div>

      <div className={styles.list}>
        {dates.length === 0 && <p className={styles.empty}>この月に記録はありません</p>}
        {dates.map(date => (
          <div key={date} className={styles.dateGroup}>
            <p className={styles.dateLabel}>{formatDateWithDay(date)}</p>
            <div className={styles.dateCard}>
              {groupedByDate[date].map(txn => (
                <button key={txn.id} className={styles.txnRow} onClick={() => setSelectedTxn(txn)}>
                  <div className={styles.txnLeft}>
                    <p className={`${styles.txnKind} ${styles[txn.kind]}`}>
                      {txn.kind === 'income' && '収入'}
                      {txn.kind === 'expense' && '支出'}
                      {txn.kind === 'transfer' && '振替'}
                    </p>
                    <p className={styles.txnMeta}>{getDetail(txn)}</p>
                    {txn.memo && <p className={styles.txnMemo}>{txn.memo}</p>}
                  </div>
                  <p className={`${styles.txnAmount} ${styles[txn.kind]}`}>
                    {txn.kind === 'income' && '+'}
                    {txn.kind === 'expense' && '-'}
                    ¥{formatCurrency(txn.amount)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {confirmDeleteId && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <p className={styles.confirmTitle}>この取引を削除しますか？</p>
            <p className={styles.confirmDesc}>削除すると元に戻せません</p>
            <div className={styles.confirmBtns}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDeleteId(null)}>キャンセル</button>
              <button className={styles.deleteBtn} onClick={handleDelete}>削除</button>
            </div>
          </div>
        </div>
      )}

      {selectedTxn && (
        <div className={styles.detailOverlay} onClick={() => setSelectedTxn(null)}>
          <div className={styles.detailSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <div>
                <p className={`${styles.detailKind} ${styles[selectedTxn.kind]}`}>
                  {selectedTxn.kind === 'income' && '収入'}
                  {selectedTxn.kind === 'expense' && '支出'}
                  {selectedTxn.kind === 'transfer' && '振替'}
                </p>
                <p className={styles.detailDate}>{formatDateWithDay(selectedTxn.date)}</p>
              </div>
              <p className={styles.detailAmount}>¥{formatCurrency(selectedTxn.amount)}</p>
            </div>

            {selectedTxn.kind === 'expense' && selectedTxn.deductions.length > 1 && (
              <div className={styles.deductionBox}>
                <p className={styles.deductionTitle}>内訳</p>
                {selectedTxn.deductions.map((ded, i) => (
                  <div key={i} className={styles.deductionRow}>
                    <span>{funds.find(f => f.id === ded.fundId)?.name}</span>
                    <span>¥{formatCurrency(ded.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedTxn.memo && (
              <div>
                <p className={styles.memoLabel}>メモ</p>
                <p className={styles.memoText}>{selectedTxn.memo}</p>
              </div>
            )}

            <div className={styles.detailBtns}>
              <button className={styles.editBtn} onClick={() => onEditTxn(selectedTxn)}>編集</button>
              <button className={styles.deleteBtn2} onClick={() => setConfirmDeleteId(selectedTxn.id)}>削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
