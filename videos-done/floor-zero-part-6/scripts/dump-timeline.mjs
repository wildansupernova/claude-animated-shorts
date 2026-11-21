// Part 6: bundles floorzero6/story.ts and writes out/timeline6.json (shots + every story event, frames) for the sound.
import { build } from "esbuild";
import fs from "node:fs";
await build({ entryPoints: ["src/videos/floorzero6/story.ts"], bundle: true, format: "esm", platform: "node", outfile: "out/_story6.mjs", logLevel: "error" });
const S = await import(process.cwd() + "/out/_story6.mjs?" + Date.now());
const out = {
  FPS: S.FPS, TOTAL: S.TOTAL, teaser: S.TEASER, shots: S.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light })),
  rewind: S.REWIND, blacks: S.BLACKS, gone2: S.GONE2, slotA: S.SLOT_A, goldA: S.GOLD_A, phoneA: S.PHONE_A, turnA: S.TURN_A, greyA: S.GREY_A, blackA: S.BLACK_A,
  smile: S.SMILE, hairFlash: S.HAIR_FLASH, flashes: S.FLASHES, backup: S.BACKUP, slotB: S.SLOT_B, turnB: S.TURN_B, greyB: S.GREY_B, card2d: S.CARD_2D, rule3: S.RULE3_AT,
  goldB: S.GOLD_B, phoneB: S.PHONE_B, nextWalk: S.NEXT_WALK, rowsDie: S.ROWS_DIE, displayG: S.DISPLAY_G, display0: S.DISPLAY_0, jolt: S.JOLT, blackE: S.BLACK_E, steelE: S.STEEL_E, title: S.TITLE_AT,
};
fs.writeFileSync("out/timeline6.json", JSON.stringify(out));
console.log(JSON.stringify(out).slice(0, 300));
