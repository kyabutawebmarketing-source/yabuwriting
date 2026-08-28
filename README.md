# yabuwriting

SEO・LLMO（AIによる引用最適化）・AIO（AI回答エンジンでの完結）に対応したコラム記事を、対話形式で作成するWebツールです。

Claude API の [web_search サーバーツール](https://docs.claude.com/) を使って実際のGoogle検索結果・競合記事を調査しながら、以下の8ステップを順に進めます。

1. キーワードとAIクエリ意図の入力
2. 実際の検索結果・サジェスト・関連語分析
3. 三層ターゲット分析（SEO / LLMO / AIO）
4. 検索結果1ページ目の競合記事＆AI回答分析
5. 記事モデルの選定
6. 次世代記事構成案の作成
7. AI整合性＆レギュレーションチェック
8. 最終記事作成（本文、SEOタイトル案、メタディスクリプション、Answer Block、FAQ、AI向け要約、JSON-LD候補、llms.txt用テキスト、参考情報源）

画面右側のパネルには、メインキーワード・サブキーワード・AIクエリ・検索意図・ターゲット・採用記事モデル・確定H2/H3構成が常時表示され、進行状況を確認しながら進められます。

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に ANTHROPIC_API_KEY を設定
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いて利用します。

### 環境変数

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | ✅ | Claude APIキー |
| `CLAUDE_MODEL` | - | 使用するモデルID（未設定時は `claude-opus-5`） |
| `ANTHROPIC_WORKSPACE_ID` | 条件付き | 複数ワークスペースにまたがる個人／サービスアカウントキーを使う場合のみ必須。Consoleの「anthropic-workspace-id is required...」エラーが出た場合に設定する（Console の Settings > Workspaces の ID 列で確認）。特定ワークスペースに紐づくキーを発行すれば不要 |

## 技術構成

- Next.js (App Router) + TypeScript + Tailwind CSS
- `@anthropic-ai/sdk` によるサーバーサイドAPI呼び出し（`src/app/api/chat/route.ts`）
- Claude APIの `web_search` サーバーツールで実際の検索結果・競合記事を調査
- マスタープロンプト（8ステップの進行ルール）は `src/lib/systemPrompt.ts` に集約
- 各ターン末尾の `<state>...</state>` をサーバー側で抽出し、画面右側の進行状況パネルに反映

## ビルド

```bash
npm run build
npm run start
```
