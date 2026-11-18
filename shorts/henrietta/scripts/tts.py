# usage: python tts.py <script.md> <voice> <speed> <out_prefix>   -> <out>.wav (24 kHz) + <out>_words.json (Kokoro token times)
import sys, json, re, numpy as np, soundfile as sf
from kokoro import KPipeline
src, voice, speed, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
text = open(src).read()
if "## Script" in text: text = text.split("## Script", 1)[1]
lines = [l.strip() for l in text.strip().splitlines() if l.strip() and not l.startswith("#")]
# pronunciation overrides for the TTS only (captions keep the script spelling), e.g. PRON="Gey's=Guy's"
import os
for pair in filter(None, os.environ.get("PRON", "").split(";")):
    k, v = pair.split("="); lines = [l.replace(k, v) for l in lines]
pipe = KPipeline(lang_code=voice[0])
SR = 24000
audio, words, t = [], [], 0.0
GAP = float(sys.argv[5]) if len(sys.argv) > 5 else 0.12
for li, line in enumerate(lines):
    for r in pipe(line, voice=voice, speed=speed, split_pattern=None):
        a = r.audio.numpy() if hasattr(r.audio, "numpy") else np.asarray(r.audio)
        # trim leading/trailing silence of each chunk
        thr = 0.01 * np.abs(a).max(); nz = np.nonzero(np.abs(a) > thr)[0]
        s0, s1 = max(0, nz[0] - int(0.03 * SR)), min(len(a), nz[-1] + int(0.06 * SR))
        for tk in (r.tokens or []):
            if tk.start_ts is None: continue
            w = re.sub(r"[^\w'\-]", "", tk.text)
            if not w: continue
            words.append({"w": w, "s": round(t + tk.start_ts - s0 / SR, 3), "e": round(t + tk.end_ts - s0 / SR, 3), "line": li})
        audio.append(a[s0:s1]); t += (s1 - s0) / SR
        audio.append(np.zeros(int(GAP * SR), dtype=np.float32)); t += GAP
y = np.concatenate(audio)
sf.write(out + ".wav", y, SR)
json.dump(words, open(out + "_words.json", "w"), indent=0)
n = len(words); print(f"{out}: {len(y)/SR:.2f}s, {n} words, {n/(len(y)/SR):.2f} w/s")
