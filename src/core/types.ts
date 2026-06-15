// 資金の種類
export type FundType = "cash" | "bank" | "prepaid";

// 資金（お金の実体）
export interface Fund {
  id: string;
  name: string;            // 例: "現金", "銀行口座", "楽天キャッシュ"
  type: FundType;
  initialBalance: number;  // 初期残高（円）。現在残高は取引から算出
}

// 按分モード
export type SplitMode = "single" | "chargeFirst";

// 支払い方法
export interface PaymentMethod {
  id: string;
  name: string;            // 例: "楽天ペイ", "クレジットカード"
  primaryFundId: string;   // 連携する資金
  fallbackFundId: string | null; // chargeFirst時の不足分の引き落とし先
  splitMode: SplitMode;    // single=primaryから全額 / chargeFirst=primary優先→不足はfallback
}

// カテゴリの種類
export type CategoryType = "income" | "expense";

// カテゴリ
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null; // null=大分類, 値あり=その親の小分類
  order?: number;
  archived?: boolean;      // true=取引参照あり削除（論理削除）
}

// 収入取引
export interface IncomeTxn {
  id: string;
  kind: "income";
  date: string;            // "YYYY-MM-DD"
  amount: number;          // 円
  fundId: string;          // 入金先の資金
  categoryId: string;      // 収入カテゴリ
  memo: string;
}

// 支出取引
export interface ExpenseTxn {
  id: string;
  kind: "expense";
  date: string;
  amount: number;
  methodId: string;        // 支払い方法
  categoryId: string;      // 支出カテゴリ（大分類）
  subId: string | null;    // 小分類（任意）
  memo: string;
  deductions: { fundId: string; amount: number }[]; // 実際に引いた資金の内訳（按分結果を固定保存）
}

// 振替取引
export interface TransferTxn {
  id: string;
  kind: "transfer";
  date: string;
  amount: number;
  fromFundId: string;
  toFundId: string;        // fromとは別資金であること
  memo: string;
}

// 取引（discriminated union）
export type Txn = IncomeTxn | ExpenseTxn | TransferTxn;

// 繰り返し取引テンプレート
export interface RecurringTxn {
  id: string;
  label: string;               // 表示名（例: "Netflix", "給与"）
  kind: 'expense' | 'income' | 'transfer';
  dayOfMonth: number;          // 毎月何日に実行するか（1–28）
  amount: number;
  memo: string;
  // expense
  methodId: string | null;
  categoryId: string | null;
  subId: string | null;
  // income
  fundId: string | null;
  incomeCategoryId: string | null;
  // transfer
  fromFundId: string | null;
  toFundId: string | null;
  // 実行管理
  lastExecutedYearMonth: string | null; // "YYYY-MM"
}

// 月次予算
export interface Budget {
  id: string;
  categoryId: string; // 支出カテゴリ（親）のID
  amount: number;     // 月の予算額（円）
}
