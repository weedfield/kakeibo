import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../data/firebase';
import { FundsSettings } from '../organisms/settings/FundsSettings';
import { MethodsSettings } from '../organisms/settings/MethodsSettings';
import { CategoriesSettings } from '../organisms/settings/CategoriesSettings';
import { BudgetsSettings } from '../organisms/settings/BudgetsSettings';
import { RecurringSettings } from '../organisms/settings/RecurringSettings';
import styles from '../organisms/settings/settings.module.css';

type Segment = 'funds' | 'methods' | 'categories' | 'budgets' | 'recurring';

export function SettingsPage() {
  const [segment, setSegment] = useState<Segment>('funds');

  return (
    <div className={styles.page}>
      <div className={styles.segmentBar}>
        <div className={styles.segmentGroup}>
          {([
            { id: 'funds', label: '資金' },
            { id: 'methods', label: '方法' },
            { id: 'categories', label: 'カテゴリ' },
            { id: 'budgets', label: '予算' },
            { id: 'recurring', label: '繰返' },
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
        {segment === 'budgets' && <BudgetsSettings />}
        {segment === 'recurring' && <RecurringSettings />}

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
