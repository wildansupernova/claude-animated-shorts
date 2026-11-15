// usage: node scripts/bench.mjs <compId> <from-to> [concurrency]  -> times a short frame range (no output kept)
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [id, range, conc = "1"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
const fr = range.split("-").map(Number);
const t0 = Date.now();
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: "/tmp/bench.mp4", frameRange: fr, concurrency: Number(conc), browserExecutable, muted: true, imageFormat: "jpeg" });
console.log(`frames ${fr[1] - fr[0] + 1} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
