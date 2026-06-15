import type { Fund, PaymentMethod, Category } from '../core/types';
import { auth } from './firebase';
import {
  addFund,
  addPaymentMethod,
  addCategory,
} from './db';

export async function initializeSeedData(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const key = `kakeibo_seeded_${uid}`;
  if (localStorage.getItem(key)) return;


  // 資金の作成
  const funds: Fund[] = [
    {
      id: 'fund-cash',
      name: '現金',
      type: 'cash',
      initialBalance: 0,
    },
    {
      id: 'fund-bank',
      name: '銀行口座',
      type: 'bank',
      initialBalance: 0,
    },
    {
      id: 'fund-rakuten-cash',
      name: '楽天キャッシュ',
      type: 'prepaid',
      initialBalance: 0,
    },
    {
      id: 'fund-nanaco',
      name: 'nanaco',
      type: 'prepaid',
      initialBalance: 0,
    },
    {
      id: 'fund-suica',
      name: 'Suica',
      type: 'prepaid',
      initialBalance: 0,
    },
  ];

  for (const fund of funds) {
    await addFund(fund);
  }

  // 支払い方法の作成
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'method-cash',
      name: '現金',
      primaryFundId: 'fund-cash',
      fallbackFundId: null,
      splitMode: 'single',
    },
    {
      id: 'method-rakuten-pay',
      name: '楽天ペイ',
      primaryFundId: 'fund-rakuten-cash',
      fallbackFundId: 'fund-bank',
      splitMode: 'chargeFirst',
    },
    {
      id: 'method-nanaco',
      name: 'nanaco',
      primaryFundId: 'fund-nanaco',
      fallbackFundId: null,
      splitMode: 'single',
    },
    {
      id: 'method-suica',
      name: 'Suica',
      primaryFundId: 'fund-suica',
      fallbackFundId: null,
      splitMode: 'single',
    },
    {
      id: 'method-credit-card',
      name: 'クレジットカード',
      primaryFundId: 'fund-bank',
      fallbackFundId: null,
      splitMode: 'single',
    },
  ];

  for (const method of paymentMethods) {
    await addPaymentMethod(method);
  }

  // カテゴリの作成
  const categories: Category[] = [
    // 収入カテゴリ
    { id: 'income-salary', name: '給与', type: 'income', parentId: null },
    { id: 'income-side-job', name: '副業', type: 'income', parentId: null },
    { id: 'income-other', name: 'その他', type: 'income', parentId: null },

    // 支出カテゴリ（大分類）
    { id: 'expense-food', name: '食費', type: 'expense', parentId: null },
    { id: 'expense-daily', name: '日用品', type: 'expense', parentId: null },
    { id: 'expense-beauty', name: '美容', type: 'expense', parentId: null },
    { id: 'expense-transport', name: '交通', type: 'expense', parentId: null },
    { id: 'expense-social', name: '交際費', type: 'expense', parentId: null },
    { id: 'expense-hobby', name: '趣味', type: 'expense', parentId: null },
    { id: 'expense-communication', name: '通信', type: 'expense', parentId: null },
    { id: 'expense-other', name: 'その他', type: 'expense', parentId: null },

    // 食費の小分類
    {
      id: 'expense-food-restaurant',
      name: '外食',
      type: 'expense',
      parentId: 'expense-food',
    },
    {
      id: 'expense-food-supermarket',
      name: 'スーパー',
      type: 'expense',
      parentId: 'expense-food',
    },
  ];

  for (const category of categories) {
    await addCategory(category);
  }

  localStorage.setItem(key, '1');
}
