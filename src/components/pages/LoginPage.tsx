import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../data/firebase';
import { IconGoogle } from '../atoms/Icon';
import styles from './LoginPage.module.scss'

export function LoginPage() {
  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Kakeibo</h1>
        <p className={styles.subtitle}>シンプルな家計管理</p>
      </div>

      <button onClick={handleLogin} className={styles.googleBtn}>
        <IconGoogle className={styles.googleIcon} />
        <span className={styles.googleBtnLabel}>Googleでログイン</span>
      </button>

      <p className={styles.note}>
        ログインするとデータがクラウドに保存され、<br />ブラウザを変えても引き継げます
      </p>
    </div>
  );
}
