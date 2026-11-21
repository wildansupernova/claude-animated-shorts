// Part 4: bundles floorzero4/story.ts and writes out/timeline4.json (shots + every story event, frames) for the sound.
import { build } from "esbuild";
import fs from "node:fs";
await build({ entryPoints: ["src/videos/floorzero4/story.ts"], bundle: true, format: "esm", platform: "node", outfile: "out/_story4.mjs", logLevel: "error" });
const S = await import(process.cwd() + "/out/_story4.mjs?" + Date.now());
const out = {
  FPS: S.FPS, TOTAL: S.TOTAL, teaser: S.TEASER, shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light })),
  rewind: S.REWIND, blacks: S.BLACKS, step1: S.STEP1, step2: S.STEP2, pull: S.PULL, endW: S.END_W,
  hops: S.HOPS, hops2: S.HOPS2, badgeDrop: S.BADGE_DROP, kneel: S.KNEEL, reach: S.REACH, grab: S.GRAB, tear: S.TEAR, wrist: S.WRIST,
  lobbyOff: S.LOBBY_OFF, stairWalk: S.STAIR_WALK, floor3: S.FLOOR3_FROM, raise: S.RAISE, figOn: S.FIG_ON, cctvPush: S.CCTV_PUSH, yours: S.YOURS,
  tagsAt: S.TAGS_AT, cta: S.CTA_AT, kicks: S.KICKS,
};
fs.writeFileSync("out/timeline4.json", JSON.stringify(out));
console.log(JSON.stringify(out).slice(0, 900));
