# one steady narrator voice (Kokoro am_michael), sentence by sentence with fixed gaps -> voice.wav (24 kHz mono)
import re, sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("/home/user/tts/kokoro-v1.0.onnx", "/home/user/tts/voices-v1.0.bin")
lines = [re.sub(r"^\d+\.\s*", "", l).strip() for l in open("/home/user/forest-short/SCRIPT.md") if re.match(r"^\d+\. ", l)]
voice = sys.argv[1] if len(sys.argv) > 1 else "am_michael"
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
GAP = {0: 0.45, 1: 0.3, 3: 0.4, 6: 0.32, 9: 0.32}  # after line i (default 0.24 s)
out, segs, t = [], [], 0.25
out.append(np.zeros(int(0.25 * 24000), np.float32))
for i, line in enumerate(lines):
    a, sr = k.create(line, voice=voice, speed=speed, lang="en-us")
    a = a.astype(np.float32)
    # trim leading/trailing near-silence so the gaps are what we set
    th = 0.01 * np.abs(a).max(); idx = np.where(np.abs(a) > th)[0]
    a = a[max(0, idx[0] - 240): idx[-1] + 1200]
    segs.append({"i": i, "text": line, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    out.append(a); t += len(a) / sr
    g = GAP.get(i, 0.24); out.append(np.zeros(int(g * sr), np.float32)); t += g
y = np.concatenate(out); y = 0.89 * y / np.abs(y).max()
sf.write("/home/user/forest-short/voice/voice.wav", y, 24000)
json.dump(segs, open("/home/user/forest-short/voice/lines.json", "w"), indent=1)
print("duration", round(len(y) / 24000, 2))
