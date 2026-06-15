import {
  getAllRecurringTxns,
  updateRecurringTxn,
  addTransaction,
  getAllFunds,
  getAllTransactions,
  getAllPaymentMethods,
} from './db';
import { computeDeductions, calculateBalance } from '../core/logic';
import { generateId } from '../core/utils';

export async function executeRecurringTransactions(): Promise<void> {
  const [recurring, funds, txns, methods] = await Promise.all([
    getAllRecurringTxns(),
    getAllFunds(),
    getAllTransactions(),
    getAllPaymentMethods(),
  ]);

  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const currentYM = `${y}-${String(m).padStart(2, '0')}`;
  const todayDay = today.getDate();
  const daysInMonth = new Date(y, m, 0).getDate();

  for (const rec of recurring) {
    if (rec.lastExecutedYearMonth === currentYM) continue;
    // 0=月初(1日), 32=月末(月の最終日), 1-31=指定日(月の日数に収まるようclamp)
    const execDay = rec.dayOfMonth === 0 ? 1
      : rec.dayOfMonth >= 32 ? daysInMonth
      : Math.min(rec.dayOfMonth, daysInMonth);
    if (todayDay < execDay) continue;

    const dateStr = `${currentYM}-${String(execDay).padStart(2, '0')}`;

    if (rec.kind === 'expense' && rec.methodId && rec.categoryId) {
      const method = methods.find(m => m.id === rec.methodId);
      if (!method) continue;
      const primaryFund = funds.find(f => f.id === method.primaryFundId);
      if (!primaryFund) continue;
      const primaryBalance = calculateBalance(primaryFund, txns);
      const deductions = computeDeductions(method, rec.amount, primaryBalance);
      await addTransaction({
        id: generateId(),
        kind: 'expense',
        date: dateStr,
        amount: rec.amount,
        methodId: rec.methodId,
        categoryId: rec.categoryId,
        subId: rec.subId,
        memo: rec.memo,
        deductions,
      });
    } else if (rec.kind === 'income' && rec.fundId && rec.incomeCategoryId) {
      await addTransaction({
        id: generateId(),
        kind: 'income',
        date: dateStr,
        amount: rec.amount,
        fundId: rec.fundId,
        categoryId: rec.incomeCategoryId,
        memo: rec.memo,
      });
    } else if (rec.kind === 'transfer' && rec.fromFundId && rec.toFundId) {
      await addTransaction({
        id: generateId(),
        kind: 'transfer',
        date: dateStr,
        amount: rec.amount,
        fromFundId: rec.fromFundId,
        toFundId: rec.toFundId,
        memo: rec.memo,
      });
    } else {
      continue;
    }

    await updateRecurringTxn({ ...rec, lastExecutedYearMonth: currentYM });
  }
}
