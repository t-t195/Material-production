# 資料作成全般

コンサル級の提案書スライドを **HTML/CSS の部品** として作成・蓄積し、
**Playwright + pptxgenjs** で高解像度 PPTX に変換するプロジェクト。

PowerPoint を直接操作する代わりにコードで資料を管理することで、
修正・再利用・量産を「文言の差し替えだけ」にすることを目指す。

```
スライドHTML作成（部品をコピーして文言差し替え）
  → ブラウザで目視確認
  → npm run build -- slides/<案件名>
  → Playwright が 2倍解像度PNG（3072×1728）を撮影
  → pptxgenjs が 16:9 PPTX に全面配置して出力
```

## セットアップ（初回のみ）

```powershell
npm install
npx playwright install chromium
```

## 使い方

1. **スライドを作る** — [prompts/slide-generation.md](prompts/slide-generation.md) の
   依頼テンプレートを埋めて Claude Code に渡す。部品は `components/` の見本を流用する。
2. **確認する** — 作成した HTML をブラウザで開く（部品一覧は `components/index.html`）。
3. **PPTX に変換する**

```powershell
npm run build -- slides/<案件名>   # 案件デッキを変換
npm run catalog                    # 部品カタログ自体を変換（動作確認用）
```

出力先: `output/<案件名>/<案件名>.pptx`（PNG は `output/<案件名>/png/`）

## 部品カタログ（components/）

| # | 部品 | 内容 |
|---|------|------|
| 0 | 表紙 | タイトル・宛先・日付 |
| 1 | 構造表 | 左端に青い縦書きヘッダー（`writing-mode: vertical-rl`） |
| 2 | 全体工程 | シェブロン矢印（`clip-path`）＋実施範囲ハイライト |
| 3 | 論理フレーム | 課題（赤文字）→ありたい姿（青地）→効果（チェック付き） |
| 4 | 投資対効果 | 試算条件ボックス＋div高さ指定の投資回収ブリッジチャート |
| 5 | 価値定義 | 提供価値 × メリット × インパクトのタグ付き表 |
| 6 | 詳細整理 | フェーズ別の詳細整理表 |

## ディレクトリ構成

```
templates/   共通CSS（base.css=フレームとデザイントークン、components.css=部品）
components/  部品カタログ（1部品=1HTML、見本テキスト入り。index.html で一覧）
slides/      実案件のデッキ（1案件=1フォルダ、連番HTML）
prompts/     Claude Code への依頼テンプレート
scripts/     PPTX変換スクリプト
output/      生成物（git管理外）
```

## 設計ルール（詳細は CLAUDE.md）

- 1スライド = **1536×864px 固定**、`overflow: hidden`（16:9。PPTXの13.333×7.5インチに一致）
- フォント・色は `templates/base.css` の定義のみ使用（環境差による折り返しズレ防止）
- 画像・チャートライブラリ・CDN・Webフォント**禁止**。図形はCSSのみで描画
- 全スライドに共通フレーム（青バー見出し／メッセージ行／出所行／ページ番号／機密スタンプ）

## 運用のコツ

1. **小さく始める** — 一度に全ページを作らず、よく使う1枚の型から。
2. **スクショを渡す** — 再現したいレイアウトのスクリーンショットを Claude Code に
   読み込ませ「部品に分解して実装して」と指示すると再現度が劇的に上がる。
3. **資産化する** — 完成した実案件スライドの汎用形を `components/` に昇格させる。
   部品が増えるほど、次の提案書は文言差し替えだけで完成する。
