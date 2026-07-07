# CLAUDE.md — 資料作成全般

## このリポジトリ
HTML/CSS の部品ベースでコンサル級の提案書スライドを作成し、
Playwright + pptxgenjs で PPTX に変換するプロジェクト。

## 絶対厳守（スライド実装ルール）
- 1スライド = 1536×864px 固定（`overflow: hidden`）。レスポンシブ対応はしない。
- 共通フレーム（青バー見出し／メッセージ行／出所行／ページ番号／機密スタンプ）は
  自作せず `templates/base.css` の `.slide` 構造を必ず使う。
- 色・フォント・サイズは `templates/base.css` の CSS 変数を使う。勝手に増やさない。
- 画像・チャートライブラリ・CDN・Web フォントは一切使わない。
  図形は CSS のみで描画（`clip-path`・`border`・`div` の高さ指定など）。
- 部品は `components/` の見本をコピーして文言を差し替えるのが基本。
  無い部品を新規実装したら、必ず `components/` に見本を追加してカタログ化する。

## ディレクトリ
- `templates/` … 共通CSS（base.css=フレーム、components.css=部品）
- `components/` … 部品カタログ（1部品=1HTML、見本テキスト入り。index.html で一覧）
- `slides/<案件名>/` … 実案件のデッキ（`00-cover.html` から連番）
- `scripts/build-pptx.mjs` … PPTX変換
- `output/` … 生成物（git 管理外）

## ワークフロー
1. `prompts/slide-generation.md` の依頼テンプレートに沿ってスライドHTMLを作成
2. HTML をブラウザで開いて目視確認
3. `npm run build -- slides/<案件名>` で PPTX 生成（部品カタログは `npm run catalog`）
