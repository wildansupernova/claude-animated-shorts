// Burned-in captions so the short reads with the sound off: 1-5 word chunks, key words in amber (the floor display's
// colour), big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Reels/Shorts UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds until
// the next chunk, or ~0.4 s after its last word when a pause follows; the last question holds to the end.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS, TOTAL, shotAt, cue } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: [number, string][][] = [
  [[2, "IMAGINE YOU'RE"], [2, "THE LAST"], [2, "ONE LEAVING"], [2, "THE *OFFICE*."]],
  [[3, "IT'S ALMOST *MIDNIGHT*."]],
  [[3, "AND BEHIND YOU,"], [2, "THE *LIGHTS*"], [2, "SWITCH OFF."]],
  [[2, "*ONE ROW*"], [3, "AT A TIME."]],
  [[4, "YOU CALL THE ELEVATOR,"], [2, "STEP INSIDE,"], [2, "AND PRESS"], [3, "THE *GROUND FLOOR*."]],
  [[3, "THE DOORS CLOSE."], [4, "THE NUMBERS COUNT DOWN."]],
  [[1, "*3*"]], [[1, "*2*"]], [[1, "*1*"]], [[1, "*GROUND*."]],
  [[4, "AND IT *KEEPS GOING*."]],
  [[3, "YOU PRESS THE"], [2, "BUTTON AGAIN."], [1, "*NOTHING*."]],
  [[2, "YOUR PHONE?"], [2, "*2%*."], [2, "NO SIGNAL."]],
  [[3, "THE EMERGENCY BUTTON"], [2, "JUST *RINGS*,"], [2, "AND *RINGS*."]],
  [[3, "AND *NOBODY* ANSWERS."]],
  [[4, "THEN THE PANEL *CHANGES*."]],
  [[4, "BELOW THE GROUND FLOOR,"], [4, "*NEW BUTTONS* LIGHT UP."]],
  [[1, "*ZERO*."], [2, "*MINUS ONE*."], [3, "ALL THE WAY"], [4, "DOWN TO *MINUS SEVEN*."]],
  [[3, "THEN, WITH A"], [1, "*JOLT*,"], [3, "THE ELEVATOR STOPS."]],
  [[2, "FLOOR *ZERO*."]],
  [[4, "THAT'S WHEN YOU NOTICE"], [2, "A *CARD*,"], [4, "TAPED TO THE MIRROR."]],
  [[2, "NIGHT SHIFT."], [2, "*ELEVATOR RULES*."]],
  [[3, "*RULE NUMBER ONE*."], [4, "IF THE DOORS OPEN"], [5, "ON A FLOOR THAT ISN'T"], [3, "ON THE PANEL,"]],
  [[4, "*DO NOT STEP OUT*."]],
  [[2, "THE REST"], [4, "HAS BEEN *SCRATCHED OFF*."]],
  [[2, "YOU *LAUGH*."], [4, "IT'S PROBABLY THE CLEANERS,"], [3, "MESSING WITH PEOPLE."]],
  [[4, "THEN, WITH A SOFT"], [1, "*DING*,"], [3, "THE DOORS OPEN."]],
  [[3, "IT'S *YOUR* OFFICE."], [4, "THE *EXACT SAME* OFFICE."]],
  [[4, "BUT SOMETHING IS *WRONG*."]],
  [[2, "*EVERY CHAIR*"], [3, "HAS BEEN TURNED"], [4, "TO FACE THE *ELEVATOR*."]],
  [[4, "AND ON YOUR DESK,"], [4, "YOUR COMPUTER IS *ON*."]],
  [[4, "IT'S TYPING *YOUR NAME*."]],
  [[4, "THEN YOU HEAR IT."]],
  [[1, "*BREATHING*."]],
  [[3, "*RIGHT BEHIND YOU*."]],
  [[3, "IN THE CORNER"], [2, "STANDS SOMEONE"], [5, "YOU NEVER SAW GET IN."]],
  [[3, "*FACING THE WALL*."]],
  [[3, "AND THE DOORS"], [3, "START TO *CLOSE*."]],
  [[4, "YOU HAVE *TWO CHOICES*."]],
  [[2, "*STEP OUT*,"], [3, "INTO AN OFFICE"], [4, "THAT KNOWS YOUR NAME."]],
  [[3, "OR *STAY IN*"], [2, "THE ELEVATOR,"], [3, "WITH WHOEVER IS"], [3, "*FACING THE WALL*."]],
  [[5, "SO, WHAT WOULD *YOU* DO?"]],
];

type Chunk = { a: number; end: number; text: string; last?: boolean };
const build = (): Chunk[] => {
  const out: Chunk[] = [];
  SPEC.forEach((line, li) => {
    const ws = WORD_LIST.filter((w) => w.line === li);
    const need = line.reduce((s, [n]) => s + n, 0);
    if (need !== ws.length) throw new Error(`captions: line ${li} has ${ws.length} words, spec covers ${need}`);
    let i = 0;
    line.forEach(([n, text]) => {
      out.push({ a: Math.round(ws[i].s * FPS) - 1, end: Math.round(ws[i + n - 1].e * FPS), text, last: li === SPEC.length - 1 });
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
  const sid = shotAt(f).id, low = sid === 16 || (sid === 15 && f >= cue(21) - 3); // keep the card (and Rule 2) clear
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
    </AbsoluteFill>
  );
};
