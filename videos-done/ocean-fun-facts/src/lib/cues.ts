// Frame cues straight from the voice's words.json, so a story stays in sync when the voice is regenerated.
import type { Word } from "./captions";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");

export const cueSheet = (words: Word[], fps = 30) => {
  const lines: { s: number; e: number }[] = [];
  for (const w of words) {
    const li = w.line ?? 0;
    if (!lines[li]) lines[li] = { s: w.s, e: w.e };
    else { lines[li].e = Math.max(lines[li].e, w.e); }
  }
  /** frame where `word` starts (nth occurrence, optionally only searching from line `fromLine`) */
  const W = (word: string, nth = 0, fromLine = 0) => {
    const n = norm(word);
    let k = 0;
    for (const w of words) {
      if ((w.line ?? 0) < fromLine) continue;
      if (norm(w.w) === n) { if (k === nth) return Math.round(w.s * fps); k++; }
    }
    throw new Error(`cue word not found: ${word} #${nth} (from line ${fromLine})`);
  };
  /** frame where `word` ends */
  const E = (word: string, nth = 0, fromLine = 0) => {
    const n = norm(word);
    let k = 0;
    for (const w of words) {
      if ((w.line ?? 0) < fromLine) continue;
      if (norm(w.w) === n) { if (k === nth) return Math.round(w.e * fps); k++; }
    }
    throw new Error(`cue word not found: ${word}`);
  };
  /** line start / end frames */
  const L = (i: number) => Math.round(lines[i].s * fps);
  const LE = (i: number) => Math.round(lines[i].e * fps);
  /** shot boundary just before line i starts (2 frames of lead) */
  const B = (i: number) => Math.max(0, L(i) - 4);
  const end = Math.round(words[words.length - 1].e * fps);
  return { W, E, L, LE, B, end, nLines: lines.length };
};
