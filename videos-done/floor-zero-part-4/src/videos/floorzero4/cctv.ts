// The security feed on -3 (Part 4): a high camera in front of you, looking back at you and the elevator wall. Drawn in
// 2D (the cast are yaw-only cards that face the main camera, so a second 3D camera would see them edge-on), into every
// desk monitor's texture (world.ts) and into the full-screen inserts (Overlay.tsx). Not mirrored, so the thing behind
// you is: its badge reads UOY and its hair strand runs the wrong way; its face is a dark smudge in the grain.
import { Pen, bodyFront, Outfit, FrontOpts } from "./toon";
import { YOU_O } from "./cast";

export type CctvOpts = {
  t: number; raise: number; fig: boolean; clock: string;
  /** digital push-in: zoom about (zx, zy) in the 640 x 400 design space */
  zoom?: number; zx?: number; zy?: number;
  /** grain + scanlines (off for the tiny monitor copies, where they would alias) */
  grain?: boolean;
};
const W = 640, H = 400;
/** face and badge heights as fractions of the body height (for the smudge and the push-in) */
export const FACE_Y = 0.655, BADGE_Y = 0.4;
/** where things stand in the design space (feet at y), body height in design units */
export const CC = { you: { x: 282, y: 396, h: 330 }, fig: { x: 344, y: 346, h: 292 } };
const FIG_O: Outfit = { ...YOU_O, badge: "YOU" };
const ME_O: Outfit = { ...YOU_O, badge: "YOU" };

/** push-in targets on the one behind you: its face (the smudge) and its badge */
export const FIG_FACE: [number, number] = [CC.fig.x, CC.fig.y - CC.fig.h * FACE_Y];
export const FIG_BADGE: [number, number] = [CC.fig.x, CC.fig.y - CC.fig.h * BADGE_Y];
const hash = (i: number) => { const v = Math.sin(i * 127.1) * 43758.5453; return v - Math.floor(v); };

const body = (g: CanvasRenderingContext2D, o: Outfit, fo: FrontOpts, x: number, y: number, hgt: number, mirror: boolean) => {
  const s = hgt / 1000;
  g.save(); g.translate(x, y); g.scale(mirror ? -s : s, s); g.translate(-300, -975);
  bodyFront(new Pen(g), o, fo);
  g.restore();
};

const scene = (g: CanvasRenderingContext2D, o: CctvOpts) => {
  // the elevator wall behind you
  g.fillStyle = "#3b423d"; g.fillRect(0, 0, W, 150);
  g.fillStyle = "#2b312d"; g.fillRect(0, 138, W, 12);
  const door = (x0: number, x1: number, y0: number, col: string) => {
    g.fillStyle = "#1e2320"; g.fillRect(x0 - 6, y0 - 6, x1 - x0 + 12, 150 - y0 + 6);
    g.fillStyle = col; g.fillRect(x0, y0, x1 - x0, 150 - y0);
  };
  door(92, 150, 34, "#57514e"); // the stairwell (left of frame)
  g.fillStyle = "#e8f0e8"; g.fillRect(104, 14, 34, 13); // its EXIT sign
  door(266, 346, 24, "#646b66"); g.fillStyle = "#2a2f2c"; g.fillRect(305, 24, 2, 126); // the elevator, centre seam
  door(452, 532, 24, "#646b66"); g.fillStyle = "#2a2f2c"; g.fillRect(491, 24, 2, 126);
  g.fillStyle = "#0e100f"; g.fillRect(292, 6, 28, 13); g.fillStyle = "#f6f6f6"; g.font = "900 11px Montserrat, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("-3", 306, 13);
  g.fillStyle = "#e9e6dd"; g.fillRect(566, 50, 26, 34); g.fillStyle = "#8a2a24"; g.fillRect(568, 52, 22, 10); // the sign
  // the floor: carpet tiles in perspective
  g.fillStyle = "#2c322e"; g.fillRect(0, 150, W, H - 150);
  g.strokeStyle = "rgba(10,12,11,0.35)"; g.lineWidth = 1.2;
  for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(320 + i * 34, 150); g.lineTo(320 + i * 120, H); g.stroke(); }
  for (let k = 0; k < 8; k++) { const y = 150 + (H - 150) * ((k + 1) / 8) ** 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // a pool of ceiling light around you
  const gr = g.createRadialGradient(300, 330, 20, 300, 330, 230);
  gr.addColorStop(0, "rgba(255,255,255,0.16)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 100, W, H - 100);
  // contact shadows
  const shadow = (x: number, y: number, r: number) => { g.fillStyle = "rgba(0,0,0,0.45)"; g.beginPath(); g.ellipse(x, y, r, r * 0.28, 0, 0, 7); g.fill(); };
  // the one behind you: just off your left shoulder, facing the camera, mirrored
  if (o.fig) {
    shadow(CC.fig.x, CC.fig.y, 36);
    body(g, FIG_O, { mode: "stand", expr: "neutral", seed: 3, blink: 0, breathe: 2 }, CC.fig.x, CC.fig.y, CC.fig.h, true);
    // no face: a dark smudge where it would be
    const fx = CC.fig.x, fy = CC.fig.y - CC.fig.h * FACE_Y, r = CC.fig.h * 0.15;
    const sm = g.createRadialGradient(fx, fy + r * 0.3, r * 0.2, fx, fy + r * 0.3, r);
    sm.addColorStop(0, "rgba(6,8,7,1)"); sm.addColorStop(0.7, "rgba(8,10,9,0.96)"); sm.addColorStop(1, "rgba(12,14,13,0)");
    g.fillStyle = sm; g.beginPath(); g.ellipse(fx, fy + r * 0.3, r, r * 0.72, 0, 0, 7); g.fill();
  }
  // you, facing the camera (the camera's left is your right)
  shadow(CC.you.x, CC.you.y, 38);
  body(g, ME_O, { mode: "stand", expr: o.fig ? "fear" : "nervous", seed: 3, blink: 0, raise: o.raise > 0 ? o.raise : undefined }, CC.you.x, CC.you.y, CC.you.h, false);
  // desks in the foreground corners, their monitors glowing
  const desk = (x0: number, x1: number, flip: number) => {
    g.fillStyle = "#4b524d"; g.beginPath(); g.moveTo(x0, 300); g.lineTo(x1, 288); g.lineTo(x1 + flip * 30, H); g.lineTo(x0, H); g.fill();
    g.fillStyle = "#1c201d"; g.fillRect(Math.min(x0, x1) + 10, 236, 62, 40); g.fillStyle = "#dfeee4"; g.fillRect(Math.min(x0, x1) + 14, 240, 54, 32);
  };
  desk(0, 112, 1); desk(W, 528, -1);
};

export const drawCCTV = (g: CanvasRenderingContext2D, w: number, h: number, o: CctvOpts) => {
  g.save();
  g.scale(w / W, h / H);
  g.fillStyle = "#151916"; g.fillRect(0, 0, W, H);
  g.save();
  const z = o.zoom ?? 1;
  if (z > 1.001) { g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-(o.zx ?? W / 2), -(o.zy ?? H / 2)); }
  // the camera's slight sway on its mount
  g.translate(Math.sin(o.t * 0.7) * 1.5, Math.sin(o.t * 0.5) * 0.8);
  scene(g, o);
  g.restore();
  // phosphor monochrome
  // (a cheap colour camera: a little of the real colour survives, so the blue sweaters read)
  g.globalAlpha = 0.6; g.globalCompositeOperation = "color"; g.fillStyle = "#47ff95"; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  g.globalCompositeOperation = "multiply"; g.fillStyle = "#8fe0a8"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
  if (o.grain !== false) {
    const fr = Math.floor(o.t * 30);
    for (let i = 0; i < 900; i++) {
      const a = hash(i * 7.31 + fr * 13.7), b = hash(i * 3.17 + fr * 5.3), c = hash(i + fr * 1.9);
      g.fillStyle = c > 0.5 ? `rgba(210,255,225,${(0.05 + 0.1 * c).toFixed(3)})` : `rgba(0,0,0,${(0.08 + 0.14 * c).toFixed(3)})`;
      g.fillRect(a * W, b * H, 1.4, 1.4);
    }
    g.fillStyle = "rgba(0,0,0,0.2)"; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    // a rolling bright band
    const by = ((o.t * 60) % (H + 80)) - 40, band = g.createLinearGradient(0, by - 30, 0, by + 30);
    band.addColorStop(0, "rgba(180,255,210,0)"); band.addColorStop(0.5, "rgba(180,255,210,0.06)"); band.addColorStop(1, "rgba(180,255,210,0)");
    g.fillStyle = band; g.fillRect(0, by - 30, W, 60);
  }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // burn-in
  g.fillStyle = "#d6ffe2"; g.font = "800 17px Montserrat, sans-serif"; g.textBaseline = "top";
  g.textAlign = "left"; g.fillText("CAM 03 · FLOOR -3", 18, 14);
  g.textAlign = "right"; if (Math.floor(o.t * 1.5) % 2 === 0) { g.fillStyle = "#ff5a4a"; g.beginPath(); g.arc(W - 66, 23, 6, 0, 7); g.fill(); }
  g.fillStyle = "#d6ffe2"; g.fillText("REC", W - 18, 14);
  g.textBaseline = "bottom"; g.textAlign = "left"; g.fillText(`21 NOV  ${o.clock}`, 18, H - 12);
  g.textAlign = "right"; g.fillText("LIVE", W - 18, H - 12);
  g.restore();
};
/** time of day from the HUD's seconds-to-06:00 */
export const clockOf = (left: number) => {
  const s = ((6 * 3600 - left) % 86400 + 86400) % 86400;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
};
