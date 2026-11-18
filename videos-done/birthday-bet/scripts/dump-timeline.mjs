// Bundles story.ts with esbuild and writes out/timeline.json: shots, crossfades, flash, every story event (frames),
// camera key frames (for whooshes) and kicks. The sound design (audio/*.py) and QA read this file.
import { build } from "esbuild";
import fs from "node:fs";
await build({ entryPoints: ["src/videos/birthday/story.ts"], bundle: true, format: "esm", platform: "node", outfile: "out/_story.mjs", logLevel: "error" });
const S = await import(process.cwd() + "/out/_story.mjs?" + Date.now());
const keys = {};
const camCuts = [];
for (const s of S.SHOTS) {
  // detect camera moves: per-frame camera speed (position + look) -> glide spans and cuts
  let prev = null;
  for (let f = s.a; f < s.b; f++) {
    const c = S.camAt(s.id, f);
    if (prev) {
      const d = Math.hypot(...c.pos.map((v, i) => v - prev.pos[i])) + Math.hypot(...c.look.map((v, i) => v - prev.look[i]));
      camCuts.push([f, +d.toFixed(4)]);
    }
    prev = c;
  }
}
const out = {
  FPS: S.FPS, TOTAL: S.TOTAL, FLASH_AT: S.FLASH_AT, FREEZE: S.FREEZE, XFADE: S.XFADE,
  shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light, scene: s.scene })),
  tags: Array.from({ length: 23 }, (_, i) => S.tagAt(i + 1)), slap: S.SLAP, title: S.TITLE,
  cash: Array.from({ length: 23 }, (_, i) => S.cashAt(i + 1)).sort((a, b) => a - b),
  stakes: S.STAKES, counter: S.COUNTER, roll: Array.from({ length: 16 }, (_, i) => S.rollAt(i + 1)),
  sep17: S.SEP17, raise: S.RAISE, match: S.MATCH_AT, win: S.WIN_AT,
  coins: S.COINS, bubbles: S.BUBBLES, garyLines: S.GARY_LINES, samplePairs: S.SAMPLE_PAIRS, webBuild: S.WEB_BUILD,
  confetti: [...S.CONFETTI.map(([f]) => f), ...S.CONFETTI_2D], cupLink: S.CUP_LINK, cupCake: S.CUP_CAKE, card253: S.CARD253, cta: S.CTA,
  kicks: S.KICKS, camSpeed: camCuts,
  cues: {
    laugh: S.cue(1, "right") - 2, cal365: S.cue(1, "Three") - 2, calBurst: S.cue(1, "sixty-five") - 2, garyDid: S.cue(2, "did"),
    anyone: S.cue(4, "Anyone"), crickets: S.SHOTS[6].a, missed: S.cue(10, "missed") - 2, your: S.cue(10, "Your"),
    coinFlip: S.cue(13, "coin"), need: S.cue(15, "need"), same: S.cue(15, "Same"), twin: S.cue(16, "twin"),
  },
};
fs.writeFileSync("out/timeline.json", JSON.stringify(out));
console.log(JSON.stringify({ TOTAL: out.TOTAL, shots: out.shots.map((s) => `${s.id}:${s.a}-${s.b}`).join(" ") }));
