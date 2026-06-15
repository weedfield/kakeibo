import { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { useSwipe } from '../../hooks/useSwipe';
import { DonutChart } from '../molecules/DonutChart';
import type { PieItem } from '../molecules/DonutChart';
import { IconChevronDown } from '../atoms/Icon';
import {
  calculateAllBalances,
  calculateIncomeTotal,
  calculateExpenseTotal,
  calculateIncomeByCategory,
  calculateExpenseByCategory,
  calculateExpenseByMethod,
  calculateFundFlow,
} from '../../core/logic';
import { formatCurrency } from '../../core/utils';
import styles from './AnalyticsPage.module.scss';

type PeriodMode = 'month' | 'year';
type ViewMode = 'monthly' | 'category' | 'fund' | 'method';

const EXPENSE_COLORS = [
  '#e57373', '#f09858', '#ffd54f', '#4fc3f7',
  '#7986cb', '#ba68c8', '#f06292', '#a1887f',
  '#90a4ae', '#ef9a9a',
];

const INCOME_COLORS = [
  '#66bb6a', '#26a69a', '#9ccc65', '#29b6f6',
  '#42a5f5', '#26c6da', '#d4e157', '#ffa726',
  '#8d6e63', '#7e57c2',
];

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month, 0).getDate();
  const padded = String(month).padStart(2, '0');
  return {
    start: `${year}-${padded}-01`,
    end: `${year}-${padded}-${String(lastDay).padStart(2, '0')}`,
  };
}

function getYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function AnalyticsPage() {
  const now = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [categoryViewType, setCategoryViewType] = useState<'income' | 'expense'>('expense');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { funds, methods, categories, transactions } = useAppData();
  const allBalances = calculateAllBalances(funds, transactions);

  const { start, end } = periodMode === 'month'
    ? getMonthRange(year, month)
    : getYearRange(year);

  const periodLabel = periodMode === 'month' ? `${year}年${month}月` : `${year}年`;

  const goToPrev = () => {
    if (periodMode === 'month') {
      if (month === 1) { setYear(y => y - 1); setMonth(12); }
      else setMonth(m => m - 1);
    } else {
      setYear(y => y - 1);
    }
  };

  const goToNext = () => {
    if (periodMode === 'month') {
      if (month === 12) { setYear(y => y + 1); setMonth(1); }
      else setMonth(m => m + 1);
    } else {
      setYear(y => y + 1);
    }
  };

  const swipeHandlers = useSwipe(goToNext, goToPrev);

  const incomeTotal = calculateIncomeTotal(transactions, start, end);
  const expenseTotal = calculateExpenseTotal(transactions, start, end);
  const net = incomeTotal - expenseTotal;

  const getMonthlyBreakdown = () =>
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const { start: s, end: e } = getMonthRange(year, m);
      return {
        month: m,
        income: calculateIncomeTotal(transactions, s, e),
        expense: calculateExpenseTotal(transactions, s, e),
      };
    });

  const incomeByCat = calculateIncomeByCategory(transactions, start, end);
  const expenseByCat = calculateExpenseByCategory(transactions, start, end);
  const expenseByMethod = calculateExpenseByMethod(transactions, start, end);

  const renderCategoryBars = (dataMap: Map<string, number>, catType: 'income' | 'expense') => {
    const parentCats = categories.filter(c => c.type === catType && !c.parentId);
    const total = Array.from(dataMap.values()).reduce((s, v) => s + v, 0);

    if (total === 0) {
      return <p className={styles.noData}>データなし</p>;
    }

    const parentAmounts = parentCats
      .map(cat => {
        const children = categories.filter(c => c.parentId === cat.id);
        const direct = dataMap.get(cat.id) || 0;
        const childTotal = children.reduce((s, c) => s + (dataMap.get(c.id) || 0), 0);
        return { cat, amount: direct + childTotal };
      })
      .filter(({ amount }) => amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const max = Math.max(...parentAmounts.map(({ amount }) => amount));
    const palette = catType === 'income' ? INCOME_COLORS : EXPENSE_COLORS;
    const pieItems: PieItem[] = parentAmounts.map(({ cat, amount }, i) => ({
      label: cat.name,
      amount,
      color: palette[i % palette.length],
    }));

    return (
      <div>
        <div className={styles.pieWrap}>
          <DonutChart items={pieItems} total={total} />
          <div className={styles.legend}>
            {pieItems.map((item, i) => (
              <div key={i} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                <span className={styles.legendLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.barSection}>
          {parentAmounts.map(({ cat, amount }, i) => {
            const color = palette[i % palette.length];
            const isOpen = expandedCats.has(cat.id);
            const childIds = categories.filter(c => c.parentId === cat.id).map(c => c.id);
            const catTxns = transactions
              .filter(txn => {
                if (txn.date < start || txn.date > end) return false;
                if (catType === 'income') return txn.kind === 'income' && txn.categoryId === cat.id;
                return txn.kind === 'expense' && (txn.categoryId === cat.id || childIds.includes(txn.categoryId));
              })
              .sort((a, b) => b.date.localeCompare(a.date));
            return (
              <div key={cat.id} className={styles.barRow}>
                <button className={styles.barHeader} onClick={() => toggleCat(cat.id)}>
                  <span className={styles.barName}>{cat.name}</span>
                  <span className={styles.barValueRow}>
                    <span className={styles.barValue}>
                      ¥{formatCurrency(amount)}
                      <span className={styles.barPct}>
                        ({Math.round((amount / total) * 100)}%)
                      </span>
                    </span>
                    <IconChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
                  </span>
                </button>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(amount / max) * 100}%`, backgroundColor: color }} />
                </div>
                {isOpen && (
                  <div className={styles.accordion}>
                    {catTxns.length === 0 ? (
                      <p className={styles.accordionEmpty}>取引なし</p>
                    ) : catTxns.map(txn => {
                      const [, mm, dd] = txn.date.split('-');
                      const subCat = txn.kind === 'expense' && txn.subId
                        ? categories.find(c => c.id === txn.subId)
                        : null;
                      const label = subCat ? subCat.name : (txn.memo || '─');
                      const sub = subCat && txn.memo ? txn.memo : null;
                      return (
                        <div key={txn.id} className={styles.accordionRow}>
                          <span className={styles.accordionDate}>{parseInt(mm)}月{parseInt(dd)}日</span>
                          <span className={styles.accordionLabel}>
                            {label}
                            {sub && <span className={styles.accordionMemo}>{sub}</span>}
                          </span>
                          <span className={`${styles.accordionAmount} ${catType === 'income' ? styles.income : styles.expense}`}>
                            ¥{formatCurrency(txn.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMethodBars = () => {
    const methodTotal = Array.from(expenseByMethod.values()).reduce((s, v) => s + v, 0);
    const entries = methods
      .map(m => ({ method: m, amount: expenseByMethod.get(m.id) || 0 }))
      .filter(({ amount }) => amount > 0)
      .sort((a, b) => b.amount - a.amount);

    if (entries.length === 0) {
      return <p className={styles.noData}>データなし</p>;
    }

    const max = Math.max(...entries.map(({ amount }) => amount));

    return (
      <div className={styles.barSection}>
        {entries.map(({ method, amount }) => (
          <div key={method.id} className={styles.barRow}>
            <div className={styles.barHeader}>
              <span className={styles.barName}>{method.name}</span>
              <span className={styles.barValue}>
                ¥{formatCurrency(amount)}
                {methodTotal > 0 && (
                  <span className={styles.barPct}>
                    ({Math.round((amount / methodTotal) * 100)}%)
                  </span>
                )}
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${(amount / max) * 100}%`, backgroundColor: 'var(--expense)' }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.page} {...swipeHandlers}>
      <div className={styles.header}>
        <div className={styles.periodToggle}>
          {(['month', 'year'] as PeriodMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setPeriodMode(mode)}
              className={`${styles.periodBtn} ${periodMode === mode ? styles.active : ''}`}
            >
              {mode === 'month' ? '月' : '年'}
            </button>
          ))}
        </div>

        <div className={styles.periodNav}>
          <button onClick={goToPrev} className={styles.periodNavBtn}>← 前</button>
          <span className={styles.periodLabel}>{periodLabel}</span>
          <button onClick={goToNext} className={styles.periodNavBtn}>次 →</button>
        </div>

        <div className={styles.viewToggle}>
          {([
            { id: 'monthly', label: '月別' },
            { id: 'category', label: 'カテゴリ別' },
            { id: 'fund', label: '資金別' },
            { id: 'method', label: '方法別' },
          ] as { id: ViewMode; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`${styles.viewBtn} ${viewMode === id ? styles.active : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {viewMode === 'monthly' && (
          <>
            {periodMode === 'month' ? (
              <>
                <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
                  <span className={styles.summaryLabel}>収入</span>
                  <span className={`${styles.summaryValue} ${styles.income}`}>
                    ¥{formatCurrency(incomeTotal)}
                  </span>
                </div>
                <div className={`${styles.summaryCard} ${styles.expenseCard}`}>
                  <span className={styles.summaryLabel}>支出</span>
                  <span className={`${styles.summaryValue} ${styles.expense}`}>
                    ¥{formatCurrency(expenseTotal)}
                  </span>
                </div>
                <div className={`${styles.summaryCard} ${styles.netCard}`}>
                  <span className={styles.summaryLabel}>収支</span>
                  <span className={`${styles.summaryValue} ${net >= 0 ? styles.pos : styles.neg}`}>
                    {net < 0 ? '−' : ''}¥{formatCurrency(Math.abs(net))}
                  </span>
                </div>
              </>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>月</th>
                    <th className={styles.right}>収入</th>
                    <th className={styles.right}>支出</th>
                    <th className={styles.right}>収支</th>
                  </tr>
                </thead>
                <tbody>
                  {getMonthlyBreakdown().map(({ month: m, income, expense }) => {
                    const n = income - expense;
                    const hasData = income > 0 || expense > 0;
                    return (
                      <tr key={m}>
                        <td>{m}月</td>
                        <td className={`${styles.right} ${styles.tdIncome}`}>
                          {income > 0 ? `¥${formatCurrency(income)}` : '─'}
                        </td>
                        <td className={`${styles.right} ${styles.tdExpense}`}>
                          {expense > 0 ? `¥${formatCurrency(expense)}` : '─'}
                        </td>
                        <td className={`${styles.right} ${!hasData ? styles.tdMuted : n >= 0 ? styles.tdIncome : styles.tdExpense}`}>
                          {!hasData ? '─' : `${n < 0 ? '−' : ''}¥${formatCurrency(Math.abs(n))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>合計</td>
                    <td className={`${styles.right} ${styles.tdIncome}`}>¥{formatCurrency(incomeTotal)}</td>
                    <td className={`${styles.right} ${styles.tdExpense}`}>¥{formatCurrency(expenseTotal)}</td>
                    <td className={`${styles.right} ${net >= 0 ? styles.tdIncome : styles.tdExpense}`}>
                      {net < 0 ? '−' : ''}¥{formatCurrency(Math.abs(net))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        )}

        {viewMode === 'category' && (
          <>
            <div className={styles.catTypeToggle}>
              {(['expense', 'income'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCategoryViewType(type)}
                  className={`${styles.catTypeBtn} ${
                    categoryViewType === type
                      ? type === 'expense' ? styles.activeExpense : styles.activeIncome
                      : ''
                  }`}
                >
                  {type === 'expense' ? '支出' : '収入'}
                </button>
              ))}
            </div>
            <div className={styles.catCard}>
              {categoryViewType === 'expense'
                ? renderCategoryBars(expenseByCat, 'expense')
                : renderCategoryBars(incomeByCat, 'income')}
            </div>
          </>
        )}

        {viewMode === 'fund' && (
          <div className={styles.fundCard}>
            {funds.map(fund => {
              const { inflow, outflow } = calculateFundFlow(fund.id, transactions, start, end);
              const balance = allBalances.get(fund.id) || 0;
              return (
                <div key={fund.id} className={styles.fundRow}>
                  <p className={styles.fundName}>{fund.name}</p>
                  <div className={styles.fundGrid}>
                    <div className={`${styles.fundStat} ${styles.inflow}`}>
                      <p className={styles.fundStatLabel}>入</p>
                      <p className={`${styles.fundStatValue} ${styles.income}`}>
                        ¥{formatCurrency(inflow)}
                      </p>
                    </div>
                    <div className={`${styles.fundStat} ${styles.outflow}`}>
                      <p className={styles.fundStatLabel}>出</p>
                      <p className={`${styles.fundStatValue} ${styles.expense}`}>
                        ¥{formatCurrency(outflow)}
                      </p>
                    </div>
                    <div className={`${styles.fundStat} ${styles.balance}`}>
                      <p className={styles.fundStatLabel}>残高</p>
                      <p className={`${styles.fundStatValue} ${styles.neutral}`}>
                        ¥{formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'method' && (
          <div className={styles.catCard}>
            {renderMethodBars()}
          </div>
        )}
      </div>
    </div>
  );
}
