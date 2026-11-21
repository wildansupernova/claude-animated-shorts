// Final render in parallel chunks: bundle once, render frame ranges from a queue with P workers (each its own
// browser tab set, concurrency 1), one mp4 per chunk in out/chunks/; skip chunks already rendered (resumable).
// usage: node scripts/render-chunks.mjs <P> <a-b,a-b,...>
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [P = "3", spec] = process.argv.slice(2);
const chunks = spec.split(",").map((s) => s.split("-").map(Number));
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
fs.mkdirSync("out/chunks", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "FloorZero", browserExecutable, chromiumOptions });
const queue = chunks.filter(([a, b]) => !fs.existsSync(`out/chunks/c_${String(a).padStart(4, "0")}_${b}.mp4`));
const t0 = Date.now();
const worker = async (w) => {
  while (queue.length) {
    const [a, b] = queue.shift();
    const out = `out/chunks/c_${String(a).padStart(4, "0")}_${b}.mp4`, tmp = out.replace(".mp4", ".part.mp4");
    const ts = Date.now();
    await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: tmp, concurrency: 1, frameRange: [a, b],
      browserExecutable, chromiumOptions, timeoutInMilliseconds: 900000, imageFormat: "jpeg", jpegQuality: 95, muted: true,
      x264Preset: "medium", pixelFormat: "yuv420p" });
    fs.renameSync(tmp, out);
    console.log(`[w${w}] ${a}-${b} done in ${((Date.now() - ts) / 1000).toFixed(0)} s (${((Date.now() - ts) / 1000 / (b - a + 1)).toFixed(2)} s/f), elapsed ${((Date.now() - t0) / 60000).toFixed(1)} min, ${queue.length} left`);
  }
};
await Promise.all(Array.from({ length: Number(P) }, (_, i) => worker(i)));
console.log("all chunks done", ((Date.now() - t0) / 60000).toFixed(1), "min");
