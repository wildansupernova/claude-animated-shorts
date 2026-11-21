// Burned-in captions so the short reads with the sound off: 1-5 word chunks, key words in amber (the floor display's
// colour), big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Reels/Shorts UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds until
// the next chunk, or ~0.4 s after its last word when a pause follows; the last question holds to the end.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS, TOTAL, shotAt, LAST_LINE, CCTV_PUSH } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: Record<number, [number, string][]> = {
  99: [[5, "THE RULE ON THIS FLOOR:"], [3, "*NEVER TURN AROUND*."]],
  0: [[2, "SO, *WADE*,"], [2, "OR *CLIMB*?"]],
  1: [[3, "IF YOU *WADED*,"], [4, "THE WATER IS *WARM*."]],
  2: [[4, "YOU TAKE *ANOTHER STEP*."], [4, "AND YOUR *REFLECTION DOESN'T*."]],
  3: [[5, "IT *STAYS* WHERE IT IS."], [4, "*LOOKING UP* AT YOU."]],
  4: [[4, "THEN IT *REACHES UP*,"], [2, "AND *PULLS*."]],
  5: [[4, "THIS IS *THE END*."]],
  6: [[2, "LET'S *REWIND*."]],
  7: [[3, "IF YOU *CLIMBED*,"], [5, "YOU GO *DESK TO DESK*,"], [5, "WHILE *THE DARK* COMES CLOSER."]],
  8: [[5, "THEN YOUR *BADGE* SLIPS OFF."], [3, "*INTO THE WATER*."]],
  9: [[5, "AND YOU NEED *THAT BADGE*"], [3, "TO *CLOCK OUT*."]],
  10: [[4, "THE RULE SAYS *STEP*."], [4, "IT DOESN'T SAY *REACH*."]],
  11: [[4, "SO YOU *REACH IN*."]],
  12: [[3, "AND YOUR *REFLECTION*"], [3, "*GRABS* YOUR WRIST."]],
  13: [[3, "YOU *TEAR FREE*,"], [3, "WITH THE BADGE."]],
  14: [[5, "IT LEAVES A *GREY MARK*"], [3, "ON YOUR *WRIST*."]],
  15: [[5, "THE *LAST ROW* OF LIGHTS"], [2, "GOES *OUT*"], [6, "JUST AS YOU REACH *THE STAIRS*."]],
  16: [[5, "*MINUS TWO* IS *BRICKED UP*."], [4, "YOU KEEP GOING *DOWN*."]],
  17: [[2, "*MINUS THREE*."], [3, "YOUR OFFICE *AGAIN*."]],
  18: [[4, "*EVERY MONITOR* IS ON."], [3, "AND EVERY ONE"], [4, "SHOWS *THE SAME THING*."]],
  19: [[3, "A *SECURITY CAMERA*."], [4, "POINTED *RIGHT AT YOU*."]],
  20: [[1, "*LIVE*."]],
  21: [[6, "A SIGN ON THE WALL SAYS:"], [2, "*MINUS THREE*."], [3, "*NEVER TURN AROUND*."]],
  22: [[4, "THEN, ON *EVERY SCREEN*,"], [5, "IT'S STANDING *RIGHT BEHIND YOU*."]],
  23: [[5, "NOT FACING THE WALL *ANYMORE*."], [2, "*FACING YOU*."]],
  24: [[6, "AND IT'S WEARING A *BLUE SWEATER*."], [2, "*LIKE YOURS*."]],
  25: [[4, "YOU HAVE *TWO CHOICES*."]],
  26: [[5, "*TURN AROUND*, AND FACE IT."], [6, "EVEN THOUGH THE RULE SAYS *NEVER*."]],
  27: [[3, "OR *KEEP WALKING*,"], [5, "WITH IT *RIGHT BEHIND YOU*,"], [6, "ALL THE WAY TO *THE DOOR*."]],
  28: [[5, "SO, DO YOU *TURN AROUND*…"], [5, "OR DO YOU *KEEP WALKING*?"]],
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
  const low = sid === 15 || sid === 17 || inR(CCTV_PUSH); // keep the sign and the security feed clear
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
