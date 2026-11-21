// usage: node scripts/render.mjs <compId> <out.mp4> [from-to] [scale] [concurrency]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [comp, out, range, scale = "1", conc = "1"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions, inputProps });
const frameRange = range && range !== "all" ? range.split("-").map(Number) : null;
const t0 = Date.now();
let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), concurrency: Number(conc),
  frameRange, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 600000, imageFormat: "jpeg", jpegQuality: 92,
  muted: true, everyNthFrame: 1,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 30) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(1) + "s");
