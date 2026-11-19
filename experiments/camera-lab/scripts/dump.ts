// Exports the sound timeline for every variant (real clip frames): story events (mapped through the variant's time
// remap), camera whooshes and kicks. Bundle + run: npx esbuild scripts/dump.ts --bundle --platform=node --outfile=out/dump.cjs && node out/dump.cjs
import fs from "node:fs";
import { VARIANTS, storyAt } from "../src/videos/camlab/variants";
import { EV, B, CLIP, FPS } from "../src/videos/camlab/timeline";

const realOf = (v: number, s: number) => { for (let f = 0; f < CLIP; f++) if (storyAt(v, f) >= s) return f; return CLIP; };
const out = VARIANTS.map((V, v) => ({
  n: V.n, name: V.name,
  ev: Object.fromEntries(Object.entries({ ...EV, giant: B.giant, splatShot: B.splat, tipShot: B.tip }).map(([k, s]) => [k, realOf(v, s)])),
  sfx: V.sfx ?? [], kicks: V.kicks ?? [],
  // slow-motion spans (story speed < 0.6) for a pitch-down on the fall whoosh
  slow: (() => { const r: [number, number][] = []; let a = -1; for (let f = 1; f < CLIP; f++) { const sp = storyAt(v, f) - storyAt(v, f - 1); if (sp < 0.6 && a < 0) a = f; if (sp >= 0.6 && a >= 0) { r.push([a, f]); a = -1; } } return r; })(),
}));
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/timeline.json", JSON.stringify({ fps: FPS, clip: CLIP, variants: out }, null, 1));
console.log("variants", out.length, "events", Object.keys(out[0].ev).join(" "));
