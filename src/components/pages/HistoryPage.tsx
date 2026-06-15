import { useState, useRef } from 'react';
import { deleteTransaction } from '../../data/db';
import { useAppData } from '../../hooks/useAppData';
import { useSwipe } from '../../hooks/useSwipe';
import { formatCurrency, formatDateWithDay } from '../../core/utils';
import type { Txn } from '../../core/types';
import styles from './HistoryPage.module.scss';

type ViewMode = 'calendar' | 'list' | 'year';

interface HistoryPageProps {
  onEditTxn: (txn: Txn) => void;
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const pad = (n: number) => String(n).padStart(2, '0');

export function HistoryPage({ onEditTxn }: HistoryPageProps) {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Txn | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { transactions: allTransactions, funds, methods, categories, reload } = useAppData();

  const goToPrev = () => {
    if (viewMode === 'year') { setYear(y => y - 1); return; }
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  };
  const goToNext = () => {
    if (viewMode === 'year') { setYear(y => y + 1); return; }
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  };

  const swipeHandlers = useSwipe(goToNext, goToPrev);
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetSwipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => { sheetTouchStartY.current = e.touches[0].clientY; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (sheetTouchStartY.current === null) return;
      const dy = e.changedTouches[0].clientY - sheetTouchStartY.current;
      sheetTouchStartY.current = null;
      if (dy > 80) setSelectedTxn(null);
    },
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteTransaction(confirmDeleteId);
    setConfirmDeleteId(null);
    setSelectedTxn(null);
    await reload();
  };

  const monthTxns = allTransactions.filter(t => t.date.startsWith(`${year}-${pad(month)}`));

  const getDetail = (txn: Txn) => {
    if (txn.kind === 'income') {
      return `${funds.find(f => f.id === txn.fundId)?.name} / ${categories.find(c => c.id === txn.categoryId)?.name}`;
    } else if (txn.kind === 'expense') {
      return `${methods.find(m => m.id === txn.methodId)?.name} / ${categories.find(c => c.id === txn.categoryId)?.name}`;
    } else {
      return `${funds.find(f => f.id === txn.fromFundId)?.name} → ${funds.find(f => f.id === txn.toFundId)?.name}`;
    }
  };

  const TxnRow = ({ txn }: { txn: Txn }) => (
    <button className={styles.txnRow} onClick={() => setSelectedTxn(txn)}>
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
        ¥{formatCurrency(txn.amount)}
      </p>
    </button>
  );

  const renderList = () => {
    const grouped = monthTxns.reduce((acc, txn) => {
      if (!acc[txn.date]) acc[txn.date] = [];
      acc[txn.date].push(txn);
      return acc;
    }, {} as Record<string, Txn[]>);
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    return (
      <div className={styles.list}>
        {dates.length === 0 && <p className={styles.empty}>この月に記録はありません</p>}
        {dates.map(date => {
          const txns = grouped[date];
          const dayNet = txns.reduce((s, t) =>
            t.kind === 'income' ? s + t.amount : t.kind === 'expense' ? s - t.amount : s, 0);
          return (
            <div key={date} className={styles.dateGroup}>
              <div className={styles.dateLabel}>
                <span>{formatDateWithDay(date)}</span>
                {dayNet !== 0 && (
                  <span className={dayNet > 0 ? styles.dayIncome : styles.dayExpense}>
                    {dayNet > 0 ? '+' : ''}¥{formatCurrency(Math.abs(dayNet))}
                  </span>
                )}
              </div>
              <div className={styles.dateCard}>
                {txns.map(txn => <TxnRow key={txn.id} txn={txn} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendar = () => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const txnsByDate = new Map<string, Txn[]>();
    monthTxns.forEach(txn => {
      const list = txnsByDate.get(txn.date) || [];
      txnsByDate.set(txn.date, [...list, txn]);
    });

    const cells: Array<{ day: number; date: string; txns: Txn[] } | null> = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const date = `${year}-${pad(month)}-${pad(d)}`;
        return { day: d, date, txns: txnsByDate.get(date) || [] };
      }),
    ];

    const selectedTxns = selectedDate ? (txnsByDate.get(selectedDate) || []) : [];

    return (
      <div className={styles.calendarWrap}>
        <div className={styles.calGrid}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`${styles.calDayLabel} ${i === 0 ? styles.sun : i === 6 ? styles.sat : ''}`}>{d}</div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} />;
            const hasIncome = cell.txns.some(t => t.kind === 'income');
            const hasExpense = cell.txns.some(t => t.kind === 'expense');
            const isSelected = selectedDate === cell.date;
            const dow = (firstDay + cell.day - 1) % 7;
            return (
              <button
                key={cell.date}
                className={`${styles.calCell} ${isSelected ? styles.calCellSelected : ''}`}
                onClick={() => setSelectedDate(isSelected ? null : cell.date)}
              >
                <span className={`${styles.calDayNum} ${dow === 0 ? styles.sun : dow === 6 ? styles.sat : ''}`}>
                  {cell.day}
                </span>
                <span className={styles.calDots}>
                  {hasIncome && <span className={styles.dotIncome} />}
                  {hasExpense && <span className={styles.dotExpense} />}
                </span>
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className={styles.calDetail}>
            <div className={styles.calDetailDate}>
              <span>{formatDateWithDay(selectedDate)}</span>
              {selectedTxns.length > 0 && (() => {
                const dayNet = selectedTxns.reduce((s, t) =>
                  t.kind === 'income' ? s + t.amount : t.kind === 'expense' ? s - t.amount : s, 0);
                return dayNet !== 0 ? (
                  <span className={dayNet > 0 ? styles.dayIncome : styles.dayExpense}>
                    {dayNet > 0 ? '+' : ''}¥{formatCurrency(Math.abs(dayNet))}
                  </span>
                ) : null;
              })()}
            </div>
            {selectedTxns.length === 0
              ? <p className={styles.empty}>取引なし</p>
              : <div className={styles.dateCard}>
                  {selectedTxns.map(txn => <TxnRow key={txn.id} txn={txn} />)}
                </div>
            }
          </div>
        )}
      </div>
    );
  };

  const renderYear = () => {
    const rows = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const mTxns = allTransactions.filter(t => t.date.startsWith(`${year}-${pad(m)}`));
      const income = mTxns.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = mTxns.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
      return { m, income, expense };
    });

    return (
      <div className={styles.list}>
        <div className={styles.yearCard}>
          <div className={styles.yearHeader}>
            <span className={styles.yearColMonth} />
            <span className={styles.yearColLabel}>収入</span>
            <span className={styles.yearColLabel}>支出</span>
          </div>
          {rows.map(({ m, income, expense }) => (
            <button
              key={m}
              className={styles.yearRow}
              onClick={() => { setMonth(m); setViewMode('list'); }}
            >
              <span className={styles.yearMonth}>{m}月</span>
              <span className={`${styles.yearIncome} ${income === 0 ? styles.muted : ''}`}>
                {income > 0 ? `¥${formatCurrency(income)}` : '─'}
              </span>
              <span className={`${styles.yearExpense} ${expense === 0 ? styles.muted : ''}`}>
                {expense > 0 ? `¥${formatCurrency(expense)}` : '─'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const periodLabel = viewMode === 'year' ? `${year}年` : `${year}年${month}月`;

  return (
    <div className={styles.page} {...swipeHandlers}>
      <div className={styles.headerWrap}>
        <div className={styles.viewToggle}>
          {([['calendar', '日別'], ['list', '月別'], ['year', '年別']] as [ViewMode, string][]).map(([id, label]) => (
            <button
              key={id}
              className={`${styles.viewBtn} ${viewMode === id ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.monthNav}>
          <button className={styles.monthNavBtn} onClick={goToPrev}>← 前{viewMode === 'year' ? '年' : '月'}</button>
          <span className={styles.monthLabel}>{periodLabel}</span>
          <button className={styles.monthNavBtn} onClick={goToNext}>次{viewMode === 'year' ? '年' : '月'} →</button>
        </div>
      </div>

      {viewMode === 'list' && renderList()}
      {viewMode === 'calendar' && renderCalendar()}
      {viewMode === 'year' && renderYear()}

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
          <div className={styles.detailSheet} onClick={e => e.stopPropagation()} {...sheetSwipeHandlers}>
            <div className={styles.dragHandle} />
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
