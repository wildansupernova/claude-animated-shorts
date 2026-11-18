// Screen-space graphics that carry the story with the sound off (v3): the hook title, Dave's $100 bill slapping the
// lens, the stakes pill ("$2,200 AT RISK" -> "DAVE WINS $2,200"), the roll-call counter, the "253 = 253" twist card and
// the call to action. All of it sits in the top third, clear of the captions (top 1180) and the platform UI.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TITLE, SLAP, STAKES, COUNTER, WIN_AT, MATCH_AT, checkedAt, CARD253, CTA, TOTAL, CONFETTI_2D, FPS } from "./story";

const INK = "#120c16", YEL = "#ffd84a";
/** 0 -> overshoot -> 1 over n frames (easeOutBack), 0 before f0 */
const pop = (f: number, f0: number, n = 6) => {
  if (f < f0) return 0;
  const u = Math.min(1, (f - f0) / n), s = 1.9;
  return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2;
};
const out = (f: number, f1: number, n = 5) => Math.max(0, Math.min(1, (f1 - f) / n));
const text = (size: number, color = "#ffffff", stroke = 14, weight = 900): React.CSSProperties => ({
  fontFamily: "Montserrat, sans-serif", fontWeight: weight, fontSize: size, lineHeight: 1.04, color, letterSpacing: 1,
  WebkitTextStroke: `${stroke}px ${INK}`, paintOrder: "stroke fill", textAlign: "center",
});
const pill = (bg: string): React.CSSProperties => ({
  background: bg, border: `7px solid ${INK}`, borderRadius: 26, padding: "10px 30px 12px", boxShadow: `0 9px 0 rgba(18,12,22,0.5)`,
});
const at = (top: number, k: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: "absolute", top, left: 0, width: 1080, display: "flex", flexDirection: "column", alignItems: "center",
  transform: `scale(${k})`, transformOrigin: `50% ${top}px`, ...extra,
});

/** the hook title: frame 0 already shows it (the thumbnail / first impression) */
const Title: React.FC<{ f: number }> = ({ f }) => {
  if (f >= TITLE[1]) return null;
  const k = out(f, TITLE[1], 6), wob = Math.sin(f * 0.18) * 1.2;
  return (
    <div style={{ ...at(150, 1), opacity: k, transform: `rotate(${wob}deg)` }}>
      <div style={text(78)}>WOULD YOU TAKE</div>
      <div style={text(96, YEL, 16)}>THIS BET?</div>
    </div>
  );
};

/** Dave's $100 bill slams onto the lens, holds, then drops away */
const Bill: React.FC<{ f: number }> = ({ f }) => {
  const u = f - SLAP;
  if (u < 0 || u > 24) return null;
  const k = u < 3 ? [1.55, 1.12, 0.97][u] : 1 + 0.02 * Math.sin(u * 0.9) * Math.exp(-u / 8);
  const drop = u > 12 ? (u - 12) ** 2 * 11 : 0, rot = -7 + (u > 12 ? (u - 12) * 2.6 : 0);
  return (
    <div style={{ position: "absolute", left: 140, top: 600, width: 800, height: 360, transform: `translateY(${drop}px) rotate(${rot}deg) scale(${k})`, filter: "drop-shadow(0 18px 0 rgba(18,12,22,0.45))" }}>
      <svg width={800} height={360} viewBox="0 0 800 360">
        <rect x={6} y={6} width={788} height={348} rx={26} fill="#8fd18a" stroke={INK} strokeWidth={10} />
        <rect x={34} y={34} width={732} height={292} rx={14} fill="none" stroke="#2f7a3a" strokeWidth={5} />
        <ellipse cx={400} cy={180} rx={150} ry={118} fill="#b9e6b2" stroke="#2f7a3a" strokeWidth={6} />
        <text x={400} y={228} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={138} fill="#1f5a2a">$100</text>
        {[[92, 96], [708, 96], [92, 300], [708, 300]].map(([x, y], i) => (
          <text key={i} x={x} y={y} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={48} fill="#2f7a3a">100</text>
        ))}
      </svg>
    </div>
  );
};

/** the stakes pill and the roll-call counter */
const Stakes: React.FC<{ f: number }> = ({ f }) => {
  const els: React.ReactNode[] = [];
  if (f >= STAKES[0] && f < STAKES[1]) {
    const won = f >= WIN_AT, k = pop(f, won ? WIN_AT : STAKES[0], 7) * out(f, STAKES[1]);
    els.push(
      <div key="s" style={at(160, k)}>
        <div style={pill(won ? "#2f9a52" : "#e2453c")}>
          <div style={text(won ? 62 : 70, "#ffffff", 0)}>{won ? "DAVE WINS $2,200" : "$2,200 AT RISK"}</div>
        </div>
      </div>,
    );
  }
  if (f >= COUNTER[0] && f < COUNTER[1]) {
    const n = checkedAt(f), m = f >= MATCH_AT ? 1 : 0;
    // the number that just changed pops
    const lastN = (() => { let g = f; while (g > COUNTER[0] && checkedAt(g - 1) === n) g--; return g; })();
    const kn = f - lastN < 5 ? [1.3, 1.18, 1.08, 1.03, 1][f - lastN] : 1, km = m ? pop(f, MATCH_AT, 7) : 1;
    els.push(
      <div key="c" style={at(300, pop(f, COUNTER[0], 6) * out(f, COUNTER[1]))}>
        <div style={{ ...pill("#ffffff"), display: "flex", gap: 26, alignItems: "baseline", padding: "8px 28px 10px" }}>
          <span style={text(44, INK, 0, 800)}>CHECKED <span style={{ display: "inline-block", transform: `scale(${kn})`, minWidth: 128 }}>{n}/23</span></span>
          <span style={text(44, m ? "#e2453c" : INK, 0, 800)}>MATCHES <span style={{ display: "inline-block", transform: `scale(${m ? 0.6 + 0.4 * km : 1})` }}>{m}</span></span>
        </div>
      </div>,
    );
  }
  return <>{els}</>;
};

/** the twist: "253 PEOPLE" arrives on the number, "253 PAIRS =" joins it on "Same number" */
const Card253: React.FC<{ f: number }> = ({ f }) => {
  const [a, b, end] = CARD253;
  if (f < a || f >= end) return null;
  const kA = pop(f, a, 7) * out(f, end), kB = pop(f, b, 7), slide = Math.min(1, Math.max(0, (f - b) / 6)), sl = slide * slide * (3 - 2 * slide);
  const col = (n: string, l1: string, l2: string, k: number, cx: number) => (
    <div style={{ position: "absolute", left: cx - 230, top: 0, width: 460, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${k})` }}>
      <div style={text(176, YEL, 18)}>{n}</div>
      <div style={{ ...text(40, "#ffffff", 10, 900), marginTop: 6 }}>{l1}<br />{l2}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 250, left: 0, width: 1080, height: 360 }}>
      <div style={{ position: "absolute", left: 40 + (1 - sl) * 230, right: 40 + (1 - sl) * 230, top: -14, height: 350, borderRadius: 34, background: "rgba(18,12,22,0.58)", transform: `scale(${kA})` }} />
      {f >= b && col("253", "PAIRS IN A", "ROOM OF 23", kB, 270)}
      {f >= b && <div style={{ position: "absolute", left: 490, top: 24, width: 100, transform: `scale(${kB})`, ...text(150, "#ffffff", 16) }}>=</div>}
      {col("253", "PEOPLE TO", "MATCH YOU", kA, 540 + 270 * sl)}
    </div>
  );
};

/** the call to action, held to the last frame */
const Cta: React.FC<{ f: number }> = ({ f }) => {
  if (f < CTA || f >= TOTAL) return null;
  const k = pop(f, CTA, 7), bob = Math.sin((f - CTA) * 0.2) * 4, k2 = pop(f, CTA + 10, 7);
  return (
    <div style={{ ...at(190, k), transform: `translateY(${bob}px) scale(${k})` }}>
      <div style={{ ...pill("#ffffff"), display: "flex", alignItems: "center", gap: 20 }}>
        <svg width={70} height={64} viewBox="0 0 70 64">
          <path d="M8 6 H62 Q66 6 66 10 V40 Q66 44 62 44 H30 L16 58 L18 44 H8 Q4 44 4 40 V10 Q4 6 8 6 Z" fill={YEL} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        </svg>
        <div style={text(50, INK, 0)}>COMMENT YOUR BIRTHDAY</div>
      </div>
      <div style={{ ...pill(YEL), marginTop: 18, transform: `scale(${k2})` }}>
        <div style={text(52, INK, 0)}>FIND YOUR TWIN</div>
      </div>
    </div>
  );
};

/** confetti cannons from both bottom corners (deterministic per frame): up and inward, then drag + gravity + flutter */
const CCOL = ["#e2453c", "#ffd84a", "#3f6fb5", "#2f8a4f", "#d9577a", "#ffffff", "#8c5ac9", "#2fa6a0"];
const hash = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const Confetti: React.FC<{ f: number }> = ({ f }) => {
  const bits: React.ReactNode[] = [];
  CONFETTI_2D.forEach((f0, bi) => {
    const t = (f - f0) / FPS;
    if (t < 0 || t > 2.6) return;
    // linear drag k, gravity g (screen y grows downward): v = g/k + (v0 - g/k) e^-kt
    const k = 1.7, g = 2000, e = (1 - Math.exp(-k * t)) / k;
    for (let i = 0; i < 230; i++) {
      const side = i % 2 ? 1 : -1, h = (s: number) => hash(i + 1000 * bi, s);
      const vx = -side * (350 + 900 * h(1)), vy = -(2600 + 1600 * h(2));
      const x = (side > 0 ? 1080 : 0) + vx * e + 30 * Math.sin(t * (5 + 4 * h(3)) + i);
      const y = 1700 + (g / k) * t + (vy - g / k) * e;
      if (y > 1980) continue;
      const spin = t * (6 + 10 * h(4)) + i, w = 20 + 16 * h(5), hh = 11 + 8 * h(6);
      bits.push(<div key={`${bi}-${i}`} style={{ position: "absolute", left: x, top: y, width: w, height: hh, background: CCOL[(i + bi) % 8],
        border: "2px solid rgba(18,12,22,0.55)", borderRadius: 2, transform: `rotate(${spin * 57}deg) scaleY(${Math.cos(spin * 1.7).toFixed(3)})` }} />);
    }
  });
  return <>{bits}</>;
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Title f={f} />
      <Stakes f={f} />
      <Card253 f={f} />
      <Confetti f={f} />
      <Cta f={f} />
      <Bill f={f} />
    </AbsoluteFill>
  );
};
