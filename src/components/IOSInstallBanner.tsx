import { useState, useEffect } from 'react';
import styles from './IOSInstallBanner.module.css';

const DISMISSED_KEY = 'install-banner-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && isSafari && !isStandalone;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function IOSInstallBanner() {
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('android');
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIosSafari()) setMode('ios');

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!mode) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setMode(null);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setMode(null);
    else handleDismiss();
  };

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <svg className={styles.shareIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>

        {mode === 'android' ? (
          <div className={styles.text}>
            <span className={styles.title}>ホーム画面に追加</span>
            <span className={styles.desc}>アプリとしてインストールできます</span>
          </div>
        ) : (
          <div className={styles.text}>
            <span className={styles.title}>ホーム画面に追加できます</span>
            <span className={styles.desc}>
              画面下の
              <svg className={styles.inlineIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              をタップ →「ホーム画面に追加」
            </span>
          </div>
        )}

        {mode === 'android' && (
          <button className={styles.installBtn} onClick={handleAndroidInstall}>
            追加
          </button>
        )}

        <button className={styles.close} onClick={handleDismiss} aria-label="閉じる">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
