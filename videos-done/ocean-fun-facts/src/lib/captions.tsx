// Viral-style word captions timed to words.json: 1-3 word chunks (break on punctuation, long pauses, or 3 words),
// heavy white Montserrat with a thick black outline, the spoken word in yellow and slightly bigger, emphasised
// words in a hot colour, each chunk pops in. Lower-middle of the frame (clear of faces in most framings).
import React from "react";
import { AbsoluteFill, useCurrentFrame, delayRender, continueRender } from "remotion";
import font900 from "@fontsource/montserrat/files/montserrat-latin-900-normal.woff2";

export type Word = { w: string; s: number; e: number; emph?: boolean; line?: number };
type Chunk = { words: Word[]; s: number; e: number };

/** load the caption face once per tab, inside a component (Remotion's delayRender pattern) */
let fontReady: Promise<void> | null = null;
export const loadFont = () => {
  if (!fontReady) {
    const ff = new FontFace("CapFont", `url(${font900})`, { weight: "900" });
    fontReady = ff.load().then((f) => { (document.fonts as unknown as { add: (f: FontFace) => void }).add(f); }).catch(() => undefined);
  }
  return fontReady;
};
const useCaptionFont = () => {
  const [handle] = React.useState(() => delayRender("caption font", { timeoutInMilliseconds: 120000 }));
  React.useEffect(() => { loadFont().then(() => continueRender(handle)); }, [handle]);
};

export const chunkWords = (words: Word[], maxWords = 3, maxChars = 16): Chunk[] => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) out.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; };
  words.forEach((w, i) => {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
    const pair = !!prev && !!prev.emph && !!w.emph; // keep emphasised pairs ("fish farts") together
    const tooLong = cur.length >= maxWords + (pair ? 1 : 0) || (!pair && chars > maxChars);
    if (cur.length && (tooLong || (prev && w.s - prev.e > 0.28) || (prev && w.line !== prev.line))) flush();
    cur.push(w);
    if (/[.!?,:;]$|\.\.\.$/.test(w.w) && !/^[A-Z]\.$/.test(w.w)) flush();
    if (i === words.length - 1) flush();
  });
  // each chunk stays until the next one starts (no flicker), but not longer than 0.6 s after its last word
  return out.map((c, i) => ({ ...c, e: Math.min(out[i + 1]?.s ?? c.e + 0.6, c.e + 0.6) }));
};

export const Captions: React.FC<{ words: Word[]; fps?: number; y?: number; hot?: string }> = ({ words, fps = 30, y = 0.655, hot = "#7CFF4F" }) => {
  useCaptionFont();
  const f = useCurrentFrame();
  const t = f / fps;
  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const c = chunks.find((k) => t >= k.s - 0.03 && t < k.e);
  if (!c) return null;
  const age = (t - (c.s - 0.03)) * fps;
  const sc = age < 5 ? 0.78 + 0.22 * (1 - (1 - age / 5) ** 3) + 0.06 * Math.sin((age / 5) * Math.PI) : 1;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div style={{ position: "absolute", top: `${y * 100}%`, width: "92%", display: "flex", justifyContent: "center", flexWrap: "wrap",
        transform: `translateY(-50%) scale(${sc})`, gap: "4px 42px" }}>
        {c.words.map((w, i) => {
          const active = t >= w.s - 0.02 && t < (c.words[i + 1]?.s ?? c.e);
          const col = w.emph ? hot : active ? "#FFE14D" : "#FFFFFF";
          return (
            <span key={i} style={{
              fontFamily: "CapFont", fontWeight: 900, fontSize: 92, lineHeight: 1.08, letterSpacing: "-0.5px", color: col,
              textTransform: "uppercase", WebkitTextStroke: "12px #000", paintOrder: "stroke fill",
              textShadow: "0 7px 0 rgba(0,0,0,0.85), 0 10px 22px rgba(0,0,0,0.35)",
              transform: active ? "scale(1.06) translateY(-3px)" : "none", display: "inline-block", transition: "none",
            }}>{w.w.replace(/\.\.\.$/, "...")}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
