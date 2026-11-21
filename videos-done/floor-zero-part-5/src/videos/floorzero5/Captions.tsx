// Burned-in captions so the short reads with the sound off: 1-5 word chunks, key words in amber (the floor display's
// colour), big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Reels/Shorts UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds until
// the next chunk, or ~0.4 s after its last word when a pause follows; the last question holds to the end.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS, TOTAL, shotAt, LAST_LINE } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: Record<number, [number, string][]> = {
  99: [[4, "ONLY ONE OF YOU"], [4, "GETS TO *CLOCK OUT*."]],
  0: [[3, "SO, *TURN AROUND*,"], [3, "OR *KEEP WALKING*?"]],
  1: [[4, "IF YOU *TURNED AROUND*,"], [3, "THERE'S *NOTHING* THERE."]],
  2: [[4, "BUT ON *EVERY SCREEN*,"], [5, "IT'S STILL *RIGHT BEHIND YOU*."]],
  3: [[3, "YOU TURN *AGAIN*."], [1, "*NOTHING*."], [4, "AND YOU FEEL IT"], [4, "*BREATHE* ON YOUR NECK."]],
  4: [[3, "ONE BY ONE,"], [4, "THE MONITORS *GO DARK*."]],
  5: [[4, "THIS IS *THE END*."]],
  6: [[2, "LET'S *REWIND*."]],
  7: [[4, "IF YOU *KEPT WALKING*,"], [6, "YOU WATCH IT *ON THE SCREENS*."], [3, "*ROW BY ROW*."]],
  8: [[4, "*ONE STEP* BEHIND YOU."], [4, "ALWAYS *EXACTLY ONE STEP*."]],
  9: [[6, "THEN THE SCREENS START *TO DIE*."], [3, "*ONE BY ONE*."]],
  10: [[3, "AND YOU *RUN*."]],
  11: [[3, "DOWN *THE STAIRS*,"], [5, "AS *FAST* AS YOU CAN."]],
  12: [[2, "*MINUS FIVE*."], [4, "THE DOOR IS *OPEN*."]],
  13: [[3, "*HUNDREDS* OF PHOTOS."], [4, "ONE FOR *EVERY FRIDAY*."], [5, "THE NEWEST FRAME IS *EMPTY*."], [7, "AND IT HAS *YOUR NAME* ON IT."]],
  14: [[2, "*MINUS SEVEN*."], [3, "A *TIME CLOCK*,"], [5, "AND A *SIGN* ABOVE IT."]],
  15: [[4, "*ONLY ONE* OF YOU"], [3, "CAN *CLOCK OUT*."]],
  16: [[5, "THEN YOUR *PHONE LIGHTS UP*."], [2, "*NO SERVICE*."], [5, "BUT A MESSAGE *GETS THROUGH*."]],
  17: [[2, "FROM *HOME*."], [1, "*OK*."], [3, "SEE YOU *SOON*."]],
  18: [[3, "IT'S A *REPLY*."], [6, "TO A MESSAGE FROM *YOUR NUMBER*."], [2, "*LEAVING NOW*."]],
  19: [[4, "YOU *NEVER SENT* THAT."]],
  20: [[2, "*FIVE FIFTY-SEVEN*."], [5, "AND YOUR PHONE'S *LIGHT DIES*."]],
  21: [[3, "IN THE *DARK*,"], [4, "SOMETHING *TAKES YOUR WRIST*."]],
  22: [[5, "WHEN THE LIGHT COMES BACK,"], [5, "THERE ARE *TWO OF YOU*."]],
  23: [[4, "AND *BOTH* OF YOU"], [3, "*REMEMBER* BEING YOU."]],
  24: [[5, "*LOOK CLOSELY* BEFORE YOU ANSWER."]],
  25: [[1, "*ONE*."]],
  26: [[2, "OR *TWO*."]],
  27: [[5, "SO… *WHICH ONE IS YOU*?"]],
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
  const low = sid === 14; // keep the sign clear
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
