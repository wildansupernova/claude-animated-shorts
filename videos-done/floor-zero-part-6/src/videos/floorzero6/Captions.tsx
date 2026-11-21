// Burned-in captions so the short reads with the sound off: 1-5 word chunks, key words in amber (the floor display's
// colour), big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Reels/Shorts UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds until
// the next chunk, or ~0.4 s after its last word when a pause follows; the last question holds to the end.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS, TOTAL, shotAt, LAST_LINE } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: Record<number, [number, string][]> = {
  99: [[4, "YOU MADE YOUR *CHOICE*."], [6, "LET'S SEE IF IT *WAS YOU*."]],
  0: [[2, "SO, *ONE*,"], [2, "OR *TWO*?"]],
  1: [[4, "IF YOU PICKED *TWO*,"], [6, "YOU KEPT YOUR *EYES ON ONE*."]],
  2: [[4, "*NOBODY* WAS WATCHING *TWO*."]],
  3: [[2, "*FIVE FIFTY-NINE*."], [4, "IT *SWIPES* ITS BADGE,"], [5, "AND THE CLOCK *TAKES IT*."]],
  4: [[2, "*GROUND FLOOR*."], [1, "*MORNING*."]],
  5: [[5, "IT TYPES A MESSAGE *HOME*."], [3, "*ON MY WAY*."]],
  6: [[4, "DOWN ON *MINUS SEVEN*,"], [6, "ONE TURNS TO *FACE THE WALL*."]],
  7: [[3, "YOU *WERE ONE*."], [3, "YOU SPENT THE"], [4, "LAST MINUTE *WATCHING YOURSELF*."]],
  8: [[4, "THIS IS *THE END*."]],
  9: [[2, "LET'S *REWIND*."]],
  10: [[4, "IF YOU PICKED *ONE*,"], [5, "THEN TWO IS *THE COPY*."], [7, "SO YOU DON'T *LOOK AWAY* FROM IT."]],
  11: [[4, "LOOK AT ITS *BADGE*."]],
  12: [[3, "AND ITS *HAIR*."]],
  13: [[5, "IT LEARNED YOU FROM *REFLECTIONS*."], [2, "THE *STEEL*."], [2, "THE *WATER*."], [2, "THE *SCREENS*."]],
  14: [[4, "IT GOT *EVERYTHING RIGHT*."]],
  15: [[5, "EXCEPT IT LEARNED YOU *BACKWARDS*."]],
  16: [[2, "WITHOUT *BLINKING*,"], [6, "YOU BACK UP TO *THE CLOCK*."]],
  17: [[5, "*FIVE FIFTY-NINE*, AND *FIFTY-NINE SECONDS*."], [4, "YOU *SWIPE YOUR BADGE*."]],
  18: [[2, "*SIX O'CLOCK*."], [4, "IN FRONT OF YOU,"], [6, "IT TURNS TO *FACE THE WALL*."]],
  19: [[5, "AND SLOWLY, IT *GOES GREY*."]],
  20: [[3, "ABOVE THE CLOCK,"], [3, "THE *SAME CARD*."], [1, "*UNSCRATCHED*."]],
  21: [[2, "*RULE TWO*."], [6, "IF SOMEONE IS *FACING THE WALL*,"], [5, "*NEVER LOOK AWAY* FROM THEM."]],
  22: [[2, "*RULE THREE*."], [6, "THE NIGHT SHIFT *ALWAYS KEEPS ONE*."]],
  23: [[2, "*GROUND FLOOR*."], [1, "*MORNING*."], [2, "*ONE BAR*."], [4, "A MESSAGE FROM *HOME*."], [3, "*WHERE ARE YOU*?"], [2, "YOU TYPE:"], [3, "*ON MY WAY*."]],
  24: [[2, "*NEXT FRIDAY*,"], [3, "JUST BEFORE *MIDNIGHT*,"], [2, "*SOMEONE ELSE*"], [4, "IS THE *LAST ONE*"], [3, "LEAVING THE OFFICE."]],
  25: [[2, "BEHIND THEM,"], [4, "THE *LIGHTS SWITCH OFF*."], [5, "*ONE ROW* AT A TIME."]],
  26: [[2, "THE *ELEVATOR*"], [6, "GOES *RIGHT PAST* THE GROUND FLOOR."]],
  27: [[4, "THEN, WITH A *JOLT*,"], [4, "THE LIGHTS *GO OUT*."]],
  28: [[6, "AND WHEN THEY COME BACK ON,"], [6, "SOMEONE IS STANDING *IN THE CORNER*."], [3, "*FACING THE WALL*."]],
  29: [[4, "*IMAGINE* YOU'RE THE LAST"], [4, "ONE *LEAVING THE OFFICE*."]],
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
  const big = false;
  const sid = shotAt(f).id, inR = (r: [number, number]) => f >= r[0] && f < r[1];
  const low = false;
  const high = false;
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
