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
import type { Fund, FundType } from '../../../core/types';
import styles from './settings.module.scss';

const FUND_TYPE_LABEL: Record<FundType, string> = {
  cash: '現金',
  bank: '銀行',
  prepaid: 'プリペイド',
};

const FUND_TYPES: FundType[] = ['cash', 'bank', 'prepaid'];

export function FundsSettings() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [referencedIds, setReferencedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<FundType>('bank');
  const [initialBalance, setInitialBalance] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [fundsData, methodsData, txnsData] = await Promise.all([
      getAllFunds(), getAllPaymentMethods(), getAllTransactions(),
    ]);
    setFunds(fundsData);
    setBalances(calculateAllBalances(fundsData, txnsData));
    const refs = new Set(methodsData.flatMap(m =>
      [m.primaryFundId, m.fallbackFundId].filter((id): id is string => !!id)
    ));
    setReferencedIds(refs);
  };

  const resetForm = () => { setName(''); setType('bank'); setInitialBalance(''); };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addFund({
      id: `fund-${generateId()}`,
      name: name.trim(), type,
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
  };

  const handleEditClose = () => { setEditingFund(null); resetForm(); };

  const handleEditSave = async () => {
    if (!editingFund || !name.trim()) return;
    await updateFund({ ...editingFund, name: name.trim(), type, initialBalance: parseInt(initialBalance) || 0 });
    handleEditClose();
    await loadData();
  };

  const handleDelete = async (fund: Fund) => {
    if (referencedIds.has(fund.id)) return;
    if (confirm(`「${fund.name}」を削除しますか？`)) {
      await deleteFund(fund.id);
      handleEditClose();
      await loadData();
    }
  };

  const TypeSelector = () => (
    <div className={styles.segSmall}>
      {FUND_TYPES.map(t => (
        <button key={t} onClick={() => setType(t)}
          className={`${styles.segSmallBtn} ${type === t ? styles.active : ''}`}>
          {FUND_TYPE_LABEL[t]}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className={styles.card}>
        {funds.map(fund => (
          <button key={fund.id} className={styles.row} onClick={() => handleEditStart(fund)}>
            <div>
              <p className={styles.rowName}>{fund.name}</p>
              <p className={styles.rowMeta}>
                <span className={styles.tag}>{FUND_TYPE_LABEL[fund.type]}</span>
              </p>
            </div>
            <p className={styles.rowValue}>¥{formatCurrency(balances.get(fund.id) || 0)}</p>
          </button>
        ))}
        {funds.length === 0 && <p className={styles.empty}>資金がありません</p>}
      </div>

      {showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>資金を追加</p>
          <div>
            <label className={styles.fieldLabel}>名前</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="例：銀行口座" className={styles.input} />
          </div>
          <div>
            <label className={styles.fieldLabel}>種別</label>
            <TypeSelector />
          </div>
          <div>
            <label className={styles.fieldLabel}>初期残高（円）</label>
            <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
              placeholder="0" inputMode="numeric" className={styles.input} />
          </div>
          <div className={styles.formBtns}>
            <button onClick={() => { setShowForm(false); resetForm(); }} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!name.trim()} className={styles.addBtn}>追加</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ 資金を追加
        </button>
      )}

      {editingFund && (
        <div className={styles.confirmOverlay} onClick={handleEditClose}>
          <div className={styles.editSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.dragHandle} />
            <p className={styles.formTitle}>{editingFund.name}</p>
            <div>
              <label className={styles.fieldLabel}>名前</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.fieldLabel}>種別</label>
              <TypeSelector />
            </div>
            <div>
              <label className={styles.fieldLabel}>初期残高（円）</label>
              <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
                inputMode="numeric" className={styles.input} />
            </div>
            {referencedIds.has(editingFund.id) && (
              <p className={styles.sheetHint}>支払い方法に設定されているため削除できません</p>
            )}
            <div className={styles.sheetBtns}>
              <button
                onClick={() => handleDelete(editingFund)}
                disabled={referencedIds.has(editingFund.id)}
                className={styles.deleteRecurringBtn}
              >
                削除
              </button>
              <button onClick={handleEditSave} disabled={!name.trim()} className={styles.addBtn}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
