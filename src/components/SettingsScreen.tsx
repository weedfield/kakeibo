import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../data/firebase';
import {
  getAllFunds,
  getAllPaymentMethods,
  getAllCategories,
  getAllTransactions,
  addFund,
  deleteFund,
  addPaymentMethod,
  deletePaymentMethod,
  addCategory,
  deleteCategory,
} from '../data/db';
import { calculateAllBalances } from '../core/logic';
import { generateId, formatCurrency } from '../core/utils';
import type { Fund, PaymentMethod, Category, FundType, SplitMode, CategoryType } from '../core/types';
import styles from './SettingsScreen.module.css';

type Segment = 'funds' | 'methods' | 'categories';

const FUND_TYPE_LABEL: Record<FundType, string> = {
  cash: '現金',
  bank: '銀行',
  prepaid: 'プリペイド',
};

function FundsSettings() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [showForm, setShowForm] = useState(false);
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

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addFund({
      id: `fund-${generateId()}`,
      name: name.trim(),
      type,
      initialBalance: parseInt(initialBalance) || 0,
    });
    setName('');
    setType('bank');
    setInitialBalance('');
    setShowForm(false);
    await loadData();
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
            <button
              onClick={() => handleDelete(fund)}
              disabled={isFundReferenced(fund.id)}
              className={styles.delBtn}
            >
              ✕
            </button>
          </div>
        ))}
        {funds.length === 0 && <p className={styles.empty}>資金がありません</p>}
      </div>

      {showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>資金を追加</p>
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
          <div className={styles.formBtns}>
            <button onClick={() => setShowForm(false)} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!name.trim()} className={styles.addBtn}>追加</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ 資金を追加
        </button>
      )}
    </>
  );
}

function MethodsSettings() {
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

function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewType, setViewType] = useState<CategoryType>('expense');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setCategories(await getAllCategories());
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addCategory({
      id: `${categoryType}-${generateId()}`,
      name: name.trim(),
      type: categoryType,
      parentId,
    });
    setName('');
    setParentId(null);
    setShowForm(false);
    await loadData();
  };

  const handleDelete = async (category: Category) => {
    const children = categories.filter(c => c.parentId === category.id);
    const msg = children.length > 0
      ? `「${category.name}」とその小分類 ${children.length} 件を削除しますか？`
      : `「${category.name}」を削除しますか？`;
    if (confirm(msg)) {
      await deleteCategory(category.id);
      await loadData();
    }
  };

  const parentCats = categories.filter(c => c.type === viewType && !c.parentId);

  return (
    <>
      <div className={styles.typeToggle}>
        {(['expense', 'income'] as CategoryType[]).map(type => (
          <button
            key={type}
            onClick={() => setViewType(type)}
            className={`${styles.typeBtn} ${
              viewType === type
                ? type === 'expense' ? styles.activeExpense : styles.activeIncome
                : ''
            }`}
          >
            {type === 'expense' ? '支出' : '収入'}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        {parentCats.map(cat => {
          const children = categories.filter(c => c.parentId === cat.id);
          return (
            <div key={cat.id}>
              <div className={styles.row}>
                <span className={styles.rowName}>{cat.name}</span>
                <button onClick={() => handleDelete(cat)} className={styles.delBtn}>✕</button>
              </div>
              {children.map(child => (
                <div key={child.id} className={styles.childRow}>
                  <span className={styles.childName}>{child.name}</span>
                  <button onClick={() => handleDelete(child)} className={styles.childDelBtn}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
        {parentCats.length === 0 && <p className={styles.empty}>カテゴリがありません</p>}
      </div>

      {showForm ? (
        <div className={styles.form}>
          <p className={styles.formTitle}>カテゴリを追加</p>
          <div>
            <label className={styles.fieldLabel}>種別</label>
            <div className={styles.segSmall}>
              {(['expense', 'income'] as CategoryType[]).map(type => (
                <button
                  key={type}
                  onClick={() => { setCategoryType(type); setParentId(null); }}
                  className={`${styles.segSmallBtn} ${
                    categoryType === type
                      ? type === 'expense' ? styles.activeExpense : styles.activeIncome
                      : ''
                  }`}
                >
                  {type === 'expense' ? '支出' : '収入'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={styles.fieldLabel}>名前</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="カテゴリ名"
              className={styles.input}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>親カテゴリ（小分類にする場合）</label>
            <select
              value={parentId || ''}
              onChange={e => setParentId(e.target.value || null)}
              className={styles.select}
            >
              <option value="">なし（大分類）</option>
              {categories
                .filter(c => c.type === categoryType && !c.parentId)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          <div className={styles.formBtns}>
            <button onClick={() => setShowForm(false)} className={styles.cancelBtn}>キャンセル</button>
            <button onClick={handleAdd} disabled={!name.trim()} className={styles.addBtn}>追加</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={styles.addTrigger}>
          ＋ カテゴリを追加
        </button>
      )}
    </>
  );
}

export function SettingsScreen() {
  const [segment, setSegment] = useState<Segment>('funds');

  return (
    <div className={styles.page}>
      <div className={styles.segmentBar}>
        <div className={styles.segmentGroup}>
          {([
            { id: 'funds', label: '資金' },
            { id: 'methods', label: '支払い方法' },
            { id: 'categories', label: 'カテゴリ' },
          ] as { id: Segment; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSegment(id)}
              className={`${styles.segBtn} ${segment === id ? styles.active : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.scroll}>
        {segment === 'funds' && <FundsSettings />}
        {segment === 'methods' && <MethodsSettings />}
        {segment === 'categories' && <CategoriesSettings />}

        <div className={styles.logoutSection}>
          <p className={styles.emailLabel}>{auth.currentUser?.email}</p>
          <button onClick={() => signOut(auth)} className={styles.logoutBtn}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
