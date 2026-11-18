// Burned-in captions so the short reads with the sound off: 1-4 word chunks (numbers as digits, key words in yellow,
// a name tag over dialogue lines),
// big white Montserrat Black with a thick ink outline, lower-middle of the frame (clear of the Shorts/Reels UI),
// hard swaps on each chunk with a 5-frame pop. Each chunk starts on its first word's onset (words.json) and holds
// until the next chunk, or ~0.4 s after its last word when a pause follows.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WORD_LIST, FPS } from "./story";

/** per voice line: [number of words.json tokens, display text]; *stars* mark highlighted words */
const SPEC: [number, string][][] = [
  [[2, "*23* PEOPLE."], [2, "I BET"], [3, "*TWO* OF THEM"], [3, "SHARE A *BIRTHDAY*."]],
  [[3, "YOU'D TAKE THAT"], [2, "BET, *RIGHT?*"], [3, "*365* DAYS"], [3, "IN A YEAR."]],
  [[2, "GARY *DID*."], [2, "SO DID"], [3, "THE WHOLE PARTY."], [4, "*$100* EACH."]],
  [[3, "IF DAVE'S WRONG,"], [2, "HE OWES"], [2, "*$2,200*."]],
  [[3, "ANYONE BORN ON"], [2, "*MARCH 3RD*?"]],
  [[2, "*10* PEOPLE."], [2, "NO MATCH."], [1, "*15*."], [1, "NOTHING."]],
  [[2, "GARY'S ALREADY"], [3, "COUNTING HIS *MONEY*."]],
  [[2, "*SEPTEMBER 9TH!*"]],
  [[3, "AND GUEST *9*"], [1, "SLOWLY"], [3, "RAISES A HAND."]],
  [[3, "DAVE JUST *WON*"], [3, "*$2,200*."]],
  [[2, "HERE'S WHAT"], [2, "GARY *MISSED*."], [2, "*YOUR* BRAIN"], [3, "PROBABLY DID TOO."]],
  [[3, "HE ONLY CHECKED"], [3, "HIS *OWN* BIRTHDAY."], [3, "THAT'S *22* CHANCES."]],
  [[3, "DAVE BET ON"], [3, "*ANY TWO* PEOPLE."], [3, "EVERYONE VS EVERYONE:"], [4, "*253* PAIRS."]],
  [[4, "*253* CHANCES."], [2, "THAT'S A"], [2, "*COIN FLIP*."]],
  [[2, "AT THE"], [4, "*2014 WORLD CUP*,"], [4, "SQUADS HAD *23* PLAYERS."], [3, "*HALF* THE SQUADS"], [4, "HAD A *BIRTHDAY MATCH*."]],
  [[2, "*THE TWIST:*"], [4, "TO MATCH *YOUR* BIRTHDAY,"], [2, "YOU'D NEED"], [4, "*253* PEOPLE."], [2, "*SAME NUMBER.*"]],
  [[2, "GOOD THING"], [3, "WAY *MORE* THAN"], [3, "THAT ARE WATCHING."], [3, "*COMMENT* YOUR BIRTHDAY."], [3, "FIND YOUR *TWIN*."]],
];
/** who says a line (words.json "who"): a name tag over dialogue so sound-off viewers know who is talking */
const WHO: Record<string, [string, string]> = { dave: ["DAVE", "#7b5ac9"], gary: ["GARY", "#8a5a3c"], g17: ["GUEST 17", "#e2453c"] };
/** lines whose last chunk holds through the pause after them (the freeze after "September ninth!") */
const HOLD = new Set([7]);

type Chunk = { a: number; end: number; text: string; who?: string; hold?: boolean };
const build = (): Chunk[] => {
  const out: Chunk[] = [];
  SPEC.forEach((line, li) => {
    const ws = WORD_LIST.filter((w) => w.line === li);
    const need = line.reduce((s, [n]) => s + n, 0);
    if (need !== ws.length) throw new Error(`captions: line ${li} has ${ws.length} words, spec covers ${need}`);
    let i = 0;
    line.forEach(([n, text], ci) => {
      out.push({ a: Math.round(ws[i].s * FPS) - 1, end: Math.round(ws[i + n - 1].e * FPS), text, who: ws[0].who, hold: HOLD.has(li) && ci === line.length - 1 });
      i += n;
    });
    // the silence after Gary's question: crickets (sound-off viewers get the joke too)
    if (li === 4) { const e = Math.round(ws[ws.length - 1].e * FPS); out.push({ a: e + 9, end: e + 30, text: "*(CRICKETS)*" }); }
  });
  return out.sort((x, y) => x.a - y.a);
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
  const until = next ? (c.hold ? next.a : Math.min(next.a, c.end + 12)) : c.end + 30;
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
      {c.who && WHO[c.who] && (
        <div style={{
          position: "absolute", top: 1086, left: 0, width: 1080, display: "flex", justifyContent: "center", transform: `scale(${k})`, transformOrigin: "50% 144px",
        }}>
          <div style={{
            background: WHO[c.who][1], border: "6px solid #120c16", borderRadius: 20, padding: "2px 22px 4px",
            fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 46, color: "#ffffff", letterSpacing: 2,
          }}>{WHO[c.who][0]}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
