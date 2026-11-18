# Dialogue + narration for "The Birthday Bet" (v3): Kokoro-82M (Apache-2.0), four voices. Each line is synthesized
# on its own and joined with short gaps (reference: almost no pauses), and the word timings come from Kokoro's
# own duration predictor (token start/end), offset by each line's position -> words.json.
import json, re, sys
import numpy as np, soundfile as sf
from kokoro import KPipeline

SR = 24000
# who speaks each line: Kokoro voice + speed. Pitches measured with an autocorrelation F0 so the four read as four
# people: narrator am_michael ~121 Hz, Dave am_fenrir ~148 Hz, Gary am_onyx ~92 Hz (deep, grumpy), guest 17 af_bella ~202 Hz.
VOICES = {"narr": ("am_michael", 1.2), "dave": ("am_fenrir", 1.14), "gary": ("am_onyx", 1.06), "g17": ("af_bella", 1.12)}
LINES = [  # (who, text, gap after in s)
    ("dave", "Twenty-three people. I bet two of them share a birthday.", 0.24),
    ("narr", "You'd take that bet, right? Three sixty-five days in a year.", 0.16),
    ("narr", "Gary did. So did the whole party. A hundred bucks each.", 0.14),
    ("narr", "If Dave's wrong, he owes twenty-two hundred.", 0.22),
    ("gary", "Anyone born on March third?", 1.6),           # crickets, then the roll call counts 1..9 before "Ten"
    ("narr", "Ten people. No match. Fifteen. Nothing.", 0.12),
    ("narr", "Gary's already counting his money.", 0.22),
    ("g17", "September ninth!", 0.8),                       # record scratch + freeze
    ("narr", "And guest nine slowly raises a hand.", 0.2),
    ("narr", "Dave just won twenty-two hundred bucks.", 0.26),
    ("narr", "Here's what Gary missed. Your brain probably did too.", 0.14),
    ("narr", "He only checked his own birthday. That's twenty-two chances.", 0.14),
    ("narr", "Dave bet on any two people. Everyone versus everyone: two hundred fifty-three pairs.", 0.14),
    ("narr", "Two hundred fifty-three chances. That's a coin flip.", 0.22),
    ("narr", "At the twenty fourteen World Cup, squads had twenty-three players. Half the squads had a birthday match.", 0.18),
    ("narr", "The twist: to match your birthday, you'd need two hundred fifty-three people. Same number.", 0.22),
    ("narr", "Good thing way more than that are watching. Comment your birthday. Find your twin.", 0.0),
]
LEAD = 0.05  # voice starts on frame ~1-2
pipe = KPipeline(lang_code="a")
out, words, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
for li, (who, text, gap) in enumerate(LINES):
    VOICE, SPEED = VOICES[who]
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
    # level-match the four voices: same RMS over the voiced samples
    vo = a[np.abs(a) > 0.01]
    a = a * (0.1 / max(1e-6, float(np.sqrt(np.mean(vo ** 2)))))
    for w, s, e in toks:
        words.append({"w": w, "s": round(t + s - i0 / SR, 3), "e": round(t + min(e, i1 / SR) - i0 / SR, 3), "line": li, "who": who})
    out.append(a); t += len(a) / SR
    out.append(np.zeros(int(gap * SR), np.float32)); t += gap
v = np.concatenate(out)
v = v / max(1e-6, np.abs(v).max()) * 0.89
sf.write("voice.wav", v, SR, subtype="PCM_24")
json.dump(words, open("words.json", "w"), indent=0)
n = len(words)
print(f"4 voices: {len(v)/SR:.2f} s, {n} words, {n/(len(v)/SR):.2f} words/s")
