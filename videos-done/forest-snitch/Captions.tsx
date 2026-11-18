// Burned-in subtitle captions, timed to the narration words (words.json from the voice track): short groups of 1-3
// words, bold uppercase with a thick dark outline, the spoken word highlighted, a small pop on every new group.
import React from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import WORDS from "./words.json";

type W = { w: string; line: number; s: number; e: number };
type Group = { words: W[]; a: number; b: number };
const FONT = "MontserratBlack";

const build = (fps: number): Group[] => {
  const ws = WORDS as W[], out: Group[] = [];
  let cur: W[] = [];
  const flush = () => { if (cur.length) out.push({ words: cur, a: 0, b: 0 }); cur = []; };
  ws.forEach((w, i) => {
    const next = ws[i + 1];
    cur.push(w);
    const chars = cur.map((x) => x.w).join(" ").length;
    const brk = /[.,!?]$/.test(w.w) || !next || next.line !== w.line || cur.length >= 3 || chars >= 13
      || (next && next.s - w.e > 0.25);
    if (brk) flush();
  });
  // show each group from 2 frames before its first word until the next group starts (max 0.6 s after its last word)
  out.forEach((g, i) => {
    g.a = Math.round(g.words[0].s * fps) - 2;
    const last = Math.round(g.words[g.words.length - 1].e * fps);
    const nxt = out[i + 1] ? Math.round(out[i + 1].words[0].s * fps) - 2 : Infinity;
    g.b = Math.min(nxt, last + 18);
  });
  return out;
};

let fontP: Promise<void> | null = null;
const loadFont = () => {
  if (!fontP) {
    const ff = new FontFace(FONT, `url(${staticFile("montserrat-900.woff2")}) format("woff2")`, { weight: "900" });
    fontP = ff.load().then((f) => { (document.fonts as unknown as { add: (x: FontFace) => void }).add(f); });
  }
  return fontP;
};

export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const [handle] = React.useState(() => delayRender("caption font"));
  React.useEffect(() => { loadFont().then(() => continueRender(handle)).catch(() => continueRender(handle)); }, [handle]);
  const groups = React.useMemo(() => build(fps), [fps]);
  const g = groups.find((x) => f >= x.a && f < x.b);
  if (!g) return null;
  const k = width / 1080; // everything is laid out at 1080 wide
  const age = f - g.a, s = age < 5 ? 0.86 + 0.14 * Math.sin((age / 5) * Math.PI * 0.5) + (age === 3 ? 0.03 : 0) : 1;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div style={{
        position: "absolute", top: 1290 * k, width: 960 * k, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${2 * k}px ${34 * k}px`,
        transform: `scale(${s})`, fontFamily: `${FONT}, Arial Black, sans-serif`, fontWeight: 900, fontSize: 86 * k, lineHeight: 1.08,
        textTransform: "uppercase", letterSpacing: 1 * k, textAlign: "center",
      }}>
        {g.words.map((w, i) => {
          const on = f >= Math.round(w.s * fps) - 1 && (f < Math.round(w.e * fps) + 2 || i === g.words.length - 1);
          const spoken = f >= Math.round(w.s * fps) - 1;
          return (
            <span key={i} style={{
              color: on ? "#ffe14a" : "#ffffff", opacity: spoken ? 1 : 0.92,
              WebkitTextStroke: `${13 * k}px #14101a`, paintOrder: "stroke fill",
              textShadow: `0 ${7 * k}px 0 rgba(20,16,26,0.85), 0 ${10 * k}px ${18 * k}px rgba(0,0,0,0.35)`,
              display: "inline-block", transform: on ? `scale(1.06) rotate(${i % 2 ? 1.5 : -1.5}deg)` : "none",
            }}>{w.w.replace(/[.,]$/, "")}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
