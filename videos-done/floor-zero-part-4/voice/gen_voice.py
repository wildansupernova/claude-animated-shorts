# Narration for "Floor Zero, Part 4": Kokoro-82M (Apache-2.0). Narrator af_heart; the one facing the wall speaks with
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
L = [  # (line id, who, text, speed, gap after). 99 = the cold-open premise line (spoken first); 0-28 = SCRIPT.md lines
    (99, "narr", 'The rule on this floor: never turn around.', 0.9, 0.45),
    (0, "narr", 'So, wade, or climb?', 0.9, 0.55),
    (1, "narr", 'If you waded, the water is warm.', 0.88, 0.4),
    (2, "narr", "You take another step. And your reflection doesn't.", 0.88, 0.55),
    (3, "narr", 'It stays where it is. Looking up at you.', 0.86, 0.55),
    (4, "narr", 'Then it reaches up, and pulls.', 0.86, 0.6),
    (5, "narr", 'This is the end.', 0.84, 0.7),
    (6, "narr", "Let's rewind.", 0.95, 1.1),
    (7, "narr", 'If you climbed, you go desk to desk, while the dark comes closer.', 0.94, 0.35),
    (8, "narr", 'Then your badge slips off. Into the water.', 0.9, 0.45),
    (9, "narr", 'And you need that badge to clock out.', 0.9, 0.45),
    (10, "narr", "The rule says step. It doesn't say reach.", 0.88, 0.45),
    (11, "narr", 'So you reach in.', 0.86, 0.35),
    (12, "narr", 'And your reflection grabs your wrist.', 0.86, 0.45),
    (13, "narr", 'You tear free, with the badge.', 0.92, 0.35),
    (14, "narr", 'It leaves a grey mark on your wrist.', 0.88, 0.45),
    (15, "narr", 'The last row of lights goes out just as you reach the stairs.', 0.94, 0.45),
    (16, "narr", 'Minus two is bricked up. You keep going down.', 0.92, 0.35),
    (17, "narr", 'Minus three. Your office again.', 0.9, 0.35),
    (18, "narr", 'Every monitor is on. And every one shows the same thing.', 0.92, 0.45),
    (19, "narr", 'A security camera. Pointed right at you.', 0.9, 0.45),
    (20, "narr", 'Live.', 0.84, 0.55),
    (21, "narr", 'A sign on the wall says: minus three. Never turn around.', 0.92, 0.45),
    (22, "narr", "Then, on every screen, it's standing right behind you.", 0.88, 0.45),
    (23, "narr", 'Not facing the wall anymore. Facing you.', 0.86, 0.55),
    (24, "narr", "And it's wearing a blue sweater. Like yours.", 0.88, 0.55),
    (25, "narr", 'You have two choices.', 0.92, 0.35),
    (26, "narr", 'Turn around, and face it. Even though the rule says never.', 0.92, 0.45),
    (27, "narr", 'Or keep walking, with it right behind you, all the way to the door.', 0.93, 0.45),
    (28, "narr", 'So, do you turn around, or do you keep walking?', 0.88, 0.0),
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
