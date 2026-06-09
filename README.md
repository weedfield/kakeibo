# 家計管理アプリ (Kakeibo)

個人用のシンプルな家計管理PWA。

## 特徴

- **支払い方法とお金の実体（資金）を分離**して管理
  - チャージ式（nanaco/Suica）の振替を正確に扱える
  - クレカ支払いは連携資金から即時減算（案B）
  - 楽天ペイなどのチャージ優先按分（案ア）に対応
- **オフライン不要・クラウド同期**：Firebase Auth（Googleログイン）+ Firestore
- **PWA**：ホーム画面にインストールして使える
- カテゴリ別・資金別・支払い方法別・月別/年別の集計

## 技術スタック

- React + Vite + TypeScript
- Firebase Auth / Firestore
- CSS Modules
- vite-plugin-pwa

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## データモデル概要

| 概念 | 説明 |
|---|---|
| 資金 (Fund) | 実際に残高を持つもの（現金・銀行口座・プリペイド等） |
| 支払い方法 (PaymentMethod) | 「どの資金から引くか」の参照。お金は持たない |
| 取引 (Txn) | 収入 / 支出 / 振替の3種。支出は按分内訳(deductions)を保存 |

残高はすべて取引から都度計算（キャッシュなし）。
