import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from './data/firebase'
import { initializeSeedData } from './data/seed'
import { BottomNav } from './components/BottomNav'
import { BalanceScreen } from './components/BalanceScreen'
import { HistoryScreen } from './components/HistoryScreen'
import { InputScreen } from './components/InputScreen'
import { AnalyticsScreen } from './components/AnalyticsScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { LoginScreen } from './components/LoginScreen'
import { IOSInstallBanner } from './components/IOSInstallBanner'
import type { Txn } from './core/types'
import styles from './App.module.css'

function App() {
  const [currentTab, setCurrentTab] = useState('balance')
  const [isInitialized, setIsInitialized] = useState(false)
  const [editingTxn, setEditingTxn] = useState<Txn | null>(null)
  const [user, setUser] = useState<User | null | undefined>(undefined)

  const handleTabChange = (tab: string) => {
    if (tab !== 'input') setEditingTxn(null)
    setCurrentTab(tab)
  }

  const handleEditTxn = (txn: Txn) => {
    setEditingTxn(txn)
    setCurrentTab('input')
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        initializeSeedData()
          .then(() => setIsInitialized(true))
          .catch(() => setIsInitialized(true))
      }
    })
  }, [])

  if (user === undefined) {
    return <div className={styles.loading}>読み込み中...</div>
  }

  if (user === null) {
    return (
      <>
        <LoginScreen />
        <IOSInstallBanner />
      </>
    )
  }

  if (!isInitialized) {
    return <div className={styles.loading}>読み込み中...</div>
  }

  const renderScreen = () => {
    switch (currentTab) {
      case 'balance':
        return <BalanceScreen onNavigate={setCurrentTab} />
      case 'history':
        return <HistoryScreen onEditTxn={handleEditTxn} />
      case 'input':
        return <InputScreen editingTxn={editingTxn} onEditDone={() => { setEditingTxn(null); setCurrentTab('history'); }} />
      case 'analytics':
        return <AnalyticsScreen />
      case 'settings':
        return <SettingsScreen />
      default:
        return <BalanceScreen onNavigate={setCurrentTab} />
    }
  }

  const TAB_LABELS: Record<string, string> = {
    balance: '残高',
    history: '履歴',
    input: '入力',
    analytics: '集計',
    settings: '設定',
  }

  return (
    <>
      <div className={styles.app}>
        <header className={styles.header}>
          <h1 className={styles.logo}>Kakeibo</h1>
          <span className={styles.pageTitle}>{TAB_LABELS[currentTab]}</span>
        </header>
        <main className={styles.main}>
          {renderScreen()}
        </main>
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />
      </div>
      <IOSInstallBanner />
    </>
  )
}

export default App
