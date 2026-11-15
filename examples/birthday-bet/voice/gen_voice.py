# Narration for "The Birthday Bet": Kokoro-82M (Apache-2.0), one voice, one steady tone. Each line is synthesized
# on its own and joined with short gaps (reference: almost no pauses), and the word timings come from Kokoro's
# own duration predictor (token start/end), offset by each line's position -> words.json.
import json, re, sys
import numpy as np, soundfile as sf
from kokoro import KPipeline

VOICE, SPEED, SR = sys.argv[1] if len(sys.argv) > 1 else "am_michael", float(sys.argv[2]) if len(sys.argv) > 2 else 1.12, 24000
LINES = [  # (text, gap after in s)
    ("Put just twenty-three people in a room, and it's a coin flip that two of them share a birthday.", 0.30),
    ("Dave counts exactly twenty-three people at his party, and bets the whole room ten bucks on it.", 0.16),
    ("Everyone laughs.", 0.08),
    ("There are three hundred sixty-five days in a year!", 0.16),
    ("Gary shouts, \"Anybody born on March third?\"", 0.10),
    ("Silence.", 0.30),
    ("\"See? Pay up, Dave.\"", 0.18),
    ("So Dave makes everyone call out their birthday, one by one.", 0.14),
    ("Guest nine says September ninth.", 0.10),
    ("So does guest seventeen.", 0.12),
    ("Turns out, that's the most common birthday in America.", 0.18),
    ("Wait, how?", 0.22),
    ("You see, Gary only checked his own birthday.", 0.06),
    ("That's just twenty-two chances.", 0.14),
    ("But a match can be any two people, and twenty-three people make two hundred fifty-three different pairs.", 0.16),
    ("Picture every guest shaking hands with every other guest.", 0.06),
    ("Each handshake is a tiny chance at a match, and two hundred fifty-three tiny chances add up to a coin flip.", 0.18),
    ("With fifty people, it's ninety-seven percent.", 0.06),
    ("With seventy, it's basically guaranteed.", 0.18),
    ("At the twenty fourteen World Cup, every squad had twenty-three players, and exactly half of them had a shared birthday.", 0.16),
    ("As for Gary, to get even odds of finding his own birthday twin, he'd need two hundred fifty-three other guests.", 0.20),
    ("So next time you're at a party with twenty-three people, make the bet.", 0.0),
]
LEAD = 0.05  # voice starts on frame ~1-2
pipe = KPipeline(lang_code="a")
out, words, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
for li, (text, gap) in enumerate(LINES):
    chunks, toks = [], []
    off = 0.0
    for r in pipe(text, voice=VOICE, speed=SPEED):
        a = r.audio.numpy().astype(np.float32)
        for tk in r.tokens:
            if tk.start_ts is None or not re.search(r"[A-Za-z0-9]", tk.text): continue
            toks.append((tk.text, off + tk.start_ts, off + (tk.end_ts or tk.start_ts + 0.1)))
        chunks.append(a); off += len(a) / SR
    a = np.concatenate(chunks)
    # trim leading/trailing near-silence so gaps are what we set
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
n = len(words)
print(f"{VOICE} speed {SPEED}: {len(v)/SR:.2f} s, {n} words, {n/(len(v)/SR):.2f} words/s")
