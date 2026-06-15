import { useState, useEffect } from 'react';
import {
  getAllPaymentMethods,
  getAllFunds,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from '../../../data/db';
import { generateId } from '../../../core/utils';
import type { Fund, PaymentMethod, SplitMode } from '../../../core/types';
import styles from './settings.module.scss';

export function MethodsSettings() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState('');
  const [primaryFundId, setPrimaryFundId] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('single');
  const [fallbackFundId, setFallbackFundId] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [methodsData, fundsData] = await Promise.all([
      getAllPaymentMethods(),
      getAllFunds(),
    ]);
    setMethods(methodsData);
    setFunds(fundsData);
    if (fundsData.length > 0) {
      setPrimaryFundId(prev => prev || fundsData[0].id);
    }
  };

  const getFundName = (fundId: string) =>
    funds.find(f => f.id === fundId)?.name || '不明';

  const resetForm = () => {
    setName('');
    setSplitMode('single');
    setFallbackFundId('');
  };

  const handleAdd = async () => {
    if (!name.trim() || !primaryFundId) return;
    if (splitMode === 'chargeFirst' && !fallbackFundId) return;
    await addPaymentMethod({
      id: `method-${generateId()}`,
      name: name.trim(),
      primaryFundId,
      splitMode,
      fallbackFundId: splitMode === 'chargeFirst' ? fallbackFundId : null,
    });
    resetForm();
    setShowForm(false);
    await loadData();
  };

  const handleEditStart = (method: PaymentMethod) => {
    setEditingMethod(method);
    setName(method.name);
    setPrimaryFundId(method.primaryFundId);
    setSplitMode(method.splitMode);
    setFallbackFundId(method.fallbackFundId || '');
    setShowForm(false);
  };

  const handleEditSave = async () => {
    if (!editingMethod || !name.trim() || !primaryFundId) return;
    if (splitMode === 'chargeFirst' && !fallbackFundId) return;
    await updatePaymentMethod({
      ...editingMethod,
      name: name.trim(),
      primaryFundId,
      splitMode,
      fallbackFundId: splitMode === 'chargeFirst' ? fallbackFundId : null,
    });
    setEditingMethod(null);
    resetForm();
    await loadData();
  };

  const handleEditCancel = () => {
    setEditingMethod(null);
    resetForm();
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (confirm(`「${method.name}」を削除しますか？`)) {
      await deletePaymentMethod(method.id);
      await loadData();
    }
  };

  const canSave = name.trim() && primaryFundId &&
    (splitMode === 'single' || (splitMode === 'chargeFirst' && fallbackFundId));

  const FormFields = () => (
    <>
      <div>
        <label className={styles.fieldLabel}>名前</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：クレジットカード"
          className={styles.input}
        />
      </div>
      <div>
        <label className={styles.fieldLabel}>連携資金</label>
        <select
          value={primaryFundId}
          onChange={e => setPrimaryFundId(e.target.value)}
          className={styles.select}
        >
          {funds.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={styles.fieldLabel}>按分設定</label>
        <div className={styles.segSmall}>
          <button
            onClick={() => setSplitMode('single')}
            className={`${styles.segSmallBtn} ${splitMode === 'single' ? styles.active : ''}`}
          >
            シングル
          </button>
          <button
            onClick={() => setSplitMode('chargeFirst')}
            className={`${styles.segSmallBtn} ${splitMode === 'chargeFirst' ? styles.active : ''}`}
          >
            チャージ優先
          </button>
        </div>
      </div>
      {splitMode === 'chargeFirst' && (
        <div>
          <label className={styles.fieldLabel}>不足分の引き落とし先</label>
          <select
            value={fallbackFundId}
            onChange={e => setFallbackFundId(e.target.value)}
            className={styles.select}
          >
            <option value="">選択してください</option>
            {funds.filter(f => f.id !== primaryFundId).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className={styles.card}>
        {methods.map(method => (
          <div key={method.id} className={styles.row}>
            <div>
              <p className={styles.rowName}>{method.name}</p>
              <p className={styles.rowMeta}>
                <span>{getFundName(method.primaryFundId)}</span>
                {method.splitMode === 'chargeFirst' && method.fallbackFundId && (
                  <>
                    <span>＋</span>
                    <span>{getFundName(method.fallbackFundId)}</span>
                    <span className={styles.tagBlue}>チャージ優先</span>
                  </>
                )}
              </p>
            </div>
            <div className={styles.rowActions}>
              <button onClick={() => handleEditStart(method)} className={styles.editBtn}>✎</button>
              <button onClick={() => handleDelete(method)} className={styles.delBtn}>✕</button>
            </div>
          </div>
        ))}
        {methods.length === 0 && <p className={styles.empty}>支払い方法がありません</p>}
      </div>

      {editingMethod && (
        <div className={styles.form}>
          <p className={styles.formTitle}>「{editingMethod.name}」を編集</p>
          <FormFields />
          <div className={styles.formBtns}>
            <button onClick={handleEditCancel} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleEditSave} disabled={!canSave} className={styles.addBtn}>保存</button>
          </div>
        </div>
      )}

      {!editingMethod && (showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>支払い方法を追加</p>
          <FormFields />
          <div className={styles.formBtns}>
            <button onClick={() => { setShowForm(false); resetForm(); }} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!canSave} className={styles.addBtn}>追加</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ 支払い方法を追加
        </button>
      ))}
    </>
  );
}
