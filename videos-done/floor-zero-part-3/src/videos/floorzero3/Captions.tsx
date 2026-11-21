// Burned-in captions so the short reads with the sound off: 1-5 word chunks, key words in amber (the floor display's
// colour), big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Reels/Shorts UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds until
// the next chunk, or ~0.4 s after its last word when a pause follows; the last question holds to the end.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS, TOTAL, shotAt, RULE2, LAST_LINE, STEEL, HALE_INS, SH } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: Record<number, [number, string][]> = {
  99: [[5, "FLOOR *MINUS ONE* IS *FLOODED*."], [4, "DON'T *STEP* IN IT."]],
  0: [[2, "SO, *STAIRS*,"], [2, "OR *ELEVATOR*?"]],
  1: [[5, "IF YOU TOOK *THE STAIRS*,"], [5, "THE *FOOTSTEPS* KEEP COMING UP."]],
  2: [[3, "THEN THEY *STOP*."], [3, "RIGHT *BELOW* YOU."]],
  3: [[2, "YOUR PHONE."], [2, "*ONE PERCENT*."], [5, "YOU POINT THE LIGHT DOWN."]],
  4: [[2, "*NOBODY'S* THERE."]],
  5: [[4, "THE RED LAMP *FLICKERS*."]],
  6: [[3, "AND A *HAND*"], [4, "SETTLES ON YOUR *SHOULDER*."]],
  7: [[4, "THIS IS *THE END*."]],
  8: [[2, "LET'S *REWIND*."]],
  9: [[5, "IF YOU TOOK *THE ELEVATOR*,"], [5, "YOU STEP INSIDE *WITH IT*."]],
  10: [[3, "THE DOORS CLOSE."], [7, "*MINUS ONE* IS A LONG WAY DOWN."]],
  11: [[3, "THE LIGHT *FLICKERS*."]],
  12: [[4, "WHEN IT COMES BACK,"], [4, "IT'S A *STEP CLOSER*."]],
  13: [[1, "*AGAIN*."]],
  14: [[2, "ANOTHER *STEP*."]],
  15: [[1, "*AGAIN*."]],
  16: [[3, "AND NOW IT'S"], [6, "STANDING *RIGHT IN FRONT* OF YOU."]],
  17: [[4, "IT'S *YOUR HEIGHT* NOW."], [4, "IT HAS *EARS* NOW."], [6, "AND IT'S WEARING A *RED LANYARD*."], [2, "*LIKE YOURS*."]],
  18: [[1, "*DING*."], [2, "*MINUS ONE*."], [3, "THE DOORS OPEN,"], [4, "AND YOU *BACK OUT*."]],
  19: [[6, "MINUS ONE IS *YOUR OFFICE* AGAIN."]],
  20: [[3, "ONLY IT'S *FLOODED*."], [2, "*BLACK WATER*."], [2, "PERFECTLY STILL."]],
  21: [[6, "A SIGN ON THE WALL SAYS:"], [2, "*MINUS ONE*."], [5, "*DON'T STEP* IN THE WATER."]],
  22: [[3, "THE STAIRS DOWN"], [5, "ARE ON THE *FAR SIDE*."]],
  23: [[5, "THEN, AT THE FAR END,"], [5, "THE LIGHTS START *SWITCHING OFF*."]],
  24: [[5, "*ONE ROW* AT A TIME."]],
  25: [[3, "COMING *TOWARD YOU*."]],
  26: [[5, "AND YOU'RE THE *ONLY ONE*"], [4, "STANDING IN THE *LIGHT*."]],
  27: [[4, "YOU HAVE *TWO CHOICES*."]],
  28: [[5, "*WADE* STRAIGHT THROUGH THE WATER."], [2, "IT'S *FAST*."], [5, "BUT IT *BREAKS THE RULE*."]],
  29: [[5, "OR *CLIMB* ACROSS THE DESKS,"], [3, "ONE BY ONE."], [2, "IT'S *SLOW*."], [5, "AND *THE DARK* IS COMING."]],
  30: [[6, "SO, DO YOU *WADE* THROUGH IT,"], [5, "OR *CLIMB* ACROSS THE DESKS?"]],
};

type Chunk = { a: number; end: number; text: string; last?: boolean; who?: string };
const build = (): Chunk[] => {
  const out: Chunk[] = [];
  Object.entries(SPEC).forEach(([k, line]) => {
    const li = Number(k);
    const ws = WORD_LIST.filter((w) => w.line === li);
    const need = line.reduce((s, [n]) => s + n, 0);
    if (need !== ws.length) throw new Error(`captions: line ${li} has ${ws.length} words, spec covers ${need}`);
    let i = 0;
    line.forEach(([n, text]) => {
      out.push({ a: Math.round(ws[i].s * FPS) - 1, end: Math.round(ws[i + n - 1].e * FPS), text, last: li === LAST_LINE, who: (ws[0] as { who?: string }).who });
      i += n;
    });
  });
  return out.sort((x, y) => x.a - y.a);
};
export const CHUNKS = build();

const HL = "#ffc24a";
const Styled: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*[^*]+\*)/g).filter(Boolean).map((p, i) =>
      p.startsWith("*") ? <span key={i} style={{ color: HL }}>{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}
  </>
);

export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  let idx = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (f >= CHUNKS[i].a) idx = i;
  if (idx < 0) return null;
  const c = CHUNKS[idx], next = CHUNKS[idx + 1];
  const until = c.last ? TOTAL : next ? Math.min(next.a, c.end + 12) : c.end + 30;
  if (f >= until) return null;
  const u = f - c.a, k = u >= 5 ? 1 : [0.82, 1.06, 1.1, 1.04, 1.01][u];
  const big = c.text.replace(/\*/g, "").length <= 3; // the countdown digits
  const sid = shotAt(f).id, inR = (r: [number, number]) => f >= r[0] && f < r[1];
  const low = sid === 15 || inR(RULE2); // keep the sign clear
  const high = !low && f >= HALE_INS[1] && f < SH[18].a; // keep the water (the extra reflection) clear
  if (inR(STEEL)) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: big ? 1130 : low ? 1320 : high ? 520 : 1180, width: 900, left: 90, textAlign: "center",
        fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: big ? 150 : 88, lineHeight: 1.08, letterSpacing: 1,
        color: "#ffffff", WebkitTextStroke: "16px #0d0a10", paintOrder: "stroke fill",
        textShadow: "0 7px 0 rgba(10,8,14,0.6), 0 0 30px rgba(0,0,0,0.45)", transform: `scale(${k})`, transformOrigin: "50% 50%",
      }}>
        <Styled text={c.text} />
      </div>
      {c.who === "fig" && (
        <div style={{ position: "absolute", top: (low ? 1320 : high ? 520 : 1180) - 96, left: 0, width: 1080, display: "flex", justifyContent: "center", transform: `scale(${k})` }}>
          <div style={{ background: "#b3261e", border: "6px solid #0d0a10", borderRadius: 20, padding: "2px 22px 4px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 46, color: "#ffffff", letterSpacing: 4 }}>???</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
