# スケるん (ScheduleN)

シンプルで使いやすいスケジュール調整Webアプリケーションです。

## 特徴

- 📅 **簡単な候補日設定** - 日付と時間を選択して候補日を追加
- 👥 **参加者管理** - 参加者の都合を一覧で確認
- 🔒 **パスワード保護** - イベントにパスワードを設定して閲覧制限
- 📱 **レスポンシブデザイン** - PC・スマートフォン・タブレットに対応
- 🗓️ **カレンダービュー** - 直感的なカレンダー表示
- ⚡ **高速動作** - Next.js 15とPostgreSQLを使用した信頼性の高い設計

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript
- **スタイリング**: Tailwind CSS, Radix UI
- **データベース**: PostgreSQL
- **アイコン**: Lucide React
- **日付処理**: date-fns

## セットアップ

### 必要な環境

- Node.js 18以上
- pnpm (推奨) または npm
- PostgreSQL 12以上

### インストール

#### 1. Docker Composeを使用する場合（推奨）

```bash
# リポジトリをクローン
git clone https://github.com/MuNeNiCK/ScheduleN.git
cd ScheduleN

# GHCR（GitHub Container Registry）から事前ビルド済みイメージを使用
docker-compose up -d

# アプリケーションにアクセス
# http://localhost:3000
```

#### 開発環境用（ローカルビルド）

```bash
# 開発用docker-composeファイルを使用
docker-compose -f docker-compose.dev.yml up -d
```

#### 2. ローカル環境で実行する場合

```bash
# リポジトリをクローン
git clone https://github.com/MuNeNiCK/ScheduleN.git
cd ScheduleN

# 環境変数設定
cp .env.example .env.local
# .env.localファイルを編集してPostgreSQLの接続情報を設定

# 依存関係をインストール
pnpm install

# PostgreSQLデータベースを作成
createdb schedulen

# 開発サーバーを起動
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションにアクセスできます。

### ビルド

```bash
# プロダクション用ビルド
pnpm build

# ビルドしたアプリケーションを起動
pnpm start
```

## 使い方

### 1. イベント作成
1. トップページから「新しいイベントを作成」をクリック
2. イベント名と説明を入力
3. 候補日時を追加（複数選択可能）
4. 必要に応じてパスワードを設定
5. 「イベントを作成」をクリック

### 2. 参加状況の入力
1. 共有されたイベントURLにアクセス
2. 名前を入力
3. 各候補日に対して「参加可能」「参加不可」「未定」を選択
4. コメントを入力（任意）
5. 「回答を送信」をクリック

### 3. 結果の確認
- 参加状況一覧表で全体の都合を確認
- カレンダービューで視覚的に確認
- 最も多くの人が参加可能な日程を把握

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストや課題報告を歓迎します。

## サポート

質問や問題がある場合は、[Issues](https://github.com/MuNeNiCK/ScheduleN/issues) で報告してください。