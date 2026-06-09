import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { firestoreDb, auth } from './firebase';
import type { Fund, PaymentMethod, Category, Txn } from '../core/types';

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
  await Promise.all([
    ...childSnap.docs.map(d => deleteDoc(d.ref)),
    deleteDoc(ref('categories', id)),
  ]);
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
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Txn[]> {
  const all = await getAllTransactions();
  return all.filter(t => t.date >= startDate && t.date <= endDate);
}
