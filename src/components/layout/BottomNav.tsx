import { IconBalance, IconHistory, IconPlus, IconAnalytics, IconSettings } from '../atoms/Icon';
import styles from './BottomNav.module.scss'

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'balance',   Icon: IconBalance,   label: '残高' },
    { id: 'history',   Icon: IconHistory,   label: '履歴' },
    { id: 'analytics', Icon: IconAnalytics, label: '集計' },
    { id: 'settings',  Icon: IconSettings,  label: '設定' },
  ]

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {tabs.slice(0, 2).map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`${styles.tabBtn} ${currentTab === id ? styles.active : ''}`}
          >
            <Icon size={22} strokeWidth={currentTab === id ? 2 : 1.5} />
            <span className={styles.tabLabel}>{label}</span>
          </button>
        ))}

        <button onClick={() => onTabChange('input')} className={styles.addBtn}>
          <div className={`${styles.addBtnInner} ${currentTab === 'input' ? styles.active : ''}`}>
            <IconPlus size={26} />
          </div>
        </button>

        {tabs.slice(2).map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`${styles.tabBtn} ${currentTab === id ? styles.active : ''}`}
          >
            <Icon size={22} strokeWidth={currentTab === id ? 2 : 1.5} />
            <span className={styles.tabLabel}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
