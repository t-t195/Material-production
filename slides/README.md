# slides/ — 実案件のデッキ置き場

- 1案件 = 1フォルダ（例: `slides/2026-07-abc-teian/`）
- ファイル名は連番: `00-cover.html`, `01-genjo.html`, … （ビルド時にファイル名の昇順で結合される）
- 各HTMLは `components/` の見本をコピーして文言を差し替えるのが基本
- CSS参照はフォルダ階層に合わせて相対パスで:
  `<link rel="stylesheet" href="../../templates/base.css">`
  `<link rel="stylesheet" href="../../templates/components.css">`
- 変換: `npm run build -- slides/<フォルダ名>` → `output/<フォルダ名>/` に PNG と PPTX
