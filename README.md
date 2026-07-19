# タバタタイマー

タバタ式(HIIT)インターバルタイマーの PWA です。「20秒運動 → 10秒休憩」を繰り返すタバタプロトコルをはじめ、準備時間・ワーク時間・休憩時間・セット数を自由に設定してトレーニングに使えます。

**公開URL: https://rinotc.github.io/timer/**

## 主な機能

- **タイマーフロー**: 準備 → (ワーク → 休憩) × セット数 → 完了 の順に自動で進行します。
- **設定変更**: 準備時間・ワーク時間・休憩時間・セット数を画面から変更できます(タイマー動作中は変更不可)。
- **操作**: スタート / 一時停止 / 再開 / リセット。
- **サウンド**: Web Audio API でビープ音を生成するため、外部音源ファイルは不要です。
  - ワーク開始音、ワーク/セット終了音、準備・休憩の残り3秒カウントダウン音、全セット完了音
  - 🔊 / 🔇 ボタンで音のオン・オフを切り替え可能
- **画面スリープ防止**: Screen Wake Lock API により、タイマー動作中は画面が暗転・ロックしません(非対応ブラウザでは無効)。
- **PWA 対応**: Service Worker とマニフェストによりホーム画面への追加やオフライン利用に対応しています。
- **アクセシビリティ**: `aria-live` / `role="status"` などの ARIA 属性に対応しています。

## デフォルト設定

| 項目 | 既定値 |
| --- | --- |
| 準備時間 | 10 秒 |
| ワーク時間 | 20 秒 |
| 休憩時間 | 10 秒 |
| セット数 | 8 セット |

典型的なタバタ(20秒運動 / 10秒休憩 × 8セット = 4分)の構成です。

## 技術スタック

- [Angular](https://angular.dev/) 22(Angular Signals ベースの状態管理)
- TypeScript
- Web Audio API / Screen Wake Lock API
- PWA(`@angular/service-worker`)
- [Vitest](https://vitest.dev/)(ユニットテスト)

## 開発

### セットアップ

```bash
npm install
```

### 開発サーバー

```bash
npm start   # ng serve
```

起動後、ブラウザで `http://localhost:4200/` を開きます。ソースを編集すると自動でリロードされます。

## ビルド

```bash
npm run build
```

ビルド成果物は `dist/` に出力されます(本番ビルドでは Service Worker が有効になります)。

## テスト

```bash
npm test   # Vitest
```

CI 環境ではウォッチせずに一度だけ実行します。

```bash
npm test -- --watch=false
```

## デプロイ

`main` ブランチへの push をトリガーに、GitHub Actions が GitHub Pages へ自動デプロイします(手動実行も可能)。

- ビルド時に `--base-href=/timer/` を指定してサブパス配信に対応
- SPA のルーティング対策として `index.html` を `404.html` にコピー

ワークフロー定義は以下にあります。

- デプロイ: `.github/workflows/deploy.yml`
- ユニットテスト(`main` への push / PR で実行): `.github/workflows/test.yml`
