# Narration for "Floor Zero, Part 3": Kokoro-82M (Apache-2.0). Narrator af_heart; the one facing the wall speaks with
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
L = [  # (line id, who, text, speed, gap after). 99 = the cold-open premise line (spoken first); 0-30 = SCRIPT.md lines
    (99, "narr", "Floor minus one is flooded. Don't step in it.", 0.9, 0.45),
    (0, "narr", 'So, stairs, or elevator?', 0.9, 0.55),
    (1, "narr", 'If you took the stairs, the footsteps keep coming up.', 0.92, 0.35),
    (2, "narr", 'Then they stop. Right below you.', 0.86, 0.6),
    (3, "narr", 'Your phone. One percent. You point the light down.', 0.9, 0.35),
    (4, "narr", "Nobody's there.", 0.84, 0.7),
    (5, "narr", 'The red lamp flickers.', 0.88, 0.35),
    (6, "narr", 'And a hand settles on your shoulder.', 0.84, 0.7),
    (7, "narr", 'This is the end.', 0.84, 0.7),
    (8, "narr", "Let's rewind.", 0.95, 1.1),
    (9, "narr", 'If you took the elevator, you step inside with it.', 0.93, 0.35),
    (10, "narr", 'The doors close. Minus one is a long way down.', 0.9, 0.45),
    (11, "narr", 'The light flickers.', 0.88, 0.35),
    (12, "narr", "When it comes back, it's a step closer.", 0.88, 0.45),
    (13, "narr", 'Again.', 0.88, 0.35),
    (14, "narr", 'Another step.', 0.86, 0.45),
    (15, "narr", 'Again.', 0.88, 0.35),
    (16, "narr", "And now it's standing right in front of you.", 0.86, 0.55),
    (17, "narr", "It's your height now. It has ears now. And it's wearing a red lanyard. Like yours.", 0.9, 0.55),
    (18, "narr", 'Ding. Minus one. The doors open, and you back out.', 0.92, 0.45),
    (19, "narr", 'Minus one is your office again.', 0.9, 0.35),
    (20, "narr", "Only it's flooded. Black water. Perfectly still.", 0.86, 0.45),
    (21, "narr", "A sign on the wall says: minus one. Don't step in the water.", 0.92, 0.45),
    (22, "narr", 'The stairs down are on the far side.', 0.92, 0.45),
    (23, "narr", 'Then, at the far end, the lights start switching off.', 0.92, 0.35),
    (24, "narr", 'One row at a time.', 0.86, 0.45),
    (25, "narr", 'Coming toward you.', 0.84, 0.55),
    (26, "narr", "And you're the only one standing in the light.", 0.88, 0.55),
    (27, "narr", 'You have two choices.', 0.92, 0.35),
    (28, "narr", "Wade straight through the water. It's fast. But it breaks the rule.", 0.93, 0.45),
    (29, "narr", "Or climb across the desks, one by one. It's slow. And the dark is coming.", 0.93, 0.45),
    (30, "narr", 'So, do you wade through it, or climb across the desks?', 0.88, 0.0),
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
