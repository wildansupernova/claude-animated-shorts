// usage: node scripts/cards.mjs <comp> <outdir> — one PNG per title card
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const [comp = "CamCards720", outdir = "out/cards"] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable });
for (let i = 0; i < composition.durationInFrames; i++)
  await renderStill({ composition, serveUrl, frame: i, output: `${outdir}/card_${String(i).padStart(2, "0")}.png`, imageFormat: "png", browserExecutable });
console.log("cards", composition.durationInFrames);
