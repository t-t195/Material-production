/**
 * build-pptx.mjs — スライドHTML群を高解像度PNG化してPPTXに変換する
 *
 * 使い方:
 *   npm run build -- slides/<デッキ名>   … 案件デッキを変換
 *   npm run catalog                      … components/ の部品カタログを変換
 *
 * 仕様:
 *   - 1536×864px のビューポートを deviceScaleFactor=2（倍解像度）で撮影し、
 *     文字の滲みを防ぐ（PNG実寸: 3072×1728）
 *   - ファイル名の昇順でスライド順が決まる（00-, 01-, … の連番を付けること）
 *   - PPTX は 16:9（13.333 × 7.5 インチ）、PNGをスライド全面に配置
 */
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import PptxGenJS from "pptxgenjs";

const SLIDE_W = 1536;
const SLIDE_H = 864;
const SCALE = 2;                 // 倍解像度（文字の滲み防止）
const PPTX_W = 13.333;           // インチ（16:9）
const PPTX_H = 7.5;

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

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SLIDE_W, height: SLIDE_H },
  deviceScaleFactor: SCALE,
});

const pngs = [];
for (const file of files) {
  const url = pathToFileURL(path.join(deckDir, file)).href;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const png = path.join(pngDir, file.replace(/\.html$/, ".png"));
  await page.screenshot({ path: png });
  pngs.push(png);
  console.log(`  PNG化: ${file}`);
}
await browser.close();

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE_16_9", width: PPTX_W, height: PPTX_H });
pptx.layout = "WIDE_16_9";
for (const png of pngs) {
  pptx.addSlide().addImage({ path: png, x: 0, y: 0, w: PPTX_W, h: PPTX_H });
}

const pptxPath = path.join(outDir, `${deckName}.pptx`);
await pptx.writeFile({ fileName: pptxPath });
console.log(`完成: ${pptxPath}`);
console.log(`PNG: ${pngDir}`);
