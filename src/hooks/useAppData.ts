import { useState, useEffect, useCallback } from 'react';
import {
  getAllFunds,
  getAllPaymentMethods,
  getAllCategories,
  getAllTransactions,
  getAllBudgets,
} from '../data/db';
import type { Fund, PaymentMethod, Category, Txn, Budget } from '../core/types';

export interface AppData {
  funds: Fund[];
  methods: PaymentMethod[];
  categories: Category[];
  transactions: Txn[];
  budgets: Budget[];
  reload: () => Promise<void>;
}

export function useAppData(): AppData {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const reload = useCallback(async () => {
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
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { funds, methods, categories, transactions, budgets, reload };
}
