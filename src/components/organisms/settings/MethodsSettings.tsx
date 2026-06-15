import { useState, useEffect } from 'react';
import {
  getAllPaymentMethods,
  getAllFunds,
  addPaymentMethod,
  deletePaymentMethod,
} from '../../../data/db';
import { generateId } from '../../../core/utils';
import type { Fund, PaymentMethod, SplitMode } from '../../../core/types';
import styles from './settings.module.css';

export function MethodsSettings() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [showForm, setShowForm] = useState(false);
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
    setName('');
    setSplitMode('single');
    setFallbackFundId('');
    setShowForm(false);
    await loadData();
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (confirm(`「${method.name}」を削除しますか？`)) {
      await deletePaymentMethod(method.id);
      await loadData();
    }
  };

  const canAdd = name.trim() && primaryFundId &&
    (splitMode === 'single' || (splitMode === 'chargeFirst' && fallbackFundId));

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
            <button onClick={() => handleDelete(method)} className={styles.delBtn}>✕</button>
          </div>
        ))}
        {methods.length === 0 && <p className={styles.empty}>支払い方法がありません</p>}
      </div>

      {showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>支払い方法を追加</p>
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
          <div className={styles.formBtns}>
            <button onClick={() => setShowForm(false)} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!canAdd} className={styles.addBtn}>追加</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ 支払い方法を追加
        </button>
      )}
    </>
  );
}
