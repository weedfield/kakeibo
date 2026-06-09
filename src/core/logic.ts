import type { Fund, PaymentMethod, Txn, ExpenseTxn } from './types';

/**
 * 資金の現在残高を計算
 * balance(f) = f.initialBalance
 *            + Σ income.amount         (income.fundId == f.id)
 *            + Σ transfer.amount        (transfer.toFundId == f.id)
 *            - Σ transfer.amount        (transfer.fromFundId == f.id)
 *            - Σ deduction.amount       (expense.deductions[].fundId == f.id)
 */
export function calculateBalance(fund: Fund, transactions: Txn[]): number {
  let balance = fund.initialBalance;

  for (const txn of transactions) {
    if (txn.kind === 'income' && txn.fundId === fund.id) {
      balance += txn.amount;
    } else if (txn.kind === 'transfer') {
      if (txn.toFundId === fund.id) {
        balance += txn.amount;
      }
      if (txn.fromFundId === fund.id) {
        balance -= txn.amount;
      }
    } else if (txn.kind === 'expense') {
      for (const deduction of txn.deductions) {
        if (deduction.fundId === fund.id) {
          balance -= deduction.amount;
        }
      }
    }
  }

  return balance;
}

/**
 * 全資金の残高を計算
 */
export function calculateAllBalances(
  funds: Fund[],
  transactions: Txn[]
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const fund of funds) {
    balances.set(fund.id, calculateBalance(fund, transactions));
  }
  return balances;
}

/**
 * 総資産を計算（全資金の残高の合計）
 */
export function calculateTotalAssets(funds: Fund[], transactions: Txn[]): number {
  const balances = calculateAllBalances(funds, transactions);
  let total = 0;
  for (const balance of balances.values()) {
    total += balance;
  }
  return total;
}

/**
 * 支出の按分を計算（deductionsの決定）
 *
 * computeDeductions(m, amount):
 *   if m.splitMode == "chargeFirst" and m.fallbackFundId != null:
 *     pBal       = balance(m.primaryFundId)
 *     usePrimary = clamp(amount, 0, pBal)
 *     useFallback = amount - usePrimary
 *     deductions = []
 *     if usePrimary  > 0: deductions += { fundId: m.primaryFundId,  amount: usePrimary }
 *     if useFallback > 0: deductions += { fundId: m.fallbackFundId, amount: useFallback }
 *     return deductions
 *   else:
 *     return [ { fundId: m.primaryFundId, amount: amount } ]
 */
export function computeDeductions(
  method: PaymentMethod,
  amount: number,
  primaryBalance: number
): { fundId: string; amount: number }[] {
  if (method.splitMode === 'chargeFirst' && method.fallbackFundId !== null) {
    // チャージ残高優先モード
    const usePrimary = Math.max(0, Math.min(amount, primaryBalance));
    const useFallback = amount - usePrimary;

    const deductions: { fundId: string; amount: number }[] = [];
    if (usePrimary > 0) {
      deductions.push({ fundId: method.primaryFundId, amount: usePrimary });
    }
    if (useFallback > 0) {
      deductions.push({ fundId: method.fallbackFundId, amount: useFallback });
    }
    return deductions;
  } else {
    // 単一資金モード
    return [{ fundId: method.primaryFundId, amount }];
  }
}

/**
 * 期間内の収入合計
 */
export function calculateIncomeTotal(
  transactions: Txn[],
  startDate: string,
  endDate: string
): number {
  return transactions
    .filter(
      txn =>
        txn.kind === 'income' &&
        txn.date >= startDate &&
        txn.date <= endDate
    )
    .reduce((sum, txn) => sum + (txn as any).amount, 0);
}

/**
 * 期間内の支出合計
 */
export function calculateExpenseTotal(
  transactions: Txn[],
  startDate: string,
  endDate: string
): number {
  return transactions
    .filter(
      txn =>
        txn.kind === 'expense' &&
        txn.date >= startDate &&
        txn.date <= endDate
    )
    .reduce((sum, txn) => sum + (txn as any).amount, 0);
}

/**
 * カテゴリ別の収入集計
 */
export function calculateIncomeByCategory(
  transactions: Txn[],
  startDate: string,
  endDate: string
): Map<string, number> {
  const result = new Map<string, number>();

  transactions
    .filter(
      txn =>
        txn.kind === 'income' &&
        txn.date >= startDate &&
        txn.date <= endDate
    )
    .forEach(txn => {
      const income = txn as any;
      const current = result.get(income.categoryId) || 0;
      result.set(income.categoryId, current + income.amount);
    });

  return result;
}

/**
 * カテゴリ別の支出集計
 */
export function calculateExpenseByCategory(
  transactions: Txn[],
  startDate: string,
  endDate: string
): Map<string, number> {
  const result = new Map<string, number>();

  transactions
    .filter(
      txn =>
        txn.kind === 'expense' &&
        txn.date >= startDate &&
        txn.date <= endDate
    )
    .forEach(txn => {
      const expense = txn as ExpenseTxn;
      const current = result.get(expense.categoryId) || 0;
      result.set(expense.categoryId, current + expense.amount);
    });

  return result;
}

/**
 * 支払い方法別の支出集計
 */
export function calculateExpenseByMethod(
  transactions: Txn[],
  startDate: string,
  endDate: string
): Map<string, number> {
  const result = new Map<string, number>();

  transactions
    .filter(
      txn =>
        txn.kind === 'expense' &&
        txn.date >= startDate &&
        txn.date <= endDate
    )
    .forEach(txn => {
      const expense = txn as ExpenseTxn;
      const current = result.get(expense.methodId) || 0;
      result.set(expense.methodId, current + expense.amount);
    });

  return result;
}

/**
 * 資金別の入出金を計算
 */
export function calculateFundFlow(
  fundId: string,
  transactions: Txn[],
  startDate: string,
  endDate: string
): { inflow: number; outflow: number } {
  let inflow = 0;
  let outflow = 0;

  transactions
    .filter(txn => txn.date >= startDate && txn.date <= endDate)
    .forEach(txn => {
      if (txn.kind === 'income' && txn.fundId === fundId) {
        inflow += txn.amount;
      } else if (txn.kind === 'transfer') {
        if (txn.toFundId === fundId) {
          inflow += txn.amount;
        }
        if (txn.fromFundId === fundId) {
          outflow += txn.amount;
        }
      } else if (txn.kind === 'expense') {
        for (const deduction of txn.deductions) {
          if (deduction.fundId === fundId) {
            outflow += deduction.amount;
          }
        }
      }
    });

  return { inflow, outflow };
}
