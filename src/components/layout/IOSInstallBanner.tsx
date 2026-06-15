import { useState, useEffect } from 'react';
import { IconShare, IconClose } from '../atoms/Icon';
import styles from './IOSInstallBanner.module.scss';

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
        <IconShare className={styles.shareIcon} />

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
              <IconShare className={styles.inlineIcon} />
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
          <IconClose />
        </button>
      </div>
    </div>
  );
}
