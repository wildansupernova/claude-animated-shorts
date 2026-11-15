// 2.5D short engine: every frame is painted on one 1080x1920 Canvas2D. A shot is a stack of parallax layers (cached
// static paintings + per-frame drawings) seen through a 2D camera (centre x/y, zoom z, roll r). Place changes
// crossfade, impacts kick the frame (sign-flip shake decaying over 7 f), the hook can end on a white flash.
// Captions are an HTML overlay (captions.tsx) timed to the voice's words.json.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, delayRender, continueRender } from "remotion";
import { Pen } from "./toon";
import { loadFont } from "./captions";

export const W = 1080, H = 1920;
export type Ctx = CanvasRenderingContext2D;
export type Cam = { x: number; y: number; z: number; r: number };
export type Layer = {
  /** parallax factor: 1 = subject plane, <1 far (moves less), >1 foreground */
  d?: number;
  /** static painter (world coords), cached once per tab */
  paint?: (g: Ctx) => void;
  /** cache key (shots that share a painting share the cache) */
  key?: string;
  blur?: number;
  res?: number;
  /** world rect cached by `paint` [x0, y0, x1, y1] */
  bounds?: [number, number, number, number];
  /** per-frame drawing (world coords); f = absolute frame */
  draw?: (g: Ctx, f: number) => void;
  alpha?: (f: number) => number;
  op?: GlobalCompositeOperation;
  /** screen-space drawing (after camera), e.g. light overlays */
  screen?: boolean;
};
export type Shot = { a: number; b: number; layers: Layer[]; cam: (f: number) => Cam; kicks?: number[]; kickAmp?: number; bg?: string };
export type Story = { total: number; shots: Shot[]; xfade?: Record<number, number>; flashes?: number[]; vignette?: number };

// ---------------- math ----------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const easeIn = (u: number) => clamp01(u) ** 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rnd = (seed: number, k = 0) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
/** 0..1 ramp from frame a to b */
export const ramp = (f: number, a: number, b: number) => clamp01((f - a) / Math.max(1, b - a));
/** springy pop 0..1 (overshoots ~12 %) starting at frame a over n frames */
export const pop = (f: number, a: number, n = 8) => {
  const t = clamp01((f - a) / n);
  if (t <= 0) return 0;
  return 1 + 0.12 * Math.sin(t * Math.PI * 1.5) * (1 - t) - (1 - t) ** 3;
};
/** piecewise linear */
export const pw = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- camera ----------------
export type Key = { f: number; c: Partial<Cam>; dur?: number; cut?: boolean; creep?: number };
const REST: Cam = { x: W / 2, y: H / 2, z: 1, r: 0 };
/** keyed camera: glides (smootherstep, `dur` frames, centred on the key) or cuts; every hold creeps in (zoom x e^(creep t)) */
export const camKeys = (keys: Key[], creep0 = 0.0012) => (f: number): Cam => {
  const at = (k: Key): Cam => {
    const c = { ...REST, ...k.c };
    const t = Math.max(0, f - k.f), cr = k.creep ?? creep0;
    return { ...c, z: c.z * Math.exp(cr * t) };
  };
  let cur = at(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const dur = k.dur ?? 20;
    const start = k.cut ? k.f : k.f - dur / 2;
    if (f < start) break;
    const nx = at(k);
    if (k.cut) { cur = nx; continue; }
    const u = glide((f - start) / dur);
    cur = { x: lerp(cur.x, nx.x, u), y: lerp(cur.y, nx.y, u), z: cur.z * Math.pow(nx.z / cur.z, u), r: lerp(cur.r, nx.r, u) };
  }
  return cur;
};

// ---------------- characters / sprites ----------------
/** draw a toon design canvas (600 x 1000, soles at y 975) with the feet at world (x, y), h = px per 1000 units */
export const sprite = (g: Ctx, x: number, y: number, h: number, fn: (p: Pen) => void, flip = false, rot = 0) => {
  const k = h / 1000;
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.scale(flip ? -k : k, k);
  g.translate(-300, -975);
  fn(new Pen(g));
  g.restore();
};
/** generic local drawing: origin at (x, y), uniform scale s, rotation */
export const at = (g: Ctx, x: number, y: number, s: number, fn: (g: Ctx) => void, rot = 0, flip = false) => {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale(flip ? -s : s, s); fn(g); g.restore();
};
export const blinkAt = (f: number, seed: number) => {
  const per = 45 + Math.floor(rnd(seed, 3) * 30), ph = Math.floor(rnd(seed, 4) * per);
  const k = (f + ph) % per;
  return k < 2 ? 1 : k < 4 ? 0.5 : 0;
};
export const shadow = (g: Ctx, x: number, y: number, rx: number, a = 0.28) => {
  g.save();
  const gr = g.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, `rgba(20,12,40,${a})`); gr.addColorStop(0.6, `rgba(20,12,40,${a * 0.6})`); gr.addColorStop(1, "rgba(20,12,40,0)");
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, rx * 0.22, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

// ---------------- render ----------------
const caches = new Map<string, HTMLCanvasElement>();
const lastUse = new Map<string, number>();
/** drop cached paintings not used within 150 frames (keeps memory bounded on long stories) */
const evict = (f: number) => {
  for (const [k, t] of lastUse) if (Math.abs(f - t) > 150) { caches.delete(k); lastUse.delete(k); }
};
const cacheFor = (sid: number, li: number, L: Layer, f: number) => {
  const key = L.key ?? `s${sid}_l${li}`;
  lastUse.set(key, f);
  let c = caches.get(key);
  if (!c) {
    const [x0, y0, x1, y1] = L.bounds ?? [-500, -500, W + 500, H + 500];
    const res = L.res ?? 1.1;
    c = document.createElement("canvas");
    c.width = Math.ceil((x1 - x0) * res); c.height = Math.ceil((y1 - y0) * res);
    const g = c.getContext("2d")!;
    g.scale(res, res); g.translate(-x0, -y0);
    L.paint!(g);
    if (L.blur) {
      const b = document.createElement("canvas");
      b.width = c.width; b.height = c.height;
      const bg = b.getContext("2d")!;
      bg.filter = `blur(${L.blur * res}px)`;
      bg.drawImage(c, 0, 0);
      c = b;
    }
    caches.set(key, c);
  }
  return c;
};

const kickAt = (s: Shot, f: number): [number, number] => {
  let dx = 0, dy = 0;
  for (const k of s.kicks ?? []) {
    const t = f - k;
    if (t < 0 || t > 8) continue;
    const a = (s.kickAmp ?? 22) * (1 - t / 8) ** 1.5 * (t % 2 ? -1 : 1);
    dx += a * 0.6; dy += a;
  }
  return [dx, dy];
};

export const drawShot = (g: Ctx, story: Story, sid: number, f: number) => {
  const s = story.shots[sid];
  const cam = s.cam(f);
  const [kx, ky] = kickAt(s, f);
  g.save();
  g.fillStyle = s.bg ?? "#000"; g.fillRect(0, 0, W, H);
  s.layers.forEach((L, li) => {
    const al = L.alpha ? L.alpha(f) : 1;
    if (al <= 0.001) return;
    g.save();
    g.globalAlpha = al;
    if (L.op) g.globalCompositeOperation = L.op;
    if (!L.screen) {
      const d = L.d ?? 1, zd = Math.pow(cam.z, d);
      g.translate(W / 2 + kx * d, H / 2 + ky * d);
      g.rotate(cam.r * Math.min(1, d));
      g.scale(zd, zd);
      g.translate(-(W / 2 + (cam.x - W / 2) * d), -(H / 2 + (cam.y - H / 2) * d));
    }
    if (L.paint) {
      const c = cacheFor(sid, li, L, f), [x0, y0, x1, y1] = L.bounds ?? [-500, -500, W + 500, H + 500];
      g.drawImage(c, x0, y0, x1 - x0, y1 - y0);
    }
    if (L.draw) L.draw(g, f);
    g.restore();
  });
  g.restore();
};

const shotIndexAt = (story: Story, f: number) => {
  const i = story.shots.findIndex((s) => f >= s.a && f < s.b);
  return i < 0 ? story.shots.length - 1 : i;
};

let off: HTMLCanvasElement | null = null;
export const drawFrame = (g: Ctx, story: Story, f: number) => {
  evict(f);
  const i = shotIndexAt(story, f);
  // crossfade into shot j over xfade[j] frames centred on its start
  let fadeTo = -1, alpha = 0;
  for (const [js, n] of Object.entries(story.xfade ?? {})) {
    const j = Number(js), s = story.shots[j];
    if (s && f >= s.a - n / 2 && f < s.a + n / 2) { fadeTo = j; alpha = (f - (s.a - n / 2) + 1) / (n + 1); }
  }
  if (fadeTo >= 0) {
    drawShot(g, story, fadeTo - 1, f);
    if (!off) { off = document.createElement("canvas"); off.width = W; off.height = H; }
    const og = off.getContext("2d")!;
    og.setTransform(1, 0, 0, 1, 0, 0);
    drawShot(og, story, fadeTo, f);
    g.save(); g.globalAlpha = alpha; g.drawImage(off, 0, 0); g.restore();
  } else drawShot(g, story, i, f);
  // vignette
  const v = story.vignette ?? 0.32;
  if (v > 0) {
    const gr = g.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.48, H * 0.78);
    gr.addColorStop(0, "rgba(10,6,24,0)"); gr.addColorStop(1, `rgba(10,6,24,${v})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  // flashes (4 frames)
  for (const fl of story.flashes ?? []) {
    const t = f - fl;
    if (t >= 0 && t < 4) { g.fillStyle = `rgba(255,255,255,${[1, 0.75, 0.45, 0.2][t]})`; g.fillRect(0, 0, W, H); }
  }
};

export const StoryCanvas: React.FC<{ story: Story }> = ({ story }) => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const h = delayRender("paint " + f);
    // sign text uses the caption face: make sure it is loaded before the first paint of this tab
    loadFont().then(() => {
      const g = ref.current!.getContext("2d")!;
      g.setTransform(1, 0, 0, 1, 0, 0);
      drawFrame(g, story, f);
      continueRender(h);
    });
  }, [f, story]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
