// Render a frame range of a composition to JPEGs in one page: node scripts/frames.mjs <outDir> <compId> [from-to] [scale]
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || "/home/user/remotion-tmp";
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderFrames, selectComposition } = await import("@remotion/renderer");
const [outDir, id, range, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium", chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps });
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
await renderFrames({ composition, serveUrl, outputDir: outDir, imageFormat: "jpeg", jpegQuality: 85, scale: Number(scale), inputProps, browserExecutable, chromiumOptions,
  frameRange: range && range !== "all" ? range.split("-").map(Number) : null, concurrency: Number(process.env.CONC || 1), timeoutInMilliseconds: 300000,
  onStart: () => {}, onFrameUpdate: (n) => { if (n % 10 === 0) console.log("frames", n, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(1) + "s");
