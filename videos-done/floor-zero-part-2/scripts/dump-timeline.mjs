// Part 2: bundles floorzero2/story.ts and writes out/timeline2.json (shots + every story event, frames) for the sound.
import { build } from "esbuild";
import fs from "node:fs";
await build({ entryPoints: ["src/videos/floorzero2/story.ts"], bundle: true, format: "esm", platform: "node", outfile: "out/_story2.mjs", logLevel: "error" });
const S = await import(process.cwd() + "/out/_story2.mjs?" + Date.now());
const disp = []; let last = null;
for (let f = 0; f < S.TOTAL; f++) { const d = S.displayOutAt(f); if (d !== last) { disp.push([f, d]); last = d; } }
const out = {
  FPS: S.FPS, TOTAL: S.TOTAL, shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light })),
  closeA: S.CLOSE_A, panelDark: S.PANEL_DARK, lightsOut: S.LIGHTS_OUT, lightsOn: S.LIGHTS_ON, endDark: S.END_DARK, speak: S.SPEAK,
  rewind: S.REWIND, exit: S.EXIT, closeB: S.CLOSE_B, drop: S.DROP, crash: S.CRASH, breathOut: S.BREATH_OUT, screensOn: S.SCREENS_ON,
  msg: S.MSG, dingB: S.DING_B, openB: S.OPEN_B, stairOpen: S.STAIR_OPEN, shadow: S.SHADOW, tagsAt: S.TAGS_AT, kicks: S.KICKS, display: disp,
  flicker: Array.from({ length: S.TOTAL }, (_, f) => [f, S.cabLightAt(f)]).filter(([, k]) => k < 1),
};
fs.writeFileSync("out/timeline2.json", JSON.stringify(out));
console.log("TOTAL", S.TOTAL, "crash", S.CRASH, "screensOn", S.SCREENS_ON, "rewind", S.REWIND);
