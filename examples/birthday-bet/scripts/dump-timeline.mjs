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
  FPS: S.FPS, TOTAL: S.TOTAL, FLASH_AT: S.FLASH_AT, XFADE: S.XFADE,
  shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light, scene: s.scene })),
  tags: Array.from({ length: 23 }, (_, i) => S.tagAt(i + 1)),
  coins: S.COINS, bubbles: S.BUBBLES, hookLink: S.HOOK_LINK, matchLink: S.MATCH_LINK, garyLines: S.GARY_LINES, samplePairs: S.SAMPLE_PAIRS,
  webBuild: S.WEB_BUILD, shake: [S.SHAKE_A, S.SHAKE_B, S.SHAKE_END], grow50: S.GROW50, grow70: S.GROW70, flare: S.FLARE,
  confetti: S.CONFETTI.map(([f]) => f), cupLink: S.CUP_LINK, cupCake: S.CUP_CAKE, kicks: S.KICKS, camSpeed: camCuts,
  cues: {
    laugh: S.cue(2, "laughs"), cal365: S.cue(3, "three") - 2, calBurst: S.cue(3, "sixty-five") - 2, anybody: S.cue(4, "Anybody"), silence: S.SHOTS[4].a,
    seeF: S.cue(6, "See"), waitHow: S.cue(11, "how") - 2, seventeen: S.cue(9, "seventeen"), september: S.cue(8, "September"), bets: S.cue(1, "bets"),
    tinyChance: S.cue(16, "tiny"), coinFlip2: S.cue(16, "coin"), bet: S.cue(21, "bet"), need: S.cue(20, "need"), make: S.cue(21, "make"),
  },
};
fs.writeFileSync("out/timeline.json", JSON.stringify(out));
console.log(JSON.stringify({ TOTAL: out.TOTAL, shots: out.shots.map((s) => `${s.id}:${s.a}-${s.b}`).join(" ") }));
