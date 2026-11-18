// usage: node scripts/render.mjs <compId> <out.mp4> [from-to] [scale] [concurrency]
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [id, out, range, scale = "1", conc = "2"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "swangle" };
fs.mkdirSync(path.dirname(out), { recursive: true });
const t00 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
const frameRange = range && range !== "all" ? range.split("-").map(Number) : null;
let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 17, outputLocation: out, scale: Number(scale), concurrency: Number(conc),
  frameRange, browserExecutable, chromiumOptions, timeoutInMilliseconds: 600000, muted: true, imageFormat: "jpeg", jpegQuality: 92,
  onProgress: ({ renderedFrames, progress }) => { const n = Date.now(); if (n - last > 15000) { last = n; console.log(`frames ${renderedFrames} ${(progress * 100).toFixed(1)}% ${((n - t00) / 1000).toFixed(0)}s`); } } });
console.log("done", ((Date.now() - t00) / 1000).toFixed(1) + "s");
