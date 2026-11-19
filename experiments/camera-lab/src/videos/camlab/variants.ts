// One camera plan per move, all on the same story (timeline.ts). A variant is a list of segments (each segment starts
// with a hard cut, except the first) whose camera is a pure function of the real clip frame f. `time` remaps real
// frames to story frames (speed ramp), `kicks` are impact shakes, `dof` overrides the lens, `hi` marks the frames
// where the featured move happens (the label lights up), `sfx` tells the sound script where the camera whooshes.
import {
  V3, B, EV, CLIP, KID, KID_EYE, TABLE_H, RULER, FLOOR_HIT, GIANT, GKID, GHIT, WIN, clamp01, lerp, toastAt, gtoastAt,
} from "./timeline";
import {
  Cam, Shot, cam, add, sub, mul, len, norm, off, lerp3, rotAxis, basis, glide, inOut3, inOut5, out3, out5, in3, back, spring, prog,
  dolly, creep, pan, tilt, truck, pedestal, arc, crane, zoom, dollyZoom, roll, mixCam, swing, spline, follow, kickAt, applyKick, ramp,
} from "./moves";

export type Seg = { a: number; cam: (f: number) => Cam };
export type Opts = { hideKid1?: boolean; hideKid2?: boolean; near?: number };
export type Variant = {
  n: number; name: string; move: string; what: string; use: string;
  segs: Seg[]; time?: (f: number) => number; kicks?: [number, number][]; dof?: (f: number, c: Cam) => { cInf: number; focus: V3 } | null;
  hi: [number, number][]; shutter?: number; sfx?: [number, "whoosh" | "swish" | "zip" | "boom"][]; opts?: (f: number) => Opts;
};

// ---------------- key points ----------------
const KIDF: V3 = [KID[0], KID_EYE, KID[2]];                 // kid's eyes
const TOASTP = (f: number): V3 => toastAt(f).p;
const GTOASTP = (f: number): V3 => gtoastAt(f).p;
const GKIDF: V3 = [GKID[0], GKID[1] + KID_EYE, GKID[2]];
const MARK = (f: number): V3 => [RULER[0], Math.max(0.1, 0.75 * clamp01((f - EV.mark) / 14)), RULER[2]];

// ---------------- the house framings (what the current shorts do) ----------------
const HOOK = cam({ pos: [0.32, 1.18, 1.05], look: [0.08, 0.9, -1.45], fov: 40 });
const LEG = cam({ pos: [1.55, 0.5, 0.75], look: [0.62, 0.42, -0.9], fov: 40 });
const EDGE = cam({ pos: [1.5, 1.05, 0.4], look: [0.6, 0.68, -1.0], fov: 40 });
const FLOOR = cam({ pos: [1.35, 0.45, -0.25], look: [0.84, 0.06, -1.0], fov: 40 });
const GARDEN = cam({ pos: [3.8, 1.5, -4.3], look: [0.7, 2.35, -9.4], fov: 46 });
const GKIDCU = cam({ pos: [1.25, 4.05, -8.0], look: [GKIDF[0], GKIDF[1] - 0.05, GKIDF[2]], fov: 38 });
const KIDCU = cam({ pos: [0.42, 1.1, -0.35], look: [KIDF[0], KIDF[1] - 0.04, KIDF[2]], fov: 38 });

/** the old grammar: slow creep on every hold, a 30 f punch push on a word, small roll */
const punch = (c: Cam, f: number, f0: number, rate = 0.0025, at = -1, pr = 0.006, n = 30) => {
  let s = rate * Math.max(0, f - f0);
  if (at >= 0) for (let i = 0; i < Math.min(Math.max(0, f - at), n); i++) s += (pr - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return dolly(c, 1 - Math.exp(-s));
};
const base = (c: Cam, f0: number, rollDeg = 0, at = -1) => (f: number) => roll(punch(c, f, f0, 0.0025, at), rollDeg);
/** the five default shots (hard cuts) with the house creep; variants swap pieces of this */
const BASE: Seg[] = [
  { a: B.hook, cam: base(HOOK, B.hook, 1.7, EV.down) },
  { a: B.table, cam: base(LEG, B.table, -1.7, EV.mark) },
  { a: B.tip, cam: base(EDGE, B.tip, 2, EV.slide1) },
  { a: B.splat, cam: base(FLOOR, B.splat, 0) },
  { a: B.giant, cam: base(GARDEN, B.giant, -1.7, EV.gruler) },
];
const withSegs = (over: Record<number, Seg[]>): Seg[] => {
  const out: Seg[] = [];
  BASE.forEach((s, i) => { const o = over[i]; if (o) out.push(...o); else if (o !== undefined) { /* dropped */ } else out.push(s); });
  return out;
};
const lookAt = (c: Cam, p: V3): Cam => ({ ...c, look: p });
const at = (s: Shot) => cam(s);
const W = (f0: number, n: number): [number, number] => [f0, f0 + n];

// ---------------- variants ----------------
export const VARIANTS: Variant[] = [
  {
    n: 0, name: "BASELINE (today)", move: "creep + cut", hi: [],
    what: "What our shorts do now: a cut to each beat, a slow creep in on every hold, a small push on a key word.",
    use: "reference point for the 25 moves after it",
    segs: BASE,
  },
  {
    n: 1, name: "PUSH-IN (dolly in)", move: "push in", hi: [W(EV.down - 4, 30), W(EV.mark - 2, 30), W(EV.slide1 - 2, 26), W(EV.splat, 12), W(EV.gruler - 4, 36)],
    what: "The whole camera travels toward the subject. The background stays put while the subject grows.",
    use: "emphasis, a realisation, 'look at this'",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => dolly(lookAt(HOOK, lerp3(HOOK.look, KIDF, prog(f, EV.down - 4, 30))), 0.3 * prog(f, EV.down - 4, 30) + 0.25 * prog(f, EV.luck - 2, 20)) }],
      1: [{ a: B.table, cam: (f) => dolly(lookAt(LEG, lerp3(LEG.look, MARK(f), prog(f, EV.mark - 2, 30))), 0.5 * prog(f, EV.mark - 2, 30)) }],
      2: [{ a: B.tip, cam: (f) => dolly(EDGE, 0.38 * prog(f, EV.slide1 - 2, 26)) }],
      3: [{ a: B.splat, cam: (f) => dolly(FLOOR, 0.42 * prog(f, EV.splat, 12, out3)) }],
      4: [{ a: B.giant, cam: (f) => dolly(lookAt(GARDEN, lerp3(GARDEN.look, GKIDF, prog(f, EV.gruler - 4, 36))), 0.55 * prog(f, EV.gruler - 4, 36)) }],
    }),
  },
  {
    n: 2, name: "PULL-OUT reveal", move: "pull out", hi: [W(6, 50), W(EV.mark, 34), W(B.splat + 2, 26), W(B.giant + 2, 42)],
    what: "Start tight on a detail, then back away to show where it is. The context arrives as the payoff.",
    use: "reveals, scale, 'and here is the catch'",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => mixCam(at({ pos: [0.5, 0.98, -0.66], look: [0.36, 0.79, -1.05], fov: 38 }), HOOK, prog(f, 6, 50)) }],
      1: [{ a: B.table, cam: (f) => mixCam(at({ pos: [1.0, 0.82, -0.35], look: [0.68, 0.74, -0.86], fov: 38 }), at({ pos: [1.95, 0.75, 1.5], look: [0.35, 0.45, -1.05], fov: 40 }), prog(f, EV.mark, 34)) }],
      3: [{ a: B.splat, cam: (f) => mixCam(at({ pos: [1.0, 0.26, -0.62], look: [0.86, 0.02, -1.0], fov: 38 }), at({ pos: [1.6, 0.8, 0.6], look: [0.4, 0.62, -1.35], fov: 40 }), prog(f, B.splat + 2, 26)) }],
      4: [{ a: B.giant, cam: (f) => mixCam(GKIDCU, at({ pos: [5.2, 1.6, -2.4], look: [0.7, 2.0, -9.4], fov: 44 }), prog(f, B.giant + 2, 42)) }],
    }),
  },
  {
    n: 3, name: "PAN", move: "pan", hi: [W(0, 40), W(EV.ruler - 2, 26), W(EV.nudge, 22), W(B.giant + 2, 40)],
    what: "The camera turns left or right on the spot, like turning your head. Nothing in the scene shifts against anything else.",
    use: "reveal what is beside the subject, follow sideways action",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => swing(at({ pos: [0.8, 1.15, 1.0], look: [-2.6, 1.05, -0.6], fov: 40 }), at({ pos: [0.8, 1.15, 1.0], look: [0.05, 0.92, -1.5], fov: 40 }), prog(f, 0, 40)) }],
      1: [{ a: B.table, cam: (f) => swing(at({ pos: [2.2, 0.55, 0.3], look: [-0.15, 0.55, -1.75], fov: 38 }), at({ pos: [2.2, 0.55, 0.3], look: [0.7, 0.45, -0.84], fov: 38 }), prog(f, EV.ruler - 2, 26)) }],
      2: [{ a: B.tip, cam: (f) => { const c = at({ pos: [1.25, 0.95, 0.8], look: [0, 0.75, -1.0], fov: 36 }), t = TOASTP(Math.min(f, EV.fall0)); return swing(c, lookAt(c, [t[0], 0.75, t[2]]), 1); } }],
      4: [{ a: B.giant, cam: (f) => swing(at({ pos: [5.5, 1.5, -4.0], look: [-1.0, 1.6, -3.3], fov: 44 }), at({ pos: [5.5, 1.5, -4.0], look: [0.6, 2.1, -9.4], fov: 44 }), prog(f, B.giant + 2, 40)) }],
    }),
  },
  {
    n: 4, name: "TILT", move: "tilt", hi: [W(8, 28), W(EV.ruler, 30), W(EV.mark, 18), W(EV.fall0, 60), W(B.giant + 2, 36), W(EV.gfall0, 55)],
    what: "The camera pivots up or down on the spot. In a tall 9:16 frame it is the natural way to measure height.",
    use: "height and scale, things that fall or rise",
    segs: [
      { a: 0, cam: (f) => swing(at({ pos: [0.15, 1.12, 0.95], look: [0.3, 0.78, -1.05], fov: 40 }), at({ pos: [0.15, 1.12, 0.95], look: [-0.05, 0.98, -1.75], fov: 40 }), prog(f, 8, 28)) },
      { a: B.table, cam: (f) => { const p: V3 = [1.45, 0.62, 0.3], top: V3 = [0.7, 0.86, -0.84], low: V3 = [0.7, 0.12, -0.84];
        const d = prog(f, EV.ruler, 30), u = prog(f, EV.mark, 18); return swing(swing(at({ pos: p, look: top, fov: 40 }), at({ pos: p, look: low, fov: 40 }), d), at({ pos: p, look: [0.7, 0.6, -0.84], fov: 40 }), u); } },
      { a: B.tip, cam: (f) => { const p: V3 = [1.6, 0.95, 0.05], t = follow(TOASTP, f, [0, 0, 0], 3).look; return swing(at({ pos: p, look: [0.62, 0.72, -1.0], fov: 38 }), at({ pos: p, look: t, fov: 38 }), prog(f, EV.slide1, 16)); } },
      { a: B.giant, cam: (f) => { const p: V3 = [2.9, 0.55, -6.2];
        const up = swing(at({ pos: p, look: [0.6, 0.35, -9.4], fov: 46 }), at({ pos: p, look: [0.3, 3.7, -9.55], fov: 46 }), prog(f, B.giant + 2, 36));
        const t = follow(GTOASTP, f, [0, 0, 0], 3).look, down = swing(up, at({ pos: p, look: [t[0], Math.max(0.5, t[1]), t[2]], fov: 46 }), prog(f, EV.gfall0, 14));
        return swing(down, at({ pos: p, look: [0.5, 2.6, -9.5], fov: 46 }), prog(f, EV.gland + 3, 20)); } },
    ],
  },
  {
    n: 5, name: "TRUCK (slide)", move: "truck", hi: [W(0, 70), W(EV.ruler, 40), W(EV.nudge, 20), W(B.giant, 70)],
    what: "The camera slides sideways. Near things sweep past faster than far things: that parallax is what sells the depth.",
    use: "walk-and-talk, revealing a set, depth on a flat beat",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => truck(at({ pos: [-1.05, 1.08, 0.75], look: [-0.85, 0.92, -1.6], fov: 40 }), 1.35 * prog(f, 0, 70)) }],
      1: [{ a: B.table, cam: (f) => truck(at({ pos: [-0.1, 0.45, 0.45], look: [-0.1, 0.42, -0.85], fov: 40 }), 0.85 * prog(f, EV.ruler, 40)) }],
      2: [{ a: B.tip, cam: (f) => creep(truck(at({ pos: [0.3, 0.98, 0.25], look: [0.35, 0.74, -1.05], fov: 38 }), 0.33 * prog(f, EV.nudge, 20)), f, EV.slide1, 0.002) }],
      4: [{ a: B.giant, cam: (f) => truck(at({ pos: [-3.7, 1.55, -4.7], look: [-3.3, 2.45, -9.6], fov: 44 }), 4.1 * prog(f, B.giant, 70, inOut3)) }],
    }),
  },
  {
    n: 6, name: "PEDESTAL (boom)", move: "pedestal", hi: [W(0, 60), W(EV.ruler, 34), W(EV.mark, 16), W(EV.fall0, 60), W(B.giant, 22), W(EV.gfall0, 55)],
    what: "The whole camera rises or sinks while the lens stays level, like an elevator.",
    use: "climbing a height, matching something that falls or lifts",
    segs: [
      { a: 0, cam: (f) => pedestal(at({ pos: [0.3, 0.84, 0.95], look: [0.1, 0.84, -1.6], fov: 40 }), 0.42 * prog(f, 0, 60)) },
      { a: B.table, cam: (f) => pedestal(at({ pos: [1.3, 0.95, -0.15], look: [0.7, 0.95, -0.84], fov: 40 }), -0.78 * prog(f, EV.ruler, 34) + 0.55 * prog(f, EV.mark, 16)) },
      { a: B.tip, cam: (f) => { const t = follow(TOASTP, f, [0, 0, 0], 3).look, y = Math.max(0.16, t[1]); return at({ pos: [1.55, y + 0.08, 0.0], look: [0.7, y + 0.02, -1.0], fov: 38 }); } },
      { a: B.giant, cam: (f) => { const t = follow(GTOASTP, f, [0, 0, 0], 3).look, rise = 0.4 + 3.5 * prog(f, B.giant, 22, out3);
        const y = f < EV.gfall0 ? rise : Math.max(0.5, Math.min(rise, t[1] + 0.3)); return at({ pos: [3.0, y, -6.8], look: [0.8, y, -9.4], fov: 46 }); } },
    ],
  },
  {
    n: 7, name: "CRANE / JIB", move: "crane", hi: [W(0, 56), W(EV.fall0, 60), W(EV.gland - 30, 56)],
    what: "The camera on an arm: it rises or swoops down, swings round and tilts all in one smooth move.",
    use: "big openings and endings, 'meanwhile, the whole picture'",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => mixCam(at({ pos: [1.5, 2.55, 0.35], look: [0.05, 0.75, -1.35], fov: 42 }), HOOK, prog(f, 0, 56)) }],
      2: [{ a: B.tip, cam: (f) => mixCam(at({ pos: [1.35, 1.35, 0.15], look: [0.62, 0.66, -1.0], fov: 38 }), at({ pos: [1.75, 0.3, -0.55], look: [0.84, 0.08, -1.0], fov: 40 }), prog(f, EV.fall0, 60)) }],
      4: [{ a: B.giant, cam: (f) => { const c0 = at({ pos: [2.6, 0.55, -7.0], look: [0.8, 1.7, -9.4], fov: 44 });
        const u = prog(f, EV.gland - 30, 56); return crane(lookAt(c0, lerp3(c0.look, [0.6, 2.7, -9.4], u)), 4.6 * u, 28 * u, 3.5 * u); } }],
    }),
  },
  {
    n: 8, name: "ARC / ORBIT", move: "orbit", hi: [W(0, 97), W(B.table, 88), W(EV.slide1, 93), W(B.splat, 28), W(B.giant, 104)],
    what: "The camera circles the subject, keeping it centred while the background turns behind it.",
    use: "turning points, heroes, an object worth studying",
    segs: [
      { a: 0, cam: (f) => arc(at({ pos: [0.95, 1.18, 0.95], look: [0.05, 0.92, -1.45], fov: 40 }), -32 * prog(f, 0, 97, (u) => u)) },
      { a: B.table, cam: (f) => arc(at({ pos: [1.6, 0.55, 0.3], look: [0.68, 0.42, -0.86], fov: 40 }), 40 * prog(f, B.table, 88, (u) => u)) },
      { a: B.tip, cam: (f) => { const c = arc(at({ pos: [1.45, 0.9, -0.05], look: [0.62, 0.68, -1.0], fov: 38 }), -55 * prog(f, B.tip, 103, (u) => u)), t = follow(TOASTP, f, [0, 0, 0], 3).look;
        return f < EV.fall0 ? c : lookAt(c, lerp3(c.look, t, prog(f, EV.fall0, 14))); } },
      { a: B.splat, cam: (f) => arc(FLOOR, 30 * prog(f, B.splat, 28, out3)) },
      { a: B.giant, cam: (f) => arc(at({ pos: [6.2, 1.6, -5.6], look: [0.7, 1.8, -9.4], fov: 44 }), -100 * prog(f, B.giant, 104, (u) => u)) },
    ],
  },
  {
    n: 9, name: "FOLLOW / TRACKING", move: "follow", hi: [W(EV.nudge, B.giant - EV.nudge), W(EV.gfall0 - 4, 70)],
    what: "The camera locks onto a moving subject and travels with it, trailing a few frames behind.",
    use: "chases, falling or flying objects, one continuous action",
    segs: withSegs({
      2: [{ a: B.tip, cam: (f) => { const c = follow(TOASTP, f, [0.85, 0.32, 0.95], 4, [0, 0, 0], 38); return { ...c, pos: [c.pos[0], Math.max(0.2, c.pos[1]), c.pos[2]] }; } }],
      3: null as unknown as Seg[],
      4: [{ a: B.giant, cam: (f) => { const c = follow(GTOASTP, f, [1.5, 0.35, 1.8], 4, [0, 0, 0], 40), c2 = { ...c, pos: [c.pos[0], Math.max(0.3, c.pos[1]), c.pos[2]] as V3 };
        return mixCam(c2, at({ pos: [3.4, 1.3, -6.0], look: [0.9, 2.3, -9.45], fov: 44 }), prog(f, EV.gland + 2, 22)); } }],
    }),
  },
  {
    n: 10, name: "LENS ZOOM", move: "zoom", hi: [W(0, 80), W(EV.mark, 22), W(EV.slide1, 20), W(B.giant, 44), W(EV.gfall0, 40)],
    what: "Only the lens changes: nothing moves, so the picture flattens. Compare it with 01, where the camera travels.",
    use: "a watched or observed feel, documentary, telephoto squeeze",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => zoom(at({ pos: [0.42, 1.12, 2.85], look: [0.02, 0.95, -1.5] }), lerp(46, 22, prog(f, 0, 80))) }],
      1: [{ a: B.table, cam: (f) => zoom(at({ pos: [2.6, 0.62, 1.9], look: [0.7, 0.45, -0.84] }), lerp(40, 17, prog(f, EV.mark, 22))) }],
      2: [{ a: B.tip, cam: (f) => zoom(EDGE, lerp(38, 25, prog(f, EV.slide1, 20))) }],
      4: [{ a: B.giant, cam: (f) => zoom(lookAt(at({ pos: [8.5, 1.6, -3.4], look: [0.6, 2.2, -9.4] }), lerp3([0.6, 2.2, -9.4], [0.35, 3.75, -9.55], prog(f, B.giant, 44))), lerp(42, 13, prog(f, B.giant, 44)) + 22 * prog(f, EV.gfall0, 40)) }],
    }),
  },
  {
    n: 11, name: "SNAP ZOOM (crash zoom)", move: "snap!", shutter: 1, hi: [W(EV.down - 2, 8), W(EV.luck - 2, 8), W(EV.mark + 12, 8), W(EV.slide1 - 1, 8), W(EV.splat, 8), W(EV.gruler, 8)],
    what: "A zoom that takes 4-6 frames, usually with a whoosh. A comic or dramatic punctuation mark.",
    use: "punchlines, sudden realisations, hits on a beat",
    sfx: [[EV.down - 2, "zip"], [EV.luck - 2, "zip"], [EV.mark + 12, "zip"], [EV.slide1 - 1, "zip"], [EV.splat, "zip"], [EV.gruler, "zip"]],
    segs: withSegs({
      0: [{ a: 0, cam: (f) => { const c = lookAt(HOOK, lerp3(HOOK.look, KIDF, prog(f, EV.down - 2, 5, out5))); return zoom(c, 40 - 15 * prog(f, EV.down - 2, 5, out5) - 9 * prog(f, EV.luck - 2, 5, out5)); } }],
      1: [{ a: B.table, cam: (f) => zoom(lookAt(LEG, lerp3(LEG.look, [0.7, 0.75, -0.84], prog(f, EV.mark + 12, 5, out5))), 40 - 22 * prog(f, EV.mark + 12, 5, out5)) }],
      2: [{ a: B.tip, cam: (f) => zoom(lookAt(EDGE, lerp3(EDGE.look, [0.64, 0.74, -1.0], prog(f, EV.slide1 - 1, 5, out5))), 38 - 16 * prog(f, EV.slide1 - 1, 5, out5)) }],
      3: [{ a: B.splat, cam: (f) => zoom(FLOOR, 40 - 18 * prog(f, EV.splat, 5, out5)) }],
      4: [{ a: B.giant, cam: (f) => zoom(lookAt(GARDEN, lerp3(GARDEN.look, GKIDF, prog(f, EV.gruler, 5, out5))), 46 - 32 * prog(f, EV.gruler, 5, out5)) }],
    }),
  },
  {
    n: 12, name: "DOLLY ZOOM (vertigo)", move: "vertigo", hi: [W(EV.luck - 8, 22), W(B.splat + 8, 20), W(EV.gfall0, 52)],
    what: "Push in while zooming out (or the reverse): the subject keeps its size but the world stretches behind it.",
    use: "shock, dread, 'oh no', a sense of height",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => dollyZoom(at({ pos: [0.32, 1.12, 0.75], look: [KIDF[0], KIDF[1] - 0.05, KIDF[2]], fov: 24 }), 0.62 * prog(f, EV.luck - 8, 22)) }],
      3: [{ a: B.splat, cam: (f) => FLOOR }, { a: B.splat + 8, cam: (f) => dollyZoom(at({ pos: [0.55, 1.08, 0.55], look: [KIDF[0], KIDF[1] - 0.05, KIDF[2]], fov: 22 }), 0.66 * prog(f, B.splat + 8, 20)) }],
      4: [{ a: B.giant, cam: (f) => dollyZoom(at({ pos: [1.32, 4.4, -8.95], look: [1.4, 0.0, -9.35], fov: 34 }), 0.45 * prog(f, EV.gfall0, 52)) }],
    }),
  },
  {
    n: 13, name: "WHIP PAN", move: "whip", shutter: 1, hi: [W(88, 18), W(278, 18), W(306, 20)],
    what: "A pan so fast it smears into motion blur. Cut inside the blur and two places join into one move.",
    use: "jumping place or time with energy (once or twice a video)",
    sfx: [[88, "whoosh"], [278, "whoosh"], [306, "whoosh"]],
    segs: [
      { a: 0, cam: (f) => swing(base(HOOK, 0, 1.7, EV.down)(f), pan(HOOK, -75), prog(f, 88, 9, (u) => u * u * u)) },
      { a: B.table, cam: (f) => swing(pan(LEG, 75), LEG, prog(f, B.table, 9, out3)) },
      { a: B.tip, cam: (f) => swing(EDGE, tilt(EDGE, -70), prog(f, 279, 9, (u) => u * u * u)) },
      { a: B.splat, cam: (f) => swing(tilt(FLOOR, 60), base(FLOOR, B.splat)(f), prog(f, B.splat, 8, out3)) },
      { a: 306, cam: (f) => swing(at({ pos: [0.5, 1.05, 0.45], look: [KIDF[0], 0.95, KIDF[2]], fov: 38 }), pan(at({ pos: [0.5, 1.05, 0.45], look: [KIDF[0], 0.95, KIDF[2]], fov: 38 }), -75), prog(f, 307, 9, (u) => u * u * u)) },
      { a: B.giant, cam: (f) => swing(pan(GARDEN, 75), GARDEN, prog(f, B.giant, 10, out3)) },
    ],
  },
  {
    n: 14, name: "FLY-THROUGH", move: "fly-through", shutter: 0.75, hi: [W(0, 66), W(298, 40)],
    what: "The camera flies through an opening (a window, a gap) and carries you into the next space without a cut.",
    use: "openings, changing place, 'come with me'",
    sfx: [[2, "whoosh"], [300, "whoosh"]],
    segs: [
      { a: 0, cam: (f) => { const u = prog(f, 0, 66, inOut3);
        const P: V3[] = [[0.7, 2.5, -7.2], [0.3, 1.75, -5.0], [0.2, 1.58, -3.05], [0.3, 1.62, -1.6], [0.62, 1.4, -0.1], [0.45, 1.2, 1.0]];
        const pos = spline(P, u), ahead = spline(P, Math.min(1, u + 0.06)), dir = norm(sub(ahead, pos));
        const fly = { pos, look: add(pos, mul(dir, 2)), fov: 46, roll: 0 } as Cam, end = { ...HOOK, pos };
        const c = u < 0.62 ? fly : swing(fly, end, glide((u - 0.62) / 0.38));
        return f < 66 ? c : base(HOOK, 66, 1.7, EV.down)(f); } },
      { a: B.table, cam: base(LEG, B.table, -1.7, EV.mark) },
      { a: B.tip, cam: base(EDGE, B.tip, 2, EV.slide1) },
      { a: B.splat, cam: (f) => { if (f < 298) return base(FLOOR, B.splat, 0)(f);
        const u = prog(f, 298, 40, inOut3), c0 = base(FLOOR, B.splat, 0)(298);
        const P: V3[] = [c0.pos, [0.95, 1.0, -0.55], [0.45, 1.55, -1.25], [0.2, 1.58, -2.4], [0.2, 1.6, -3.1], [0.45, 1.95, -4.4], [1.6, 2.4, -5.6]];
        const pos = spline(P, u), ahead = spline(P, Math.min(1, u + 0.06));
        const fly = { pos, look: add(pos, mul(norm(sub(ahead, pos)), 2)), fov: 44, roll: 0 } as Cam;
        const start = swing(c0, fly, glide(u / 0.15)), land = { pos, look: [0.5, 2.9, -9.5] as V3, fov: 48, roll: 0 };
        return u < 0.15 ? start : u < 0.75 ? fly : swing(fly, land, glide((u - 0.75) / 0.25)); } },
      { a: 338, cam: (f) => creep(at({ pos: [1.6, 2.4, -5.6], look: [0.5, 2.9, -9.5], fov: 48 }), f, 338, 0.0015) },
    ],
  },
  {
    n: 15, name: "DUTCH ROLL", move: "roll", hi: [W(EV.luck - 6, 24), W(B.table, 88), W(EV.slide1, 33), W(B.splat, 8), W(EV.gland, 20)],
    what: "The horizon tilts. A rolling camera says something is off-balance; returning to level says it is resolved.",
    use: "tension, wrongness, comedy wobble",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => roll(base(HOOK, 0, 0, EV.down)(f), 9 * prog(f, EV.luck - 6, 24)) }],
      1: [{ a: B.table, cam: (f) => roll(base(LEG, B.table, 0, EV.mark)(f), -7 - 5 * prog(f, B.table, 88, (u) => u)) }],
      2: [{ a: B.tip, cam: (f) => roll(base(EDGE, B.tip, 0, EV.slide1)(f), 15 * prog(f, EV.slide1, 33) - 4 * prog(f, EV.fall0, 40)) }],
      3: [{ a: B.splat, cam: (f) => roll(base(FLOOR, B.splat)(f), -13 + 6 * prog(f, B.splat + 4, 20)) }],
      4: [{ a: B.giant, cam: (f) => roll(base(GARDEN, B.giant, 0, EV.gruler)(f), -8 * prog(f, EV.gland, 20, back)) }],
    }),
  },
  {
    n: 16, name: "IMPACT SHAKE", move: "kick", hi: [W(EV.down, 7), W(EV.ruler + 1, 7), W(EV.mark + 14, 7), W(EV.splat, 10), W(EV.gruler + 1, 7), W(EV.gland, 9)],
    what: "A few frames of camera jolt on a hit: the offset flips every frame and dies in about 7 frames.",
    use: "impacts, landings, stomps, slams",
    kicks: [[EV.down, 0.7], [EV.ruler + 1, 0.9], [EV.mark + 14, 0.6], [EV.splat, 2.4], [EV.splat + 3, 1.0], [EV.gruler + 1, 1.0], [EV.gland, 2.0]],
    segs: BASE,
  },
  {
    n: 17, name: "RACK FOCUS", move: "focus pull", hi: [W(EV.luck - 12, 14), W(EV.mark - 6, 14), W(EV.slide1 - 4, 14), W(B.splat + 14, 14), W(B.giant + 20, 16)],
    what: "The camera holds still and the focus moves from one depth to another, telling you where to look.",
    use: "connecting two things in one frame (cause and effect)",
    dof: (f) => {
      const R = (a: V3, b: V3, f0: number) => ({ cInf: 22, focus: lerp3(a, b, prog(f, f0, 14)) });
      if (f < B.table) return R(TOASTP(f), KIDF, EV.luck - 12);
      if (f < B.tip) return R(KIDF, [RULER[0], 0.6, RULER[2]], EV.mark - 6);
      if (f < B.splat) return R(KIDF, TOASTP(f), EV.slide1 - 4);
      if (f < B.giant) return R(FLOOR_HIT, [KID[0], 0.45, KID[2]], B.splat + 14);
      return { cInf: 22, focus: lerp3([-1.05, 1.15, -6.55], GKIDF, prog(f, B.giant + 20, 16)) };
    },
    segs: [
      { a: 0, cam: (f) => creep(at({ pos: [0.62, 0.92, -0.42], look: [0.12, 0.92, -1.6], fov: 34 }), f, 0, 0.0015) },
      { a: B.table, cam: (f) => creep(at({ pos: [0.95, 0.68, -0.35], look: [0.2, 0.8, -1.6], fov: 36 }), f, B.table, 0.0015) },
      { a: B.tip, cam: (f) => creep(at({ pos: [1.2, 0.86, -0.55], look: [0.3, 0.85, -1.5], fov: 36 }), f, B.tip, 0.0015) },
      { a: B.splat, cam: (f) => creep(at({ pos: [1.3, 0.1, -0.7], look: [0.2, 0.32, -1.75], fov: 44 }), f, B.splat, 0.0015) },
      { a: B.giant, cam: (f) => creep(at({ pos: [-1.35, 1.3, -5.55], look: [0.2, 2.9, -9.5], fov: 44 }), f, B.giant, 0.0015) },
    ],
  },
  {
    n: 18, name: "FOREGROUND WIPE", move: "wipe / reveal", hi: [W(0, 46), W(172, 22), W(296, 30)],
    what: "Something close to the lens fills the frame and clears it: a reveal from behind an object, or a hidden cut.",
    use: "reveals, joining two shots without a visible cut",
    sfx: [[176, "swish"], [304, "swish"]],
    segs: [
      { a: 0, cam: (f) => creep(truck(at({ pos: [-0.55, 0.86, 0.12], look: [-0.45, 0.9, -1.6], fov: 40 }), 0.95 * prog(f, 0, 46)), f, 46, 0.002) },
      { a: B.table, cam: (f) => truck(at({ pos: [1.0, 0.42, 0.25], look: [0.72, 0.4, -0.9], fov: 40 }), 0.62 * prog(f, 172, 13, in3)) },
      { a: B.tip, cam: (f) => truck(at({ pos: [1.62, 0.95, 0.15], look: [0.62, 0.66, -1.0], fov: 38 }), -0.42 * (1 - prog(f, B.tip, 14, out3))) },
      { a: B.splat, cam: (f) => pedestal(base(FLOOR, B.splat)(f), 0.5 * prog(f, 300, 16, in3)) },
      { a: B.giant, cam: (f) => truck(at({ pos: [-2.0, 1.5, -5.4], look: [-2.0, 2.7, -9.5], fov: 44 }), 2.5 * prog(f, B.giant, 40, inOut3)) },
    ],
  },
  {
    n: 19, name: "LOW ANGLE (worm's eye)", move: "low angle", hi: [W(0, CLIP)],
    what: "The camera sits low and looks up. Whatever it looks up at becomes big, tall and important.",
    use: "power, scale, heroes, 'this table is tall'",
    segs: [
      { a: 0, cam: (f) => creep(at({ pos: [0.38, 0.79, 0.05], look: [-0.1, 1.15, -1.8], fov: 44 }), f, 0, 0.003) },
      { a: B.table, cam: (f) => creep(at({ pos: [1.22, 0.07, -0.18], look: [0.66, 0.62, -0.88], fov: 46 }), f, B.table, 0.0025) },
      { a: B.tip, cam: (f) => creep(at({ pos: [1.3, 0.1, -0.42], look: [0.62, 0.78, -1.0], fov: 44 }), f, B.tip, 0.0025) },
      { a: B.splat, cam: (f) => creep(at({ pos: [1.28, 0.06, -0.5], look: [0.45, 0.35, -1.5], fov: 46 }), f, B.splat, 0.003) },
      { a: B.giant, cam: (f) => creep(at({ pos: [2.25, 0.15, -7.0], look: [0.45, 3.0, -9.5], fov: 50 }), f, B.giant, 0.002) },
    ],
  },
  {
    n: 20, name: "TOP-DOWN (bird's eye)", move: "top-down", hi: [W(0, CLIP)],
    what: "Straight down from above: the scene turns into a flat, graphic map. A slow spin keeps it alive.",
    use: "maps, layouts, recipes, the moment of impact",
    segs: [
      { a: 0, cam: (f) => roll(at({ pos: [-0.12, 2.82 - 0.25 * prog(f, 0, 97), -1.55], look: [0.05, 0, -1.95], fov: 55 }), 12 * prog(f, 0, 97, (u) => u)) },
      { a: B.table, cam: base(LEG, B.table, -1.7, EV.mark) },
      { a: B.tip, cam: (f) => roll(at({ pos: [0.72, 1.95 - 0.25 * prog(f, B.tip, 103), -0.98], look: [0.72, 0, -1.02], fov: 44 }), 90 - 10 * prog(f, B.tip, 103, (u) => u)) },
      { a: B.splat, cam: (f) => roll(at({ pos: [0.86, 1.25 - 0.3 * prog(f, B.splat, 28, out3), -0.98], look: [0.86, 0, -1.02], fov: 42 }), 70 + 12 * prog(f, B.splat, 28, out3)) },
      { a: B.giant, cam: (f) => roll(at({ pos: [-0.15, 6.5 - 0.5 * prog(f, B.giant, 104), -9.5], look: [0.7, 0, -9.5], fov: 44 }), 25 * prog(f, B.giant, 104, (u) => u)) },
    ],
  },
  {
    n: 21, name: "POV (toast cam)", move: "POV", hi: [W(0, B.table), W(EV.slide1, B.splat - EV.slide1 + 6), W(EV.gfall0 - 6, 60)],
    what: "We see through someone's (or something's) eyes. Here: the kid looking down, then riding the toast itself.",
    use: "empathy, immersion, a funny point of view",
    opts: (f) => ({ hideKid1: f < B.table, near: f >= B.tip && f < B.splat + 2 ? 0.012 : f >= B.giant ? 0.012 : 0.05 }),
    segs: [
      { a: 0, cam: (f) => roll(creep(at({ pos: [KIDF[0], KIDF[1] + 0.05, KIDF[2] + 0.05], look: [0.36, 0.76, -1.05], fov: 50 }), f, 0, 0.002), 3 * Math.sin(f * 0.05)) },
      { a: B.table, cam: base(LEG, B.table, -1.7, EV.mark) },
      { a: B.tip, cam: (f) => { if (f < EV.slide1) return base(EDGE, B.tip, 2)(f);
        const t = toastAt(f), a = -t.rz, up: V3 = [-Math.sin(a), Math.cos(a), 0], fw: V3 = [Math.cos(a), Math.sin(a), 0];
        const pos = add(add(t.p, mul(up, 0.045)), mul(fw, -0.05)), dir = norm(add(mul(fw, 1), mul(up, 0.35)));
        return { pos, look: add(pos, dir), fov: 62, roll: 0 }; } },
      { a: B.splat + 2, cam: (f) => roll(base(FLOOR, B.splat)(f), 0) },
      { a: B.giant, cam: (f) => { if (f < EV.gfall0 - 6) return base(GARDEN, B.giant, 0)(f);
        const t = gtoastAt(f), a = -t.rz, up: V3 = [-Math.sin(a), Math.cos(a), 0], fw: V3 = [Math.cos(a), Math.sin(a), 0];
        const pos = add(add(t.p, mul(up, 0.045)), mul(fw, -0.05)), dir = norm(add(mul(fw, 1), mul(up, 0.3)));
        return f < EV.gland + 2 ? { pos, look: add(pos, dir), fov: 66, roll: 0 } : creep(at({ pos: [GHIT[0] + 0.9, 0.7, GHIT[2] + 1.0], look: [GHIT[0], 0.3, GHIT[2]], fov: 44 }), f, EV.gland + 2, 0.003); } },
    ],
  },
  {
    n: 22, name: "SPEED RAMP", move: "slow-mo", hi: [W(212, 70), W(352, 40)],
    what: "Time slows down for the important frames and then catches up. The camera keeps moving at normal speed.",
    use: "the money shot: a flip, a hit, a catch",
    time: (f) => ramp(ramp(f, EV.slide1, EV.splat, 0.22, 0.62), EV.gfall0 - 4, EV.gland, 0.25, 0.6),
    segs: withSegs({
      2: [{ a: B.tip, cam: (f) => { const c = arc(at({ pos: [1.5, 0.82, -0.1], look: [0.66, 0.5, -1.0], fov: 40 }), -38 * prog(f, B.tip, 103, (u) => u)); return c; } }],
      4: [{ a: B.giant, cam: (f) => arc(at({ pos: [4.6, 1.6, -5.6], look: [0.9, 2.35, -9.4], fov: 46 }), -40 * prog(f, B.giant, 104, (u) => u)) }],
    }),
  },
  {
    n: 23, name: "OVERSHOOT & SETTLE", move: "spring", hi: [W(0, 18), W(EV.down - 2, 18), W(EV.mark + 10, 18), W(EV.slide1 - 2, 18), W(EV.splat, 16), W(B.giant, 26), W(EV.gruler, 18)],
    what: "Every move lands a little past its mark and springs back. Weight and bounce: very cartoon.",
    use: "comedy, kids' content, snappy reframes",
    segs: withSegs({
      0: [{ a: 0, cam: (f) => dolly(mixCam(pedestal(HOOK, 0.55), HOOK, prog(f, 0, 18, spring)), 0.3 * prog(f, EV.down - 2, 18, spring)) }],
      1: [{ a: B.table, cam: (f) => dolly(lookAt(LEG, lerp3(LEG.look, MARK(EV.mark + 14), prog(f, EV.mark + 10, 18, spring))), 0.4 * prog(f, EV.mark + 10, 18, spring)) }],
      2: [{ a: B.tip, cam: (f) => dolly(EDGE, 0.35 * prog(f, EV.slide1 - 2, 18, spring)) }],
      3: [{ a: B.splat, cam: (f) => dolly(FLOOR, 0.4 * prog(f, EV.splat, 16, spring)) }],
      4: [{ a: B.giant, cam: (f) => dolly(lookAt(mixCam(pedestal(GARDEN, 2.4), GARDEN, prog(f, B.giant, 26, spring)), lerp3(GARDEN.look, GKIDF, prog(f, EV.gruler, 18, spring))), 0.45 * prog(f, EV.gruler, 18, spring)) }],
    }),
  },
  {
    n: 24, name: "SPIN TRANSITION", move: "spin", shutter: 1, hi: [W(87, 20), W(EV.fall0, 60), W(306, 20)],
    what: "The camera rolls through a half turn into the cut and finishes the turn in the next shot. Here it also spins with the toast.",
    use: "energetic scene changes, matching something that spins",
    sfx: [[86, "whoosh"], [305, "whoosh"]],
    segs: [
      { a: 0, cam: (f) => roll(base(HOOK, 0, 0, EV.down)(f), 180 * prog(f, 87, 10, in3)) },
      { a: B.table, cam: (f) => roll(base(LEG, B.table)(f), -180 + 180 * prog(f, B.table, 10, out3)) },
      { a: B.tip, cam: (f) => { const t = toastAt(f); return roll(base(EDGE, B.tip)(f), f < EV.fall0 ? 0 : ((t.rz - 0.42) * 180) / Math.PI * 0.5); } },
      { a: B.splat, cam: (f) => roll(base(FLOOR, B.splat)(f), 90 * (1 - prog(f, B.splat, 10, out3)) + 180 * prog(f, 306, 10, in3)) },
      { a: B.giant, cam: (f) => roll(base(GARDEN, B.giant)(f), -180 + 180 * prog(f, B.giant, 10, out3)) },
    ],
  },
  {
    n: 25, name: "MIXED (recommended)", move: "combo", shutter: 0.75, hi: [W(0, 30), W(EV.down - 2, 8), W(88, 18), W(EV.mark, 16), W(EV.slide1, 90), W(EV.splat, 10), W(298, 40), W(B.giant + 20, 70)],
    what: "A suggested mix for real shorts: pull-out open, a snap on the hook word, whip-tilt, slow-mo orbit, kick, fly-through, crane out.",
    use: "a starting recipe; swap moves per beat",
    kicks: [[EV.splat, 2.0], [EV.splat + 3, 0.8], [EV.gland, 1.6]],
    time: (f) => ramp(ramp(f, EV.slide1, EV.splat, 0.3, 0.62), EV.gfall0 - 4, EV.gland, 0.3, 0.6),
    sfx: [[EV.down - 2, "zip"], [88, "whoosh"], [300, "whoosh"]],
    segs: [
      { a: 0, cam: (f) => { const c = mixCam(at({ pos: [0.5, 0.98, -0.66], look: [0.36, 0.79, -1.05], fov: 38 }), HOOK, prog(f, 0, 30, spring));
        const z = zoom(lookAt(c, lerp3(c.look, KIDF, prog(f, EV.down - 2, 5, out5))), 40 - 12 * prog(f, EV.down - 2, 5, out5));
        return swing(roll(z, 4 * prog(f, EV.luck - 4, 16)), tilt(z, -70), prog(f, 89, 8, in3)); } },
      { a: B.table, cam: (f) => { const p: V3 = [1.45, 0.62, 0.3];
        const c = swing(at({ pos: p, look: [0.7, 1.5, -0.84], fov: 40 }), at({ pos: p, look: [0.7, 0.2, -0.84], fov: 40 }), prog(f, B.table, 10, out3));
        return dolly(swing(c, at({ pos: p, look: [0.7, 0.66, -0.84], fov: 40 }), prog(f, EV.mark, 16)), 0.3 * prog(f, EV.mark, 30)); } },
      { a: B.tip, cam: (f) => { const c = arc(at({ pos: [1.5, 0.82, -0.1], look: [0.66, 0.62, -1.0], fov: 40 }), -40 * prog(f, B.tip, 103, (u) => u));
        return lookAt(c, lerp3(c.look, [0.78, 0.3, -1.0], prog(f, EV.fall0 + 10, 40))); } },
      { a: B.splat, cam: (f) => { if (f < 298) return dolly(FLOOR, 0.35 * prog(f, B.splat, 6, out5));
        const u = prog(f, 298, 40, inOut3), c0 = dolly(FLOOR, 0.35);
        const P: V3[] = [c0.pos, [0.95, 1.0, -0.55], [0.45, 1.55, -1.25], [0.2, 1.58, -2.4], [0.2, 1.6, -3.1], [0.45, 1.95, -4.4], [1.6, 2.4, -5.6]];
        const pos = spline(P, u), ahead = spline(P, Math.min(1, u + 0.06));
        const fly = { pos, look: add(pos, mul(norm(sub(ahead, pos)), 2)), fov: 44, roll: 0 } as Cam;
        const start = swing(c0, fly, glide(u / 0.15)), land = { pos, look: [0.5, 2.9, -9.5] as V3, fov: 48, roll: 0 };
        return u < 0.15 ? start : u < 0.75 ? fly : swing(fly, land, glide((u - 0.75) / 0.25)); } },
      { a: 338, cam: (f) => { const c0 = at({ pos: [1.6, 2.4, -5.6], look: [0.5, 2.9, -9.5], fov: 48 });
        const u = prog(f, EV.gland - 6, 40); return crane(lookAt(c0, lerp3(c0.look, [0.75, 2.3, -9.4], prog(f, 338, 30))), 3.2 * u, 18 * u, 3.0 * u); } },
    ],
  },
];

// ---------------- lookups ----------------
const segAt = (v: number, f: number) => { const S = VARIANTS[v].segs; let g = S[0]; for (const s of S) if (f >= s.a) g = s; return g; };
/** camera without kicks (used for motion blur) */
export const rawCamAt = (v: number, f: number): Cam => segAt(v, Math.max(0, f)).cam(Math.max(0, f));
export const camAt = (v: number, f: number): Cam => {
  const c = rawCamAt(v, f), k = VARIANTS[v].kicks;
  return k ? applyKick(c, kickAt(f, k)) : c;
};
export const storyAt = (v: number, f: number) => VARIANTS[v].time?.(f) ?? f;
export const optsAt = (v: number, f: number): Opts => VARIANTS[v].opts?.(f) ?? {};
export const hiAt = (v: number, f: number) => VARIANTS[v].hi.some(([a, b]) => f >= a && f < b);
/** lens: the variant's own table, else blur by how close the look point is (wides stay sharp) */
export const dofAt = (v: number, f: number, c: Cam) => {
  const d = VARIANTS[v].dof?.(f, c);
  if (d) return d;
  const L = len(sub(c.look, c.pos));
  const cInf = L < 0.8 ? 14 : L < 1.6 ? 12 : L < 3 ? 9 : L < 6 ? 5 : 0;
  return { cInf, focus: c.look };
};
void [rotAxis, basis, inOut5, off, crane, tilt, pan, GIANT, TABLE_H, WIN, KIDCU, GKIDCU];
