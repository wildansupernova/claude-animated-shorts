// Render video: node scripts/render.mjs <out.mp4> [from-to] [scale] [compId] [concurrency]
import fs from "node:fs";
import path from "node:path";
const tmp = process.env.REMOTION_TMP || "/home/user/remotion-tmp";
fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const [out, range, scale = "1", id = "BridgeShort", conc = "1"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium";
const chromiumOptions = { gl: process.env.GL || "swangle", disableWebSecurity: true };
const serveUrl = process.env.SERVE || await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps });
const frameRange = range && range !== "all" ? range.split("-").map(Number) : null;
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: process.env.CODEC || "h264", crf: Number(process.env.CRF || 18), outputLocation: out, scale: Number(scale), frameRange,
  browserExecutable, chromiumOptions, concurrency: Number(conc), timeoutInMilliseconds: 600000, inputProps, imageFormat: "jpeg", jpegQuality: 92,
  muted: true, enforceAudioTrack: false,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 10) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(1) + "s");
