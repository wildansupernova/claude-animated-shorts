// Part 3: bundles floorzero3/story.ts and writes out/timeline3.json (shots + every story event, frames) for the sound.
import { build } from "esbuild";
import fs from "node:fs";
await build({ entryPoints: ["src/videos/floorzero3/story.ts"], bundle: true, format: "esm", platform: "node", outfile: "out/_story3.mjs", logLevel: "error" });
const S = await import(process.cwd() + "/out/_story3.mjs?" + Date.now());
const out = {
  FPS: S.FPS, TOTAL: S.TOTAL, teaser: S.TEASER, shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light })),
  rewind: S.REWIND, footStop: S.FOOT_STOP, torch: S.TORCH, lampFlick: S.LAMP_FLICK, hand: S.HAND, lampDie: S.LAMP_DIE, blacks: S.BLACKS,
  walkIn: S.WALK_IN, closeC: S.CLOSE_C, flicks: S.FLICKS, arrive: S.ARRIVE, openM1: S.OPEN_M1, backOut: S.BACK_OUT, closeM1: S.CLOSE_M1,
  floodFrom: S.FLOOD_FROM, steel: S.STEEL, rowOff: S.ROW_OFF, tagsAt: S.TAGS_AT, cta: S.CTA_AT, kicks: S.KICKS,
};
fs.writeFileSync("out/timeline3.json", JSON.stringify(out));
console.log("TOTAL", S.TOTAL, "teaser", S.TEASER, "rewind", S.REWIND, "flicks", S.FLICKS, "rowOff", S.ROW_OFF);
