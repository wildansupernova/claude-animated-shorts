// render the film in chunks (one per shot) into out/<name>/chunks/, skipping chunks that already exist
// usage: node scripts/chunks.mjs <comp> <dir> <concurrency> [only=a-b,c-d]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [comp, dir, conc = "3", only = ""] = process.argv.slice(2);
const CH = [[0, 122], [122, 246], [246, 440], [440, 562], [562, 719], [719, 788], [788, 908], [908, 1086], [1086, 1270], [1270, 1505], [1505, 1703], [1703, 1914], [1914, 2115]];
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
fs.mkdirSync(dir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000 });
const want = only ? only.split(",").map((s) => s.split("-").map(Number)) : CH;
for (const [a, b] of want) {
  const out = path.join(dir, `c_${String(a).padStart(4, "0")}.mp4`);
  if (fs.existsSync(out)) { console.log("skip", out); continue; }
  const t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out + ".tmp.mp4", browserExecutable, chromiumOptions,
    concurrency: Number(conc), frameRange: [a, b - 1], timeoutInMilliseconds: 600000, muted: true, imageFormat: "jpeg", jpegQuality: 92, x264Preset: "medium" });
  fs.renameSync(out + ".tmp.mp4", out);
  console.log(`chunk ${a}-${b} ${((Date.now() - t0) / 1000).toFixed(0)}s ${((b - a) / ((Date.now() - t0) / 1000)).toFixed(2)} fps`);
}
console.log("all done");
