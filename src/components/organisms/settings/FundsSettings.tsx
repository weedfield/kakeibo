import { useState, useEffect } from 'react';
import {
  getAllFunds,
  getAllPaymentMethods,
  getAllTransactions,
  addFund,
  updateFund,
  deleteFund,
} from '../../../data/db';
import { calculateAllBalances } from '../../../core/logic';
import { generateId, formatCurrency } from '../../../core/utils';
import type { Fund, PaymentMethod, FundType } from '../../../core/types';
import styles from './settings.module.scss';

const FUND_TYPE_LABEL: Record<FundType, string> = {
  cash: '現金',
  bank: '銀行',
  prepaid: 'プリペイド',
};

export function FundsSettings() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [showForm, setShowForm] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<FundType>('bank');
  const [initialBalance, setInitialBalance] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [fundsData, methodsData, txnsData] = await Promise.all([
      getAllFunds(),
      getAllPaymentMethods(),
      getAllTransactions(),
    ]);
    setFunds(fundsData);
    setMethods(methodsData);
    setBalances(calculateAllBalances(fundsData, txnsData));
  };

  const isFundReferenced = (fundId: string) =>
    methods.some(m => m.primaryFundId === fundId || m.fallbackFundId === fundId);

  const resetForm = () => {
    setName('');
    setType('bank');
    setInitialBalance('');
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addFund({
      id: `fund-${generateId()}`,
      name: name.trim(),
      type,
      initialBalance: parseInt(initialBalance) || 0,
    });
    resetForm();
    setShowForm(false);
    await loadData();
  };

  const handleEditStart = (fund: Fund) => {
    setEditingFund(fund);
    setName(fund.name);
    setType(fund.type);
    setInitialBalance(String(fund.initialBalance));
    setShowForm(false);
  };

  const handleEditSave = async () => {
    if (!editingFund || !name.trim()) return;
    await updateFund({
      ...editingFund,
      name: name.trim(),
      type,
      initialBalance: parseInt(initialBalance) || 0,
    });
    setEditingFund(null);
    resetForm();
    await loadData();
  };

  const handleEditCancel = () => {
    setEditingFund(null);
    resetForm();
  };

  const handleDelete = async (fund: Fund) => {
    if (isFundReferenced(fund.id)) {
      alert(`「${fund.name}」は支払い方法に設定されているため削除できません`);
      return;
    }
    if (confirm(`「${fund.name}」を削除しますか？`)) {
      await deleteFund(fund.id);
      await loadData();
    }
  };

  const FormFields = () => (
    <>
      <div>
        <label className={styles.fieldLabel}>名前</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：銀行口座"
          className={styles.input}
        />
      </div>
      <div>
        <label className={styles.fieldLabel}>種別</label>
        <div className={styles.segSmall}>
          {(['cash', 'bank', 'prepaid'] as FundType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`${styles.segSmallBtn} ${type === t ? styles.active : ''}`}
            >
              {FUND_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={styles.fieldLabel}>初期残高（円）</label>
        <input
          type="number"
          value={initialBalance}
          onChange={e => setInitialBalance(e.target.value)}
          placeholder="0"
          inputMode="numeric"
          className={styles.input}
        />
      </div>
    </>
  );

  return (
    <>
      <div className={styles.card}>
        {funds.map(fund => (
          <div key={fund.id} className={styles.row}>
            <div>
              <p className={styles.rowName}>{fund.name}</p>
              <p className={styles.rowMeta}>
                <span className={styles.tag}>{FUND_TYPE_LABEL[fund.type]}</span>
                <span>¥{formatCurrency(balances.get(fund.id) || 0)}</span>
              </p>
            </div>
            <div className={styles.rowActions}>
              <button onClick={() => handleEditStart(fund)} className={styles.editBtn}>✎</button>
              <button
                onClick={() => handleDelete(fund)}
                disabled={isFundReferenced(fund.id)}
                className={styles.delBtn}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {funds.length === 0 && <p className={styles.empty}>資金がありません</p>}
      </div>

      {editingFund && (
        <div className={styles.form}>
          <p className={styles.formTitle}>「{editingFund.name}」を編集</p>
          <FormFields />
          <div className={styles.formBtns}>
            <button onClick={handleEditCancel} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleEditSave} disabled={!name.trim()} className={styles.addBtn}>保存</button>
          </div>
        </div>
      )}

      {!editingFund && (showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>資金を追加</p>
          <FormFields />
          <div className={styles.formBtns}>
            <button onClick={() => { setShowForm(false); resetForm(); }} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!name.trim()} className={styles.addBtn}>追加</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ 資金を追加
        </button>
      ))}
    </>
  );
}
