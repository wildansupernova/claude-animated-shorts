# Narration for "Floor Zero, Part 2": Kokoro-82M (Apache-2.0). Narrator af_heart; the one facing the wall speaks with
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
L = [  # (who, text, speed, gap after)
    ("narr", "So, did you step out, or did you stay in?", 0.9, 0.7),
    ("narr", "If you stayed in, the doors close.", 0.92, 0.45),
    ("narr", "The card said, don't step out. And you listened.", 0.92, 0.45),
    ("narr", "The panel goes dark. The light above you hums.", 0.9, 0.45),
    ("narr", "And then, without turning around, the one facing the wall speaks.", 0.9, 0.55),
    ("fig", "Don't worry.", 0.95, 0.6),
    ("fig", "I'll finish your shift.", 0.95, 0.8),
    ("narr", "The lights go out.", 0.86, 1.1),
    ("narr", "When they come back on, they're gone.", 0.9, 0.4),
    ("narr", "And now, you're the one facing the wall.", 0.86, 0.6),
    ("narr", "This is the end.", 0.84, 0.8),
    ("narr", "Let's rewind.", 0.95, 1.2),
    ("narr", "If you stepped out, the doors close behind you.", 0.93, 0.35),
    ("narr", "And the elevator drops.", 0.9, 0.3),
    ("narr", "Floor after floor, all the way down, until it hits the bottom.", 0.95, 0.9),
    ("narr", "You were right to leave. You let out a breath.", 0.92, 0.5),
    ("narr", "But then, every computer in the office turns on.", 0.93, 0.25),
    ("narr", "All at once. And every screen says the same thing.", 0.92, 0.45),
    ("narr", "Welcome to the night shift.", 0.86, 0.4),
    ("narr", "Seven floors. One rule on each.", 0.88, 0.35),
    ("narr", "The only way up is down.", 0.84, 0.5),
    ("narr", "Reach the ground floor by six in the morning. Or stay here forever.", 0.92, 0.7),
    ("narr", "Then, behind you, a soft ding.", 0.9, 0.35),
    ("narr", "The elevator is back.", 0.88, 0.5),
    ("narr", "The doors open. The light is on. And the one facing the wall is still inside.", 0.93, 0.35),
    ("narr", "Only now, one step closer to the doors.", 0.86, 0.6),
    ("narr", "Right next to it, the stairwell door creaks open.", 0.93, 0.4),
    ("narr", "Down in the dark, you hear footsteps. Coming up.", 0.9, 0.6),
    ("narr", "You have to go down. Two ways.", 0.92, 0.4),
    ("narr", "Take the stairs, toward the footsteps.", 0.93, 0.35),
    ("narr", "Or take the elevator, with the one facing the wall.", 0.92, 0.5),
    ("narr", "So, which way down do you go?", 0.86, 0.0),
]
LEAD = 0.12
pipes = {"a": KPipeline(lang_code="a")}
out, words, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
for li, (who, text, speed, gap) in enumerate(L):
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
