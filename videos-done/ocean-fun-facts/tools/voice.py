"""Expressive voice-over with Kokoro + word timings for captions.
usage: tts-venv/bin/python tools/voice.py <lines.txt> <out_dir> [voice]
lines.txt: one sentence per line:  speed | pause_after_s | text
  text markup:  *word*            -> emphasised in captions (colour pop)
                {shown|spoken}    -> caption shows `shown`, TTS speaks `spoken`
                [word](/phon/) or [word](+1)  -> misaki pronunciation / stress hints (kept for TTS, stripped for captions)
writes voice.wav (24 kHz mono) and words.json [{w, s, e, emph, line}] (seconds)."""
import sys, re, json, numpy as np, soundfile as sf
from kokoro import KPipeline

src, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "am_puck"
SR = 24000
LEAD = 0.08

def units_of(text):
    """split a marked-up line into caption units: (shown, spoken, emph)"""
    units = []
    pat = re.compile(r"\{([^|}]*)\|([^}]*)\}|\[([^\]]+)\]\(([^)]*)\)|(\S+)")
    for m in pat.finditer(text):
        if m.group(1) is not None:
            shown, spoken = m.group(1), m.group(2)
            units.append((shown, spoken, False))
        elif m.group(3) is not None:
            word, hint = m.group(3), m.group(4)
            emph = word.startswith("*")
            word = word.strip("*")
            units.append((word, f"[{word}]({hint})", emph))
        else:
            w = m.group(5)
            emph = "*" in w
            w2 = w.replace("*", "")
            units.append((w2, w2, emph))
    return units

norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

pipe = KPipeline(lang_code="a")
audio = [np.zeros(int(LEAD * SR), np.float32)]
t_off = LEAD
words = []
for li, raw in enumerate(l for l in open(src).read().splitlines() if l.strip() and not l.startswith("#")):
    speed, pause, text = [x.strip() for x in raw.split("|", 2)]
    speed, pause = float(speed), float(pause)
    units = units_of(text)
    tts_text = " ".join(u[1] for u in units)
    # character stream of the spoken (alnum) text, owner unit per char; phoneme-hint units count their display word
    stream, owner = "", []
    for ui, u in enumerate(units):
        sp = u[0] if u[1].startswith("[") else u[1]
        n = norm(sp)
        stream += n; owner += [ui] * len(n)
    ustart, uend = [None] * len(units), [None] * len(units)
    pos = 0
    seg_audio = []
    seg_off = 0.0
    for r in pipe(tts_text, voice=voice, speed=speed):
        a = r.audio.numpy().astype(np.float32)
        for tk in r.tokens:
            n = norm(tk.text)
            if not n or tk.start_ts is None:
                continue
            # find the token in the stream (tolerant to small mismatches)
            j = stream.find(n, pos)
            if j < 0 or j - pos > 12:
                j = pos
            k = min(j + len(n), len(stream))
            for c in range(j, k):
                ui = owner[c]
                s, e = seg_off + tk.start_ts, seg_off + (tk.end_ts or tk.start_ts + 0.1)
                ustart[ui] = s if ustart[ui] is None else min(ustart[ui], s)
                uend[ui] = e if uend[ui] is None else max(uend[ui], e)
            pos = k
        seg_audio.append(a)
        seg_off += len(a) / SR
    a = np.concatenate(seg_audio)
    # trim trailing silence of the line, keep 40 ms
    env = np.abs(a) > 0.01
    last = (np.nonzero(env)[0][-1] + int(0.04 * SR)) if env.any() else len(a)
    a = a[:last]
    # fill unknown unit times by interpolation
    for ui in range(len(units)):
        if ustart[ui] is None:
            prev = next((uend[j] for j in range(ui - 1, -1, -1) if uend[j] is not None), 0.0)
            ustart[ui] = prev; uend[ui] = prev + 0.15
    for ui, u in enumerate(units):
        words.append({"w": u[0], "s": round(t_off + ustart[ui], 3), "e": round(t_off + min(uend[ui], len(a) / SR), 3), "emph": u[2], "line": li})
    audio.append(a)
    audio.append(np.zeros(int(pause * SR), np.float32))
    t_off += len(a) / SR + pause
    print(f"line {li}: {len(a)/SR:.2f}s  {tts_text[:70]}")
y = np.concatenate(audio)
y = y / max(1e-6, np.abs(y).max()) * 0.89
sf.write(f"{out}/voice.wav", y, SR)
json.dump(words, open(f"{out}/words.json", "w"), indent=0)
print("total", round(len(y) / SR, 2), "s,", len(words), "words,", round(len(words) / (len(y) / SR), 2), "w/s")
