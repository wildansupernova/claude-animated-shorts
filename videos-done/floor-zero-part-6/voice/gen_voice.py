# Narration for "Floor Zero, Part 6": Kokoro-82M (Apache-2.0). Narrator af_heart; the one facing the wall speaks with
# am_onyx, generated a little fast and then resampled 2 semitones down (slower, lower, wrong). Each line is synthesized
# on its own at its own speed and joined with the scripted gaps; word timings come from Kokoro's duration predictor
# (scaled for the resampled lines) -> words.json (with "who").
import json, re, sys
import numpy as np, soundfile as sf
from scipy import signal
from kokoro import KPipeline

SR = 24000
NARR = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
FIG = "am_onyx"
SEMI = 2.0  # the figure: pitch/speed down by this many semitones (resampling)
L = [  # (line id, who, text, speed, gap after). 99 = the cold-open premise line (spoken first); 0-29 = SCRIPT.md lines
    (99, "narr", "You made your choice. Let's see if it was you.", 0.88, 0.45),
    (0, "narr", 'So, one, or two?', 0.9, 0.55),
    (1, "narr", 'If you picked two, you kept your eyes on one.', 0.88, 0.4),
    (2, "narr", 'Nobody was watching two.', 0.86, 0.6),
    (3, "narr", 'Five fifty-nine. It swipes its badge, and the clock takes it.', 0.88, 0.45),
    (4, "narr", 'Ground floor. Morning.', 0.86, 0.45),
    (5, "narr", 'It types a message home. On my way.', 0.88, 0.55),
    (6, "narr", 'Down on minus seven, one turns to face the wall.', 0.86, 0.55),
    (7, "narr", 'You were one. You spent the last minute watching yourself.', 0.86, 0.7),
    (8, "narr", 'This is the end.', 0.84, 0.7),
    (9, "narr", "Let's rewind.", 0.95, 1.1),
    (10, "narr", "If you picked one, then two is the copy. So you don't look away from it.", 0.9, 0.4),
    (11, "narr", 'Look at its badge.', 0.86, 0.45),
    (12, "narr", 'And its hair.', 0.86, 0.5),
    (13, "narr", 'It learned you from reflections. The steel. The water. The screens.', 0.88, 0.45),
    (14, "narr", 'It got everything right.', 0.86, 0.35),
    (15, "narr", 'Except it learned you backwards.', 0.84, 0.7),
    (16, "narr", 'Without blinking, you back up to the clock.', 0.88, 0.35),
    (17, "narr", 'Five fifty-nine, and fifty-nine seconds. You swipe your badge.', 0.88, 0.5),
    (18, "narr", 'Six o\'clock. In front of you, it turns to face the wall.', 0.86, 0.45),
    (19, "narr", 'And slowly, it goes grey.', 0.84, 0.6),
    (20, "narr", 'Above the clock, the same card. Unscratched.', 0.86, 0.45),
    (21, "narr", 'Rule two. If someone is facing the wall, never look away from them.', 0.88, 0.6),
    (22, "narr", 'Rule three. The night shift always keeps one.', 0.84, 1.0),
    (23, "narr", 'Ground floor. Morning. One bar. A message from home. Where are you? You type: On my way.', 0.9, 0.6),
    (24, "narr", 'Next Friday, just before midnight, someone else is the last one leaving the office.', 0.92, 0.35),
    (25, "narr", 'Behind them, the lights switch off. One row at a time.', 0.9, 0.45),
    (26, "narr", 'The elevator goes right past the ground floor.', 0.9, 0.35),
    (27, "narr", 'Then, with a jolt, the lights go out.', 0.88, 0.8),
    (28, "narr", 'And when they come back on, someone is standing in the corner. Facing the wall.', 0.88, 1.2),
    (29, "narr", "Imagine you're the last one leaving the office.", 0.86, 0.0),
]
LEAD = 0.15  # the premise line plays over the cold-open teaser from the start
pipes = {"a": KPipeline(lang_code="a")}
out, words, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
for li, who, text, speed, gap in L:
    voice = NARR if who == "narr" else FIG
    chunks, toks, off = [], [], 0.0
    for r in pipes["a"](text, voice=voice, speed=speed):
        a = r.audio.numpy().astype(np.float32)
        for tk in r.tokens:
            if tk.start_ts is None or not re.search(r"[A-Za-z0-9]", tk.text): continue
            toks.append((tk.text, off + tk.start_ts, off + (tk.end_ts or tk.start_ts + 0.1)))
        chunks.append(a); off += len(a) / SR
    a = np.concatenate(chunks)
    k = 1.0
    if who == "fig":
        k = 2 ** (SEMI / 12)  # stretch by k: lower and slower
        a = signal.resample(a, int(len(a) * k)).astype(np.float32)
        a = a * 1.15
    env = np.abs(a) > 0.01
    i0 = max(0, int(np.argmax(env)) - int(0.03 * SR)); i1 = min(len(a), len(a) - int(np.argmax(env[::-1])) + int(0.1 * SR))
    a = a[i0:i1]
    n = int(0.008 * SR); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    for w, s, e in toks:
        words.append({"w": w, "s": round(t + s * k - i0 / SR, 3), "e": round(t + min(e * k, i1 / SR) - i0 / SR, 3), "line": li, "who": who})
    out.append(a); t += len(a) / SR
    out.append(np.zeros(int(gap * SR), np.float32)); t += gap
v = np.concatenate(out)
v = v / max(1e-6, np.abs(v).max()) * 0.89
sf.write("voice.wav", v, SR, subtype="PCM_24")
json.dump(words, open("words.json", "w"), indent=0)
print(f"{NARR}+{FIG}: {len(v)/SR:.2f} s, {len(words)} words")
