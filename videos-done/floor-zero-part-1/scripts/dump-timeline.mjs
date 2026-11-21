// Bundles story.ts with esbuild and writes out/timeline.json: shots, every story event (frames), camera speed per frame
// (for whooshes) and kicks. The sound design (audio/sound.py) and QA read this file.
import { build } from "esbuild";
import fs from "node:fs";
await build({ entryPoints: ["src/videos/floorzero/story.ts"], bundle: true, format: "esm", platform: "node", outfile: "out/_story.mjs", logLevel: "error" });
const S = await import(process.cwd() + "/out/_story.mjs?" + Date.now());
const camSpeed = [];
for (const s of S.SHOTS) {
  let prev = null;
  for (let f = s.a; f < s.b; f++) {
    const c = S.camAt(s.id, f);
    if (prev) camSpeed.push([f, +(Math.hypot(...c.pos.map((v, i) => v - prev.pos[i])) + Math.hypot(...c.look.map((v, i) => v - prev.look[i]))).toFixed(4)]);
    prev = c;
  }
}
const disp = []; let last = null;
for (let f = 0; f < S.TOTAL; f++) { const d = S.displayAt(f); if (d !== last) { disp.push([f, d]); last = d; } }
const doors = []; let pd = 0;
for (let f = 1; f < S.TOTAL; f++) { const d = S.doorAt(f); const v = d - S.doorAt(f - 1); if ((v > 0.001) !== (pd > 0.001) || (v < -0.001) !== (pd < -0.001)) doors.push([f, v > 0.001 ? "open" : v < -0.001 ? "close" : "stop"]); pd = v; }
const out = {
  FPS: S.FPS, TOTAL: S.TOTAL,
  shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light })),
  rise: S.RISE, rowOff: S.ROW_OFF, walk: S.WALK, callPress: S.CALL_PRESS, open1: S.OPEN1, close1: S.CLOSE1, open2: S.OPEN2, close2: S.CLOSE2,
  enter: S.ENTER, turn1: S.TURN1, pressG: S.PRESS_G, display: disp, doors, pumps: S.PUMPS, bell: S.BELL, rings: S.RINGS, newBtn: S.NEW_BTN,
  jolt: S.JOLT, zeroLit: S.ZERO_LIT, turn2: S.TURN2, turn3: S.TURN3, chairTurn: S.CHAIR_TURN, type: S.TYPE, figureFrom: S.FIGURE_FROM,
  breath: S.BREATH, tagsAt: S.TAGS_AT, tag1Hot: S.TAG1_HOT, tag2Hot: S.TAG2_HOT, kicks: S.KICKS,
  flicker: Array.from({ length: S.TOTAL }, (_, f) => S.flickerAt(f)).map((k, f) => [f, k]).filter(([, k]) => k < 1),
  camSpeed,
};
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/timeline.json", JSON.stringify(out));
console.log("TOTAL", S.TOTAL, "shots", S.SHOTS.map((s) => `${s.id}:${s.a}-${s.b}`).join(" "));
