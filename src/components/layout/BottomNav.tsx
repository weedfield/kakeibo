import styles from './BottomNav.module.css'

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

function IconBalance({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="20" height="13" rx="2" />
      <path d="M2 12h20" />
      <path d="M6 12V7a6 6 0 0 1 12 0v5" />
    </svg>
  );
}

function IconHistory({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,7 12,12 15,15" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconAnalytics({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="9" />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <circle cx="7" cy="6" r="2" fill="white" />
      <circle cx="15" cy="12" r="2" fill="white" />
      <circle cx="9" cy="18" r="2" fill="white" />
    </svg>
  );
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
            <Icon active={currentTab === id} />
            <span className={styles.tabLabel}>{label}</span>
          </button>
        ))}

        <button onClick={() => onTabChange('input')} className={styles.addBtn}>
          <div className={`${styles.addBtnInner} ${currentTab === 'input' ? styles.active : ''}`}>
            <IconPlus />
          </div>
        </button>

        {tabs.slice(2).map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`${styles.tabBtn} ${currentTab === id ? styles.active : ''}`}
          >
            <Icon active={currentTab === id} />
            <span className={styles.tabLabel}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
