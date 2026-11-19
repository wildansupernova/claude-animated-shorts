// Camera motion stats per variant (720x1280 px per frame, the units of references/reports/motion.md): share of
// frames that move (>= 2 px/f), median and peak speed, number of moves (bursts above 2 px/f, at least 4 f long).
import { VARIANTS, rawCamAt } from "../src/videos/camlab/variants";
import { CLIP } from "../src/videos/camlab/timeline";
import { camMotion } from "../src/videos/camlab/blur";
const H = 1280, W = 720;
const rows = VARIANTS.map((V, v) => {
  const sp: number[] = [];
  for (let f = 1; f < CLIP; f++) {
    if (V.segs.some((g) => g.a === f)) { sp.push(0); continue; } // a cut is not motion
    const m = camMotion(rawCamAt(v, f - 1), rawCamAt(v, f), W / H);
    // screen speed at the frame edge: translation + rotation + scale
    sp.push(Math.hypot(m.vel[0] * W, m.vel[1] * H) + Math.abs(m.rot) * H * 0.5 + Math.abs(m.zoom) * H * 0.5);
  }
  const s = [...sp].sort((a, b) => a - b), med = s[Math.floor(s.length / 2)], peak = s[s.length - 1];
  let moves = 0, run = 0; for (const x of sp) { if (x >= 2) run++; else { if (run >= 4) moves++; run = 0; } } if (run >= 4) moves++;
  return { n: V.n, name: V.name, moving: Math.round((100 * sp.filter((x) => x >= 2).length) / sp.length), med: +med.toFixed(1), peak: Math.round(peak), per10s: +((moves * 300) / CLIP).toFixed(1), cuts: V.segs.length - 1 };
});
console.log("| # | Move | moving frames | median px/f | peak px/f | moves / 10 s | cuts |\n|---|---|---|---|---|---|---|");
for (const r of rows) console.log(`| ${String(r.n).padStart(2, "0")} | ${r.name} | ${r.moving} % | ${r.med} | ${r.peak} | ${r.per10s} | ${r.cuts} |`);
