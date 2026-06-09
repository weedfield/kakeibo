# 家計管理アプリ 仕様書

個人用のシンプルな家計管理アプリ。スマホで使えるPWAとして実装する。
最大の特徴は **「支払い方法」と「お金の実体（資金）」を別概念として分離** している点。これにより、現金→nanacoのチャージ（収支ゼロだが残高は移動する）や、クレカ・楽天ペイの引き落としを正しく扱える。

---

## 1. 目的・スコープ

### やりたいこと
- 収入・支出・資金間の移動を記録し、残高とお金の流れを正確に追う
- 「チャージ式（プリペイド）」の利用が増えても破綻しない管理
- カテゴリ別・資金別・支払い方法別・月別/年別で集計を見る

### 今回のスコープ外（将来拡張）
- ポイント付与の管理
- 複数通貨（円のみ）
- クレカの締め日・引き落とし日の厳密なタイムラグ管理（→「案B」で簡略化、後述）
- 記録の編集（v1は削除のみ。編集は次フェーズで追加）
- クラウド同期・複数端末・複数ユーザー（v1は単一端末ローカルのみ）

---

## 2. 中心概念（最重要）

### 2.1 資金（Fund）= お金の実体
実際に残高を持つもの。お金はここに存在する。

例：現金 / 銀行口座 / nanaco残高 / Suica残高 / 楽天キャッシュ

- **収入**はここに入る
- **振替**はここ同士の移動
- 残高は記録から自動計算する（残高フィールドは持たず、初期残高＋取引から算出）

### 2.2 支払い方法（PaymentMethod）= 支払う手段
お金自体は持たず、「どの資金から引くか」の参照だけを持つ。

| 支払い方法 | 連携資金 | 挙動 |
|---|---|---|
| 現金 | 現金 | 連携資金から減算 |
| nanaco | nanaco残高 | 連携資金から減算 |
| Suica | Suica残高 | 連携資金から減算 |
| クレジットカード | 銀行口座 | **支払った瞬間に**銀行口座から減算（案B） |
| 楽天ペイ | 楽天キャッシュ（＋銀行口座） | チャージ残高を優先消費、不足分は銀行口座（案ア） |

### 2.3 重要な原則
1. **収入は資金に入る／振替は資金間の移動**（支払い方法は介在しない）
2. **支出は支払い方法で行い、その連携資金の残高を減らす**
3. **クレカは案B**：支払い時点で連携資金から即減算する。引き落とし日のタイムラグは無視し、「暗黙的振替」という別レコードは作らない。支払い方法が資金を参照するだけで成立する
4. **楽天ペイ等の按分（案ア）**：チャージ残高（primary資金）を優先して使い、足りない分だけfallback資金から引く。按分は **入力時点の残高で計算して取引に固定保存** する（過去のチャージを後から追加しても遡って再計算しない＝予測可能性を優先）
5. **チェーンは最終資金に畳む**：楽天ペイ→楽天カード→銀行 のような連鎖は、途中（楽天カード）がお金を持たないので最終資金（銀行口座）に直結させる
6. **収入カテゴリと支出カテゴリは完全に別物**：名称が同じでも混ぜない（別namespace）
7. **振替は「収支」に含めない**：振替はお金が移っただけで稼いでも使ってもいない。月別収支・カテゴリ別収支には一切入れず、残高と資金別ビューにだけ反映する

---

## 3. データモデル

通貨は円のみ。金額はすべて **整数（円）** で扱う（小数なし）。

```ts
type FundType = "cash" | "bank" | "prepaid";

interface Fund {
  id: string;
  name: string;            // 例: "現金", "銀行口座", "楽天キャッシュ"
  type: FundType;
  initialBalance: number;  // 初期残高（円）。現在残高は取引から算出
}

type SplitMode = "single" | "chargeFirst";

interface PaymentMethod {
  id: string;
  name: string;            // 例: "楽天ペイ", "クレジットカード"
  primaryFundId: string;   // 連携する資金
  fallbackFundId: string | null; // chargeFirst時の不足分の引き落とし先
  splitMode: SplitMode;    // single=primaryから全額 / chargeFirst=primary優先→不足はfallback
}

type CategoryType = "income" | "expense";

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null; // null=大分類, 値あり=その親の小分類
}

// 取引（discriminated union）
interface IncomeTxn {
  id: string;
  kind: "income";
  date: string;            // "YYYY-MM-DD"
  amount: number;          // 円
  fundId: string;          // 入金先の資金
  categoryId: string;      // 収入カテゴリ
  memo: string;
}

interface ExpenseTxn {
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

interface TransferTxn {
  id: string;
  kind: "transfer";
  date: string;
  amount: number;
  fromFundId: string;
  toFundId: string;        // fromとは別資金であること
  memo: string;
}

type Txn = IncomeTxn | ExpenseTxn | TransferTxn;
```

---

## 4. 主要ロジック

### 4.1 残高計算
資金 `f` の現在残高：

```
balance(f) = f.initialBalance
           + Σ income.amount         (income.fundId == f.id)
           + Σ transfer.amount        (transfer.toFundId == f.id)
           - Σ transfer.amount        (transfer.fromFundId == f.id)
           - Σ deduction.amount       (expense.deductions[].fundId == f.id)
```

総資産 = 全資金の残高の合計。

### 4.2 支出の按分（deductions の決定）
支出入力時、選択した支払い方法 `m` と金額 `amount` から `deductions` を計算して保存する。

```
computeDeductions(m, amount):
  if m.splitMode == "chargeFirst" and m.fallbackFundId != null:
    pBal       = balance(m.primaryFundId)          # 入力時点の現在残高
    usePrimary = clamp(amount, 0, pBal)            # 残高がマイナスなら0
    useFallback = amount - usePrimary
    deductions = []
    if usePrimary  > 0: deductions += { fundId: m.primaryFundId,  amount: usePrimary }
    if useFallback > 0: deductions += { fundId: m.fallbackFundId, amount: useFallback }
    return deductions
  else:
    return [ { fundId: m.primaryFundId, amount: amount } ]
```

- この `deductions` は取引に保存し、後から再計算しない（原則4-4）。
- 入力画面では按分結果を「内訳：楽天キャッシュ ¥X ＋ 銀行口座 ¥Y」のようにプレビュー表示する。

### 4.3 集計ルール
- **月別収支**：期間内の `income.amount` 合計 と `expense.amount` 合計、その差。**振替は除外**。
- **カテゴリ別収支**：収入・支出をそれぞれ独立に集計。小分類は親（大分類）にロールアップして表示。収入と支出は別ビュー。
- **資金別収支**：資金ごとに 入（収入＋振替in）／出（支出のdeductions＋振替out）／現在残高。
- **支払い方法別支出**：期間内の支出を `methodId` でグループ化した合計（支出のみ。収入は方法を持たないので対象外）。
- 期間は **月 / 年** の切替と、前後ナビゲーション。`date` で期間判定する。

---

## 5. 画面仕様

スマホ縦画面前提。下部タブナビ（5項目、中央が入力ボタン）。

### 5.1 残高（ホーム）
- 総資産（大きく表示）
- 今月の収入 / 今月の支出（2カラムカード）
- 資金の残高一覧
- 最近の記録（数件）→「すべて見る」で履歴へ

### 5.2 履歴
- 月ナビ（前月 / 当月 / 翌月）
- 日付ごとにグルーピングして取引を一覧
- 取引タップ → 詳細シート（按分内訳・メモ表示、**削除**ボタン）

### 5.3 入力（中央タブ）
- 種別トグル：**支出 / 収入 / 振替**
- 金額入力：**カスタム数字キーパッド**（1〜9, 0, 000, ⌫）。タップ中心
- 種別ごとのフィールド：
  - 支出：支払い方法（チップ選択）→ カテゴリ大（チップ）→ 小分類（任意チップ）。chargeFirst時は按分プレビュー表示
  - 収入：入金先の資金（チップ）→ 収入カテゴリ（チップ）
  - 振替：移動元資金（チップ）→ 移動先資金（チップ）。同一資金は不可
- 日付（デフォルト今日）、メモ（任意）
- 保存（必須項目が揃うまで非活性）

### 5.4 集計
- 月 / 年 トグル ＋ 期間ナビ
- ビュー切替（チップ）：**月別 / カテゴリ別 / 資金別 / 方法別**
  - 月別：収入・支出・収支
  - カテゴリ別：収入カテゴリ／支出カテゴリを横バーで（金額＋構成比%）
  - 資金別：資金ごとに 入 / 出 / 残高
  - 方法別：支払い方法ごとの支出を横バーで

### 5.5 設定（追加・編集）
セグメント：**資金 / 支払い方法 / カテゴリ**
- **資金**：一覧（種別・残高表示）＋追加（名前 / 種別 / 初期残高）＋削除。参照中の支払い方法がある資金は削除不可
- **支払い方法**：一覧（連携資金・按分設定表示）＋追加（名前 / 連携資金を選択 / 「チャージ残高優先＋不足分の引き落とし先」オプション）＋削除
- **カテゴリ**：収入/支出を切替、大分類・小分類の一覧＋追加（名前 / 親カテゴリ選択で小分類化）＋削除（親削除時は子も削除）

---

## 6. 初期データ（シード）
初回起動時に以下を投入する。

**資金**：現金(cash) / 銀行口座(bank) / 楽天キャッシュ(prepaid) / nanaco(prepaid) / Suica(prepaid)、初期残高すべて0

**支払い方法**：
- 現金 → 現金 (single)
- 楽天ペイ → primary:楽天キャッシュ, fallback:銀行口座 (chargeFirst)
- nanaco → nanaco (single)
- Suica → Suica (single)
- クレジットカード → 銀行口座 (single)

**カテゴリ**：
- 収入：給与 / 副業 / その他
- 支出：食費（小分類：外食・スーパー）/ 日用品 / 美容 / 交通 / 交際費 / 趣味 / 通信 / その他

---

## 7. 非機能要件
- **モバイルファースト**：単一カラム、最大幅 約440px、大きめタップ領域、下部固定ナビ、カスタム数字キーパッド
- **オフライン動作 / ローカル保存**：バックエンド・ログイン不要。単一端末。データは端末内に永続化（**IndexedDB 推奨**、シンプルさ優先なら localStorage でも可）
- **インストール可能（PWA）**：manifest＋Service Workerでホーム画面に追加でき、アプリのように使える
- **言語/通貨**：日本語 / 円のみ。数字は `tabular-nums` で桁揃え、`toLocaleString("ja-JP")` 表示
- **デザイン**：シンプル・ミニマル。淡いペーパー系背景、収入=緑 / 支出=赤系 / 振替=青系のアクセント。過度な装飾なし

---

## 8. 受け入れ条件（テストシナリオ）
実装の検証に使う具体例。

1. **チャージ（振替）**：現金→nanaco に 5,000円 を振替 → 現金 −5,000 / nanaco +5,000。**月別収支は変化しない**（収入も支出も0のまま）。
2. **クレカ支出（案B）**：クレジットカードで 3,000円 の支出 → 銀行口座が即 −3,000。月別の支出に +3,000、カテゴリ別/方法別にも反映。引き落とし用の別レコードは生成されない。
3. **楽天ペイ按分（案ア）**：楽天キャッシュ残高 2,000円 のとき 楽天ペイで 5,000円 の支出 → deductions = [楽天キャッシュ 2,000, 銀行口座 3,000]。楽天キャッシュは0、銀行は −3,000。入力画面に内訳が出る。
4. **楽天ペイ残高内**：楽天キャッシュ 10,000円 のとき 楽天ペイで 4,000円 → deductions = [楽天キャッシュ 4,000]。銀行は減らない。
5. **収入**：給与 300,000円 を銀行口座へ → 銀行 +300,000、月別収入 +300,000。
6. **カテゴリ別の独立性**：収入「その他」と支出「その他」は別集計で混ざらない。
7. **資金別収支**：上記後、各資金の 入/出/残高 が4.1の計算と一致する。
8. **削除**：取引を削除すると残高・集計に即反映される。
9. **永続化**：アプリを再読み込みしてもデータが残る。

---

## 9. 推奨技術スタック
- **React + Vite + TypeScript**
- 永続化：**IndexedDB**（`idb` か `Dexie`）。シンプル優先なら localStorage でも可だが、将来のデータ量を考えると IndexedDB 推奨
- PWA：`vite-plugin-pwa`（manifest＋Service Worker、ホーム画面インストール）
- スタイル：Tailwind CSS など軽量に。状態管理は React 標準（useState/useReducer）で十分
- 代替：ネイティブにしたい場合は **React Native (Expo)**。本仕様のドメインモデル（§2〜§4）はUI非依存なので流用可能

---

## 10. 実装メモ
- 残高はキャッシュせず取引から都度算出するのが安全（整合性が崩れない）。取引件数が増えても個人用途なら問題ない規模。
- 按分（deductions）は§4.2の通り入力時に確定保存。これにより資金別集計・残高計算は deductions を合算するだけで済む。
- 取引の編集はv1で未実装だが、データモデルはそのまま編集対応できる形にしてある（削除→再登録でも代替可）。