import { useAppData } from '../../hooks/useAppData';
import { calculateAllBalances, calculateIncomeTotal, calculateExpenseTotal } from '../../core/logic';
import { formatCurrency, getCurrentMonthRange } from '../../core/utils';
import type { Category } from '../../core/types';
import styles from './BalancePage.module.scss';

interface BalancePageProps {
  onNavigate: (tab: string) => void;
}

export function BalancePage(_: BalancePageProps) {
  const { funds, transactions, budgets, categories } = useAppData();

  const balances = calculateAllBalances(funds, transactions);
  const { start, end } = getCurrentMonthRange();
  const monthlyIncome = calculateIncomeTotal(transactions, start, end);
  const monthlyExpense = calculateExpenseTotal(transactions, start, end);

  const spentMap = new Map<string, number>();
  transactions
    .filter(t => t.kind === 'expense' && t.date >= start && t.date <= end)
    .forEach(t => {
      if (t.kind === 'expense') spentMap.set(t.categoryId, (spentMap.get(t.categoryId) || 0) + t.amount);
    });
  const budgetRows = budgets
    .filter(b => b.amount > 0)
    .map(b => ({
      cat: categories.find(c => c.id === b.categoryId) as Category,
      budget: b.amount,
      spent: spentMap.get(b.categoryId) || 0,
    }))
    .filter(r => r.cat);

  const net = monthlyIncome - monthlyExpense;
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className={styles.page}>
      <div className={styles.netCard}>
        <p className={styles.netLabel}>{monthLabel}の収支</p>
        <p className={`${styles.netAmount} ${net >= 0 ? styles.income : styles.expense}`}>
          {net < 0 ? '−' : ''}¥{formatCurrency(Math.abs(net))}
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

      {budgetRows.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardHeaderTitle}>今月の予算</h2>
          </div>
          {budgetRows.map(({ cat, budget, spent }) => {
            const pct = Math.min((spent / budget) * 100, 100);
            const color = pct < 70 ? 'var(--income)' : pct < 90 ? '#f59e0b' : 'var(--expense)';
            const remaining = budget - spent;
            return (
              <div key={cat.id} className={styles.budgetRow}>
                <div className={styles.budgetRowHeader}>
                  <span className={styles.rowLabel}>{cat.name}</span>
                  <span className={styles.budgetRemaining} style={{ color: remaining < 0 ? 'var(--expense)' : 'var(--stone-500)' }}>
                    {remaining < 0 ? `¥${formatCurrency(Math.abs(remaining))} オーバー` : `残り ¥${formatCurrency(remaining)}`}
                  </span>
                </div>
                <div className={styles.budgetTrack}>
                  <div className={styles.budgetFill} style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <div className={styles.budgetMeta}>
                  <span>¥{formatCurrency(spent)}</span>
                  <span>¥{formatCurrency(budget)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
