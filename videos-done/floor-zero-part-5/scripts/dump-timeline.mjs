// Part 5: bundles floorzero5/story.ts and writes out/timeline5.json (shots + every story event, frames) for the sound.
import { build } from "esbuild";
import fs from "node:fs";
await build({ entryPoints: ["src/videos/floorzero5/story.ts"], bundle: true, format: "esm", platform: "node", outfile: "out/_story5.mjs", logLevel: "error" });
const S = await import(process.cwd() + "/out/_story5.mjs?" + Date.now());
const out = {
  FPS: S.FPS, TOTAL: S.TOTAL, teaser: S.TEASER, shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light })),
  rewind: S.REWIND, blacks: S.BLACKS, turn1: S.TURN1, turn2: S.TURN2, breath: S.BREATH, die0: S.DIE0, die1: S.DIE1, blackW: S.BLACK_W,
  walk: S.WALK, run: S.RUN, screensDie: S.SCREENS_DIE, deadRefl: S.DEAD_REFL, jump: S.JUMP, stairRun: S.STAIR_RUN, door5: S.DOOR5, photos: S.PHOTOS,
  phone: S.PHONE, msgAt: S.MSG_AT, threadAt: S.THREAD_AT, sentAt: S.SENT_AT, lightDies: S.LIGHT_DIES, lightBack: S.LIGHT_BACK, flicks: S.FLICKS, spin: S.SPIN,
  tagsAt: S.TAGS_AT, cta: S.CTA_AT, kicks: S.KICKS,
};
fs.writeFileSync("out/timeline5.json", JSON.stringify(out));
console.log(JSON.stringify(out).slice(0, 400));
