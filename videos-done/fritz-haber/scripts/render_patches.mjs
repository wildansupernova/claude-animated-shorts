// re-render several frame ranges with one bundle + one browser. usage: node render_patches.mjs a-b,c-d,...  -> out/haber/seg/patch_<a>_<b>.mp4
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
const ranges = process.argv[2].split(",").map((r) => r.split("-").map(Number));
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "HaberShort", browserExecutable, chromiumOptions, puppeteerInstance: browser });
for (const [a, b] of ranges) {
  const t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: `out/haber/seg/patch_${a}_${b}.mp4`, browserExecutable, chromiumOptions,
    frameRange: [a, b], concurrency: 1, timeoutInMilliseconds: 600000, muted: true, puppeteerInstance: browser });
  console.log("patch", a, b, ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
await browser.close({ silent: true });
console.log("all done");
