/**
 * build-pptx.mjs — スライドHTML群を高解像度PNG化して PPTX / PDF に変換する
 *
 * 使い方:
 *   npm run build -- slides/<デッキ名>   … 案件デッキを変換
 *   npm run catalog                      … components/ の部品カタログを変換
 *
 * 4段パイプライン:
 *   1. Playwright(Chromium) でHTMLを開く（このとき「はみ出し」を自動検知）
 *   2. 倍解像度（deviceScaleFactor=2）で 1536×864 をPNG撮影（実寸 3072×1728。
 *      等倍は投影時に文字がにじむため禁止）
 *   3. pptxgenjs で 16:9 PPTX 化（PNGをスライド全面に配置。投影用）
 *   4. pdf-lib で PDF 化（同じPNGを束ねる。事前送付用）
 */
import { readdir, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import PptxGenJS from "pptxgenjs";
import { PDFDocument } from "pdf-lib";

const SLIDE_W = 1536;
const SLIDE_H = 864;
const SCALE = 2;                 // 倍解像度（文字の滲み防止）
const PPTX_W = 13.333;           // インチ（16:9）
const PPTX_H = 7.5;
const PDF_W = 960;               // ポイント（13.333in × 72pt）
const PDF_H = 540;               // ポイント（7.5in × 72pt）

const target = process.argv[2];
if (!target) {
  console.error("使い方: npm run build -- slides/<デッキ名>");
  process.exit(1);
}

const deckDir = path.resolve(target);
const deckName = path.basename(deckDir);
const files = (await readdir(deckDir))
  .filter((f) => f.endsWith(".html") && f !== "index.html")
  .sort();
if (files.length === 0) {
  console.error(`HTMLファイルが見つかりません: ${deckDir}`);
  process.exit(1);
}

const outDir = path.resolve("output", deckName);
const pngDir = path.join(outDir, "png");
await mkdir(pngDir, { recursive: true });

console.log(`${deckName}: ${files.length}枚のスライドを変換します`);

// --- 1. & 2. レンダリング＋はみ出し検知＋PNG撮影 ---
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SLIDE_W, height: SLIDE_H },
  deviceScaleFactor: SCALE,
});

const pngs = [];
const warnings = [];
for (const file of files) {
  const url = pathToFileURL(path.join(deckDir, file)).href;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // はみ出し検知（2段構え）:
  //   1) .slide の scrollWidth/Height … 右・下方向のあふれ
  //   2) 全要素の矩形走査 … 負のオフセット（上・左方向）や、
  //      ネストした overflow:hidden 内でクリップされたあふれも検出する
  const check = await page.evaluate(
    ([w, h]) => {
      const s = document.querySelector(".slide");
      if (!s) return { missing: true };
      if (s.scrollWidth > w || s.scrollHeight > h) {
        return { overflow: `${s.scrollWidth}×${s.scrollHeight}` };
      }
      const out = [];
      for (const el of s.querySelectorAll("*")) {
        const st = getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.left < -1 || r.top < -1 || r.right > w + 1 || r.bottom > h + 1) {
          const cls = el.classList[0] ? `.${el.classList[0]}` : "";
          out.push(`<${el.tagName.toLowerCase()}${cls}>`);
          if (out.length >= 5) break;
        }
      }
      return out.length > 0 ? { outOfBounds: out } : null;
    },
    [SLIDE_W, SLIDE_H]
  );
  if (check?.missing) {
    warnings.push(`${file}: .slide 要素が見つからない（共通フレーム未適用）`);
    console.warn(`  ⚠ 共通フレーム未適用: ${file}`);
  } else if (check?.overflow) {
    warnings.push(`${file}: コンテンツ実寸 ${check.overflow} > ${SLIDE_W}×${SLIDE_H}`);
    console.warn(`  ⚠ はみ出し検知: ${file}（コンテンツ実寸 ${check.overflow}）`);
  } else if (check?.outOfBounds) {
    warnings.push(`${file}: スライド境界外の要素 ${check.outOfBounds.join(", ")}`);
    console.warn(`  ⚠ はみ出し検知: ${file}（境界外要素 ${check.outOfBounds.join(", ")}）`);
  }

  const png = path.join(pngDir, file.replace(/\.html$/, ".png"));
  await page.screenshot({ path: png });
  pngs.push(png);
  console.log(`  PNG化: ${file}`);
}
await browser.close();

// --- 3. PPTX化（投影用） ---
const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE_16_9", width: PPTX_W, height: PPTX_H });
pptx.layout = "WIDE_16_9";
for (const png of pngs) {
  pptx.addSlide().addImage({ path: png, x: 0, y: 0, w: PPTX_W, h: PPTX_H });
}
const pptxPath = path.join(outDir, `${deckName}.pptx`);
await pptx.writeFile({ fileName: pptxPath });

// --- 4. PDF化（事前送付用） ---
const pdf = await PDFDocument.create();
for (const png of pngs) {
  const image = await pdf.embedPng(await readFile(png));
  const pdfPage = pdf.addPage([PDF_W, PDF_H]);
  pdfPage.drawImage(image, { x: 0, y: 0, width: PDF_W, height: PDF_H });
}
const pdfPath = path.join(outDir, `${deckName}.pdf`);
await writeFile(pdfPath, await pdf.save());

console.log(`完成: ${pptxPath}`);
console.log(`      ${pdfPath}`);
console.log(`PNG:  ${pngDir}`);
if (warnings.length > 0) {
  console.warn(`\n⚠ 要修正 ${warnings.length}件:`);
  for (const w of warnings) console.warn(`  - ${w}`);
  process.exitCode = 1;
} else {
  console.log("はみ出し検知: 問題なし");
}
