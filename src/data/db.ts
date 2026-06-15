import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { firestoreDb, auth } from './firebase';
import type { Fund, PaymentMethod, Category, Txn, Budget, RecurringTxn } from '../core/types';

function uid(): string {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  return u.uid;
}

// Mapsアプリと同一Firebaseプロジェクトを共有するため、
// コレクション名を kakeibo_ プレフィックスで分離している。
// Mapsアプリが使うコレクション: spots, categories
// 家計アプリが使うコレクション: kakeibo_funds, kakeibo_paymentMethods, kakeibo_categories, kakeibo_transactions
function col(name: string) {
  return collection(firestoreDb, 'users', uid(), `kakeibo_${name}`);
}

function ref(name: string, id: string) {
  return doc(firestoreDb, 'users', uid(), `kakeibo_${name}`, id);
}

// 資金
export async function getAllFunds(): Promise<Fund[]> {
  const snap = await getDocs(col('funds'));
  return snap.docs.map(d => d.data() as Fund);
}

export async function getFund(id: string): Promise<Fund | undefined> {
  const snap = await getDoc(ref('funds', id));
  return snap.exists() ? (snap.data() as Fund) : undefined;
}

export async function addFund(fund: Fund): Promise<void> {
  await setDoc(ref('funds', fund.id), fund);
}

export async function updateFund(fund: Fund): Promise<void> {
  await setDoc(ref('funds', fund.id), fund);
}

export async function deleteFund(id: string): Promise<void> {
  await deleteDoc(ref('funds', id));
}

// 支払い方法
export async function getAllPaymentMethods(): Promise<PaymentMethod[]> {
  const snap = await getDocs(col('paymentMethods'));
  return snap.docs.map(d => d.data() as PaymentMethod);
}

export async function getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
  const snap = await getDoc(ref('paymentMethods', id));
  return snap.exists() ? (snap.data() as PaymentMethod) : undefined;
}

export async function addPaymentMethod(method: PaymentMethod): Promise<void> {
  await setDoc(ref('paymentMethods', method.id), method);
}

export async function updatePaymentMethod(method: PaymentMethod): Promise<void> {
  await setDoc(ref('paymentMethods', method.id), method);
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await deleteDoc(ref('paymentMethods', id));
}

// カテゴリ
export async function getAllCategories(): Promise<Category[]> {
  const snap = await getDocs(col('categories'));
  return snap.docs.map(d => d.data() as Category);
}

export async function getCategory(id: string): Promise<Category | undefined> {
  const snap = await getDoc(ref('categories', id));
  return snap.exists() ? (snap.data() as Category) : undefined;
}

export async function addCategory(category: Category): Promise<void> {
  await setDoc(ref('categories', category.id), category);
}

export async function updateCategory(category: Category): Promise<void> {
  await setDoc(ref('categories', category.id), category);
}

export async function deleteCategory(id: string): Promise<void> {
  const childSnap = await getDocs(query(col('categories'), where('parentId', '==', id)));
  const allIds = [id, ...childSnap.docs.map(d => d.id)];

  // 取引に参照されているか確認
  const txnSnap = await getDocs(col('transactions'));
  const isReferenced = txnSnap.docs.some(d => {
    const txn = d.data() as Txn;
    if (txn.kind === 'income')  return allIds.includes(txn.categoryId);
    if (txn.kind === 'expense') return allIds.includes(txn.categoryId) || (!!txn.subId && allIds.includes(txn.subId));
    return false;
  });

  if (isReferenced) {
    // 論理削除: archived フラグのみ更新
    await Promise.all([
      updateDoc(ref('categories', id), { archived: true }),
      ...childSnap.docs.map(d => updateDoc(d.ref, { archived: true })),
    ]);
  } else {
    // 物理削除
    await Promise.all([
      ...childSnap.docs.map(d => deleteDoc(d.ref)),
      deleteDoc(ref('categories', id)),
    ]);
  }
}

// 取引
export async function getAllTransactions(): Promise<Txn[]> {
  const snap = await getDocs(col('transactions'));
  const txns = snap.docs.map(d => d.data() as Txn);
  return txns.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTransaction(id: string): Promise<Txn | undefined> {
  const snap = await getDoc(ref('transactions', id));
  return snap.exists() ? (snap.data() as Txn) : undefined;
}

export async function addTransaction(txn: Txn): Promise<void> {
  await setDoc(ref('transactions', txn.id), txn);
}

export async function updateTransaction(txn: Txn): Promise<void> {
  await setDoc(ref('transactions', txn.id), txn);
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(ref('transactions', id));
  await pruneArchivedCategories();
}

async function pruneArchivedCategories(): Promise<void> {
  const [archivedSnap, txnSnap] = await Promise.all([
    getDocs(query(col('categories'), where('archived', '==', true))),
    getDocs(col('transactions')),
  ]);
  if (archivedSnap.empty) return;

  const referencedIds = new Set<string>();
  txnSnap.docs.forEach(d => {
    const txn = d.data() as Txn;
    if (txn.kind === 'income')  referencedIds.add(txn.categoryId);
    if (txn.kind === 'expense') {
      referencedIds.add(txn.categoryId);
      if (txn.subId) referencedIds.add(txn.subId);
    }
  });

  const orphans = archivedSnap.docs.filter(d => !referencedIds.has(d.id));
  await Promise.all(orphans.map(d => deleteDoc(d.ref)));
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Txn[]> {
  const all = await getAllTransactions();
  return all.filter(t => t.date >= startDate && t.date <= endDate);
}

// 繰り返し取引
export async function getAllRecurringTxns(): Promise<RecurringTxn[]> {
  const snap = await getDocs(col('recurring'));
  return snap.docs.map(d => d.data() as RecurringTxn);
}

export async function addRecurringTxn(r: RecurringTxn): Promise<void> {
  await setDoc(ref('recurring', r.id), r);
}

export async function updateRecurringTxn(r: RecurringTxn): Promise<void> {
  await setDoc(ref('recurring', r.id), r);
}

export async function deleteRecurringTxn(id: string): Promise<void> {
  await deleteDoc(ref('recurring', id));
}

// 予算
export async function getAllBudgets(): Promise<Budget[]> {
  const snap = await getDocs(col('budgets'));
  return snap.docs.map(d => d.data() as Budget);
}

export async function setBudget(budget: Budget): Promise<void> {
  await setDoc(ref('budgets', budget.id), budget);
}

export async function deleteBudget(id: string): Promise<void> {
  await deleteDoc(ref('budgets', id));
}
