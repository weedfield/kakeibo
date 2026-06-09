import { useState, useEffect } from 'react';
import { getAllFunds, getAllTransactions } from '../data/db';
import { calculateAllBalances, calculateIncomeTotal, calculateExpenseTotal } from '../core/logic';
import { formatCurrency, getCurrentMonthRange, formatDate } from '../core/utils';
import type { Fund, Txn } from '../core/types';
import styles from './BalanceScreen.module.css'

interface BalanceScreenProps {
  onNavigate: (tab: string) => void;
}

export function BalanceScreen({ onNavigate }: BalanceScreenProps) {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [fundsData, txnsData] = await Promise.all([getAllFunds(), getAllTransactions()]);
    setFunds(fundsData);
    setTransactions(txnsData);
    setBalances(calculateAllBalances(fundsData, txnsData));
    const { start, end } = getCurrentMonthRange();
    setMonthlyIncome(calculateIncomeTotal(txnsData, start, end));
    setMonthlyExpense(calculateExpenseTotal(txnsData, start, end));
  };

  const net = monthlyIncome - monthlyExpense;
  const recentTransactions = transactions.slice(0, 5);
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className={styles.page}>
      <div className={styles.netCard}>
        <p className={styles.netLabel}>{monthLabel}の収支</p>
        <p className={`${styles.netAmount} ${net >= 0 ? styles.income : styles.expense}`}>
          {net >= 0 ? '+' : '−'}¥{formatCurrency(Math.abs(net))}
        </p>
      </div>

      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
          <p className={styles.summaryCardLabel}>収入</p>
          <p className={`${styles.summaryCardAmount} ${styles.incomeAmount}`}>
            ¥{formatCurrency(monthlyIncome)}
          </p>
        </div>
        <div className={`${styles.summaryCard} ${styles.expenseCard}`}>
          <p className={styles.summaryCardLabel}>支出</p>
          <p className={`${styles.summaryCardAmount} ${styles.expenseAmount}`}>
            ¥{formatCurrency(monthlyExpense)}
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardHeaderTitle}>資金残高</h2>
        </div>
        {funds.map((fund) => (
          <div key={fund.id} className={styles.row}>
            <span className={styles.rowLabel}>{fund.name}</span>
            <span className={styles.rowValue}>¥{formatCurrency(balances.get(fund.id) ?? 0)}</span>
          </div>
        ))}
      </div>

      {recentTransactions.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardHeaderTitle}>最近の記録</h2>
            <button onClick={() => onNavigate('history')} className={styles.cardHeaderLink}>
              すべて見る →
            </button>
          </div>
          {recentTransactions.map((txn) => (
            <div key={txn.id} className={styles.row}>
              <div>
                <p className={styles.txnDate}>{formatDate(txn.date)}</p>
                <p className={styles.txnKind}>
                  {txn.kind === 'income' && '収入'}
                  {txn.kind === 'expense' && '支出'}
                  {txn.kind === 'transfer' && '振替'}
                </p>
              </div>
              <p className={`${styles.txnAmount} ${styles[txn.kind]}`}>
                {txn.kind === 'income' && '+'}
                {txn.kind === 'expense' && '−'}
                ¥{formatCurrency(txn.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
