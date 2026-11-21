# Narration for "Floor Zero, Part 5": Kokoro-82M (Apache-2.0). Narrator af_heart; the one facing the wall speaks with
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
L = [  # (line id, who, text, speed, gap after). 99 = the cold-open premise line (spoken first); 0-27 = SCRIPT.md lines
    (99, "narr", 'Only one of you gets to clock out.', 0.88, 0.45),
    (0, "narr", 'So, turn around, or keep walking?', 0.9, 0.55),
    (1, "narr", "If you turned around, there's nothing there.", 0.88, 0.4),
    (2, "narr", "But on every screen, it's still right behind you.", 0.88, 0.5),
    (3, "narr", 'You turn again. Nothing. And you feel it breathe on your neck.', 0.86, 0.5),
    (4, "narr", 'One by one, the monitors go dark.', 0.88, 0.45),
    (5, "narr", 'This is the end.', 0.84, 0.7),
    (6, "narr", "Let's rewind.", 0.95, 1.1),
    (7, "narr", 'If you kept walking, you watch it on the screens. Row by row.', 0.92, 0.4),
    (8, "narr", 'One step behind you. Always exactly one step.', 0.86, 0.5),
    (9, "narr", 'Then the screens start to die. One by one.', 0.92, 0.3),
    (10, "narr", 'And you run.', 0.95, 0.3),
    (11, "narr", 'Down the stairs, as fast as you can.', 1.0, 0.4),
    (12, "narr", 'Minus five. The door is open.', 0.9, 0.3),
    (13, "narr", 'Hundreds of photos. One for every Friday. The newest frame is empty. And it has your name on it.', 0.9, 1.0),
    (14, "narr", 'Minus seven. A time clock, and a sign above it.', 0.9, 0.3),
    (15, "narr", 'Only one of you can clock out.', 0.86, 0.5),
    (16, "narr", 'Then your phone lights up. No service. But a message gets through.', 0.92, 0.3),
    (17, "narr", 'From home. OK. See you soon.', 0.88, 0.4),
    (18, "narr", "It's a reply. To a message from your number. Leaving now.", 0.9, 0.4),
    (19, "narr", 'You never sent that.', 0.84, 0.8),
    (20, "narr", "Five fifty-seven. And your phone's light dies.", 0.88, 0.4),
    (21, "narr", 'In the dark, something takes your wrist.', 0.84, 0.6),
    (22, "narr", 'When the light comes back, there are two of you.', 0.88, 0.8),
    (23, "narr", 'And both of you remember being you.', 0.86, 2.3),
    (24, "narr", 'Look closely before you answer.', 0.88, 1.2),
    (25, "narr", 'One.', 0.9, 0.3),
    (26, "narr", 'Or two.', 0.9, 0.4),
    (27, "narr", 'So, which one is you?', 0.86, 0.0),
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
