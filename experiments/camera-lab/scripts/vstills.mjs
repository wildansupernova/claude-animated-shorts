// usage: node scripts/vstills.mjs <comp> <outdir> <v-list e.g. 0,1,2> <frames e.g. 20,60,120> — reel stills per variant
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const [comp, outdir, vs, frames] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions, inputProps });
const onBrowserLog = (l) => { if (l.type === "error") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const v of vs.split(",").map(Number)) for (const f of frames.split(",").map(Number)) {
  const out = `${outdir}/v${String(v).padStart(2, "0")}_${String(f).padStart(3, "0")}.jpg`;
  if (fs.existsSync(out)) continue;
  await renderStill({ composition, serveUrl, frame: v * 420 + f, output: out, imageFormat: "jpeg", jpegQuality: 85, browserExecutable, chromiumOptions, timeoutInMilliseconds: 600000, onBrowserLog, inputProps });
}
console.log("done", vs);
