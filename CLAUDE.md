# CLAUDE.md — 資料作成全般

## このリポジトリ
HTML/CSS の部品ベースでコンサル級の提案書スライドを作成し、
Playwright + pptxgenjs / pdf-lib で PPTX・PDF に変換するプロジェクト。

## 3原則（基本思想）
1. **正本はコード** — 文言・レイアウトはすべて HTML/CSS 側で管理する。
   PPTX/PDF は「最終出力」であり手編集の対象にしない
   （PPTX はテキスト編集不可の高解像度PNG全面貼り付け）。
2. **生成画像ゼロ** — スライド描画に画像生成AIを一切使わない。
   文字揺れ・数字の変化を防ぐため、レンダリングは HTML/CSS 一択。
3. **スライドではなく部品で数える** — ページ単位ではなく
   コンポーネントの組み合わせとして資料を構築・蓄積する。

## ルーティング（作成手段の交通整理）
| 依頼の種類 | 手段 |
|-----------|------|
| 提案書・営業資料・研修提案 | 本キット（components/ の部品 → `npm run build` で PPTX/PDF） |
| Webハンドアウト（Web配布用） | 本キット対象外。通常のWebページとして作成（1536×864固定を適用しない） |
| 単発の図解1枚 | スライド化せず、単発の HTML/SVG として作成 |
| 共同編集が必須・1回きり・アニメーション必要 | 本キットを使わない（PowerPoint 等で直接作成） |

## 絶対厳守（スライド実装ルール）
- 1スライド = 1536×864px 固定（`overflow: hidden`）。レスポンシブ対応はしない。
- 共通フレーム（青バー見出し／メッセージ行／出所行／ページ番号／機密スタンプ）は
  自作せず `templates/base.css` の `.slide` 構造を必ず使う。
- 色・フォント・サイズは `templates/base.css` の CSS 変数を使う。勝手に増やさない。
- 画像・チャートライブラリ・CDN・Web フォントは一切使わない。
  シェブロン矢印は `clip-path: polygon(...)`、グラフは `div` の高さ・位置指定、
  縦書きは `writing-mode: vertical-rl` で描画する。
- 部品は `components/` の見本をコピーして文言を差し替えるのが基本。
  無い部品を新規実装したら、必ず `components/` に見本を追加し
  `components/index.html` のカタログにも登録する（資産化）。

## ディレクトリ
- `templates/` … 共通CSS（base.css=フレーム、components.css=部品）
- `components/` … 部品カタログ（1部品=1HTML、見本テキスト入り。index.html で一覧）
- `slides/<案件名>/` … 実案件のデッキ（`00-cover.html` から連番）
- `scripts/build-pptx.mjs` … PPTX/PDF変換（はみ出し自動検知つき）
- `.claude/skills/slide-deck/` … 「スライド作って」で起動するスキル
- `output/` … 生成物（git 管理外）

## ワークフロー
1. `prompts/slide-generation.md` の依頼テンプレートに沿ってスライドHTMLを作成
2. HTML をブラウザで開いて目視確認
3. `npm run build -- slides/<案件名>` で PPTX と PDF を生成
   （部品カタログは `npm run catalog`）
4. ビルドログの「はみ出し検知」警告が出たら該当スライドを修正して再ビルド
