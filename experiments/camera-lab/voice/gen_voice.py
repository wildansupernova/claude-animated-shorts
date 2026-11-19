# Narration for the camera-move lab short "Butter Side Down" (~14 s): Kokoro-82M (Apache-2.0), one narrator voice.
# Each line is synthesized on its own and joined with short gaps; word timings come from Kokoro's own duration
# predictor (token start/end), offset by each line's position -> words.json. Same method as
# videos-done/birthday-bet/voice/gen_voice.py.
import json, re
import numpy as np, soundfile as sf
from kokoro import KPipeline

SR = 24000
VOICE, SPEED = "am_michael", 1.34
LINES = [  # (text, gap after in s)
    ("Toast really does land butter side down. And it's not bad luck.", 0.22),
    ("Blame your table. It's only about seventy-five centimeters tall.", 0.18),
    ("The toast tips off the edge, starts spinning, and only has time for half a turn.", 0.12),
    ("Splat.", 0.34),
    ("To land butter side up, it would need a table three meters tall.", 0.0),
]
LEAD = 0.05
pipe = KPipeline(lang_code="a")
out, words, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
for li, (text, gap) in enumerate(LINES):
    chunks, toks, off = [], [], 0.0
    for r in pipe(text, voice=VOICE, speed=SPEED):
        a = r.audio.numpy().astype(np.float32)
        for tk in r.tokens:
            if tk.start_ts is None or not re.search(r"[A-Za-z0-9]", tk.text): continue
            toks.append((tk.text, off + tk.start_ts, off + (tk.end_ts or tk.start_ts + 0.1)))
        chunks.append(a); off += len(a) / SR
    a = np.concatenate(chunks)
    env = np.abs(a) > 0.01
    i0 = max(0, int(np.argmax(env)) - int(0.03 * SR)); i1 = min(len(a), len(a) - int(np.argmax(env[::-1])) + int(0.06 * SR))
    a = a[i0:i1]
    for w, s, e in toks:
        words.append({"w": w, "s": round(t + s - i0 / SR, 3), "e": round(t + min(e, i1 / SR) - i0 / SR, 3), "line": li})
    out.append(a); t += len(a) / SR
    out.append(np.zeros(int(gap * SR), np.float32)); t += gap
v = np.concatenate(out)
v = v / max(1e-6, np.abs(v).max()) * 0.89
sf.write("voice.wav", v, SR, subtype="PCM_24")
json.dump(words, open("words.json", "w"), indent=0)
print(f"{len(v)/SR:.2f} s, {len(words)} words, {len(words)/(len(v)/SR):.2f} words/s")
for w in words: print(w["line"], w["w"], w["s"], w["e"])
