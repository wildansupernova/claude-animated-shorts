# Narration for "Floor Zero, Part 1": Kokoro-82M (Apache-2.0), one narrator. Each line is synthesized on its own at its
# own speed (slower on the dread lines) and joined with the scripted gaps; word timings come from Kokoro's duration
# predictor (token start/end), offset by each line's position -> words.json. Usage: python gen_voice.py [voice]
import json, re, sys
import numpy as np, soundfile as sf
from kokoro import KPipeline

SR = 24000
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
# (text, speed, gap after in s)
LINES = [
    ("Imagine you're the last one leaving the office.", 0.93, 0.35),
    ("It's almost midnight.", 0.92, 0.3),
    ("And behind you, the lights switch off.", 0.92, 0.25),
    ("One row at a time.", 0.88, 0.6),
    ("You call the elevator, step inside, and press the ground floor.", 0.95, 0.35),
    ("The doors close. The numbers count down.", 0.94, 0.3),
    ("Three.", 0.9, 0.35),
    ("Two.", 0.9, 0.35),
    ("One.", 0.9, 0.35),
    ("Ground.", 0.9, 0.6),
    ("And it keeps going.", 0.86, 0.7),
    ("You press the button again. Nothing.", 0.95, 0.4),
    ("Your phone? Two percent. No signal.", 0.95, 0.4),
    ("The emergency button just rings, and rings.", 0.94, 0.25),
    ("And nobody answers.", 0.88, 0.6),
    ("Then the panel changes.", 0.94, 0.3),
    ("Below the ground floor, new buttons light up.", 0.95, 0.3),
    ("Zero. Minus one. All the way down to minus seven.", 0.92, 0.5),
    ("Then, with a jolt, the elevator stops.", 0.93, 0.35),
    ("Floor zero.", 0.86, 0.6),
    ("That's when you notice a card, taped to the mirror.", 0.95, 0.3),
    ("Night shift. Elevator rules.", 0.9, 0.35),
    ("Rule number one. If the doors open on a floor that isn't on the panel,", 0.94, 0.25),
    ("do not step out.", 0.86, 0.45),
    ("The rest has been scratched off.", 0.93, 0.5),
    ("You laugh. It's probably the cleaners, messing with people.", 0.96, 0.6),
    ("Then, with a soft ding, the doors open.", 0.9, 0.6),
    ("It's your office. The exact same office.", 0.92, 0.4),
    ("But something is wrong.", 0.9, 0.3),
    ("Every chair has been turned to face the elevator.", 0.92, 0.5),
    ("And on your desk, your computer is on.", 0.93, 0.3),
    ("It's typing your name.", 0.86, 0.7),
    ("Then you hear it.", 0.88, 0.4),
    ("Breathing.", 0.84, 0.4),
    ("Right behind you.", 0.84, 0.6),
    ("In the corner stands someone you never saw get in.", 0.92, 0.3),
    ("Facing the wall.", 0.84, 0.6),
    ("And the doors start to close.", 0.9, 0.5),
    ("You have two choices.", 0.92, 0.35),
    ("Step out, into an office that knows your name.", 0.93, 0.35),
    ("Or stay in the elevator, with whoever is facing the wall.", 0.92, 0.5),
    ("So, what would you do?", 0.86, 0.0),
]
LEAD = 0.12  # voice starts on frame ~4
pipe = KPipeline(lang_code="b" if VOICE.startswith("b") else "a")
out, words, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
for li, (text, speed, gap) in enumerate(LINES):
    chunks, toks, off = [], [], 0.0
    for r in pipe(text, voice=VOICE, speed=speed):
        a = r.audio.numpy().astype(np.float32)
        for tk in r.tokens:
            if tk.start_ts is None or not re.search(r"[A-Za-z0-9]", tk.text): continue
            toks.append((tk.text, off + tk.start_ts, off + (tk.end_ts or tk.start_ts + 0.1)))
        chunks.append(a); off += len(a) / SR
    a = np.concatenate(chunks)
    env = np.abs(a) > 0.01
    i0 = max(0, int(np.argmax(env)) - int(0.03 * SR)); i1 = min(len(a), len(a) - int(np.argmax(env[::-1])) + int(0.08 * SR))
    a = a[i0:i1]
    # short fades so trimmed edges never click
    n = int(0.008 * SR); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    for w, s, e in toks:
        words.append({"w": w, "s": round(t + s - i0 / SR, 3), "e": round(t + min(e, i1 / SR) - i0 / SR, 3), "line": li})
    out.append(a); t += len(a) / SR
    out.append(np.zeros(int(gap * SR), np.float32)); t += gap
v = np.concatenate(out)
v = v / max(1e-6, np.abs(v).max()) * 0.89
sf.write("voice.wav", v, SR, subtype="PCM_24")
json.dump(words, open("words.json", "w"), indent=0)
n = len(words)
print(f"{VOICE}: {len(v)/SR:.2f} s, {n} words, {n/(len(v)/SR)*60:.0f} wpm overall")
