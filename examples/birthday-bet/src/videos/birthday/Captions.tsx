// Burned-in captions so the short reads with the sound off: 1-4 word chunks (numbers as digits, key words in yellow),
// big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Shorts/Reels UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds
// until the next chunk, or ~0.4 s after its last word when a pause follows.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: [number, string][][] = [
  [[2, "PUT JUST"], [2, "*23* PEOPLE"], [3, "IN A ROOM,"], [3, "AND IT'S A"], [2, "*COIN FLIP*"], [4, "THAT *TWO* OF THEM"], [3, "SHARE A *BIRTHDAY*"]],
  [[2, "DAVE COUNTS"], [3, "EXACTLY *23* PEOPLE"], [3, "AT HIS PARTY,"], [2, "AND BETS"], [3, "THE WHOLE ROOM"], [4, "*$10* ON IT"]],
  [[2, "EVERYONE *LAUGHS*"]],
  [[2, "THERE ARE"], [4, "*365* DAYS"], [3, "IN A YEAR!"]],
  [[2, "GARY SHOUTS,"], [3, "\"ANYBODY BORN ON"], [2, "*MARCH 3RD*?\""]],
  [[1, "...*SILENCE*."]],
  [[1, "\"SEE?"], [3, "PAY UP, DAVE.\""]],
  [[3, "SO DAVE MAKES"], [3, "EVERYONE CALL OUT"], [2, "THEIR *BIRTHDAY*,"], [3, "ONE BY ONE."]],
  [[2, "GUEST *9*"], [1, "SAYS"], [2, "*SEPTEMBER 9TH*."]],
  [[2, "SO DOES"], [2, "GUEST *17*!"]],
  [[2, "TURNS OUT,"], [3, "THAT'S THE MOST"], [2, "*COMMON BIRTHDAY*"], [2, "IN AMERICA."]],
  [[2, "WAIT... *HOW?*"]],
  [[2, "YOU SEE,"], [3, "GARY ONLY CHECKED"], [3, "HIS *OWN* BIRTHDAY."]],
  [[2, "THAT'S JUST"], [2, "*22* CHANCES."]],
  [[3, "BUT A MATCH"], [2, "CAN BE"], [3, "*ANY TWO* PEOPLE,"], [3, "AND *23* PEOPLE"], [1, "MAKE"], [3, "*253*"], [2, "DIFFERENT *PAIRS*."]],
  [[3, "PICTURE EVERY GUEST"], [2, "*SHAKING HANDS*"], [4, "WITH EVERY OTHER GUEST."]],
  [[2, "EACH HANDSHAKE"], [3, "IS A TINY"], [4, "CHANCE AT A *MATCH*,"], [4, "AND *253*"], [2, "TINY CHANCES"], [3, "ADD UP TO"], [3, "A *COIN FLIP*."]],
  [[3, "WITH *50* PEOPLE,"], [3, "IT'S *97%*."]],
  [[2, "WITH *70*,"], [1, "IT'S"], [2, "BASICALLY *GUARANTEED*."]],
  [[2, "AT THE"], [4, "*2014 WORLD CUP*,"], [3, "EVERY SQUAD HAD"], [2, "*23* PLAYERS,"], [2, "AND EXACTLY"], [3, "*HALF* OF THEM"], [4, "HAD A *SHARED BIRTHDAY*."]],
  [[3, "AS FOR GARY,"], [2, "TO GET"], [2, "*EVEN ODDS*"], [3, "OF FINDING HIS"], [3, "OWN *BIRTHDAY TWIN*,"], [2, "HE'D NEED"], [3, "*253*"], [2, "OTHER *GUESTS*."]],
  [[3, "SO NEXT TIME"], [4, "YOU'RE AT A PARTY"], [3, "WITH *23* PEOPLE,"], [3, "*MAKE THE BET.*"]],
];

type Chunk = { a: number; end: number; text: string };
const build = (): Chunk[] => {
  const out: Chunk[] = [];
  SPEC.forEach((line, li) => {
    const ws = WORD_LIST.filter((w) => w.line === li);
    const need = line.reduce((s, [n]) => s + n, 0);
    if (need !== ws.length) throw new Error(`captions: line ${li} has ${ws.length} words, spec covers ${need}`);
    let i = 0;
    for (const [n, text] of line) {
      out.push({ a: Math.round(ws[i].s * FPS) - 1, end: Math.round(ws[i + n - 1].e * FPS), text });
      i += n;
    }
  });
  return out;
};
export const CHUNKS = build();

const HL = "#ffd84a";
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
  const until = next ? Math.min(next.a, c.end + 12) : c.end + 30;
  if (f >= until) return null;
  const u = f - c.a, k = u >= 5 ? 1 : [0.82, 1.06, 1.1, 1.04, 1.01][u];
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 1180, width: 900, left: 90, textAlign: "center",
        fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 1.08, letterSpacing: 1,
        color: "#ffffff", WebkitTextStroke: "16px #120c16", paintOrder: "stroke fill",
        textShadow: "0 7px 0 rgba(18,12,22,0.55)", transform: `scale(${k})`, transformOrigin: "50% 50%",
      }}>
        <Styled text={c.text} />
      </div>
    </AbsoluteFill>
  );
};
