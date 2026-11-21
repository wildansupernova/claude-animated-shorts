// Burned-in captions so the short reads with the sound off: 1-5 word chunks, key words in amber (the floor display's
// colour), big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Reels/Shorts UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds until
// the next chunk, or ~0.4 s after its last word when a pause follows; the last question holds to the end.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS, TOTAL, shotAt, RULE2, CARD9 } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: [number, string][][] = [
  [[2, "SO, DID"], [3, "YOU *STEP OUT*,"], [2, "OR DID"], [3, "YOU *STAY IN*?"]],
  [[3, "IF YOU *STAYED IN*,"], [4, "THE DOORS CLOSE."]],
  [[3, "THE CARD SAID,"], [3, "*DON'T STEP OUT*."], [3, "AND YOU *LISTENED*."]],
  [[4, "THE PANEL GOES *DARK*."], [5, "THE LIGHT ABOVE YOU HUMS."]],
  [[2, "AND THEN,"], [3, "WITHOUT TURNING AROUND,"], [2, "THE ONE"], [3, "*FACING THE WALL*"], [1, "*SPEAKS*."]],
  [[2, "DON'T WORRY."]],
  [[4, "I'LL FINISH *YOUR SHIFT*."]],
  [[4, "THE LIGHTS GO *OUT*."]],
  [[5, "WHEN THEY COME BACK ON,"], [2, "THEY'RE *GONE*."]],
  [[2, "AND NOW,"], [3, "*YOU'RE* THE ONE"], [3, "*FACING THE WALL*."]],
  [[4, "THIS IS *THE END*."], [3, "BECAUSE THE *RULES*"], [3, "WERE NEVER THERE"], [3, "TO *PROTECT* YOU."], [3, "THEY WERE THERE"], [3, "TO *KEEP* YOU."]],
  [[2, "LET'S *REWIND*."]],
  [[4, "IF YOU *STEPPED OUT*,"], [3, "THE DOORS CLOSE"], [2, "BEHIND YOU."]],
  [[4, "AND THE ELEVATOR *DROPS*."]],
  [[3, "*FLOOR AFTER FLOOR*,"], [4, "ALL THE WAY DOWN,"], [5, "UNTIL IT HITS THE *BOTTOM*."]],
  [[5, "YOU WERE RIGHT TO *LEAVE*."], [5, "YOU LET OUT A BREATH."]],
  [[2, "BUT THEN,"], [2, "*EVERY COMPUTER*"], [3, "IN THE OFFICE"], [2, "*TURNS ON*."]],
  [[3, "*ALL AT ONCE*."], [3, "AND EVERY SCREEN"], [4, "SAYS THE SAME THING."]],
  [[5, "WELCOME TO THE *NIGHT SHIFT*."]],
  [[2, "*7 FLOORS*."], [4, "*1 RULE* ON EACH."]],
  [[6, "THE ONLY WAY UP IS *DOWN*."]],
  [[4, "REACH THE *GROUND FLOOR*"], [5, "BY *6* IN THE MORNING."], [4, "OR STAY HERE *FOREVER*."]],
  [[3, "THEN, BEHIND YOU,"], [3, "A SOFT *DING*."]],
  [[4, "THE ELEVATOR IS *BACK*."]],
  [[3, "THE DOORS OPEN."], [4, "THE LIGHT IS ON."], [3, "AND THE ONE"], [3, "*FACING THE WALL*"], [3, "IS STILL *INSIDE*."]],
  [[2, "ONLY NOW,"], [3, "*ONE STEP CLOSER*"], [3, "TO THE DOORS."]],
  [[4, "RIGHT NEXT TO IT,"], [3, "THE *STAIRWELL* DOOR"], [2, "*CREAKS OPEN*."]],
  [[4, "DOWN IN THE DARK,"], [3, "YOU HEAR *FOOTSTEPS*."], [2, "*COMING UP*."]],
  [[5, "YOU HAVE TO GO *DOWN*."], [2, "*TWO WAYS*."]],
  [[3, "TAKE THE *STAIRS*,"], [3, "TOWARD THE FOOTSTEPS."]],
  [[4, "OR TAKE THE *ELEVATOR*,"], [3, "WITH THE ONE"], [3, "*FACING THE WALL*."]],
  [[7, "SO, WHICH WAY DOWN DO *YOU* GO?"]],
];

type Chunk = { a: number; end: number; text: string; last?: boolean; who?: string };
const build = (): Chunk[] => {
  const out: Chunk[] = [];
  SPEC.forEach((line, li) => {
    const ws = WORD_LIST.filter((w) => w.line === li);
    const need = line.reduce((s, [n]) => s + n, 0);
    if (need !== ws.length) throw new Error(`captions: line ${li} has ${ws.length} words, spec covers ${need}`);
    let i = 0;
    line.forEach(([n, text]) => {
      out.push({ a: Math.round(ws[i].s * FPS) - 1, end: Math.round(ws[i + n - 1].e * FPS), text, last: li === SPEC.length - 1, who: (ws[0] as { who?: string }).who });
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
  const low = sid === 15 || inR(RULE2) || inR(CARD9); // keep the screen message and the rules card clear
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: big ? 1130 : low ? 1560 : 1180, width: 900, left: 90, textAlign: "center",
        fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: big ? 150 : 88, lineHeight: 1.08, letterSpacing: 1,
        color: "#ffffff", WebkitTextStroke: "16px #0d0a10", paintOrder: "stroke fill",
        textShadow: "0 7px 0 rgba(10,8,14,0.6), 0 0 30px rgba(0,0,0,0.45)", transform: `scale(${k})`, transformOrigin: "50% 50%",
      }}>
        <Styled text={c.text} />
      </div>
      {c.who === "fig" && (
        <div style={{ position: "absolute", top: (low ? 1560 : 1180) - 96, left: 0, width: 1080, display: "flex", justifyContent: "center", transform: `scale(${k})` }}>
          <div style={{ background: "#b3261e", border: "6px solid #0d0a10", borderRadius: 20, padding: "2px 22px 4px", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 46, color: "#ffffff", letterSpacing: 4 }}>???</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
