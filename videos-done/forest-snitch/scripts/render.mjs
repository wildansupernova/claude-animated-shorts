// usage: node scripts/render.mjs <comp> <out.mp4> [scale] [from-to] [concurrency]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [comp, out, scale = "1", range = "", conc = "2"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const inputProps = JSON.parse(process.env.PROPS || "{}");
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 300000 });
const frameRange = range ? range.split("-").map(Number) : null;
const t0 = Date.now();
let last = 0;
await renderMedia({
  composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), browserExecutable, chromiumOptions, inputProps,
  concurrency: Number(conc), frameRange, timeoutInMilliseconds: 600000, muted: true, imageFormat: "jpeg", jpegQuality: 92,
  onProgress: ({ renderedFrames, encodedFrames }) => {
    if (renderedFrames - last >= 30) { last = renderedFrames; const s = (Date.now() - t0) / 1000; console.log(`frames ${renderedFrames} enc ${encodedFrames} ${s.toFixed(0)}s ${(renderedFrames / s).toFixed(2)} fps`); }
  },
});
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
