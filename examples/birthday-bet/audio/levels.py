# Objective level check of the stems (we cannot listen in this container): momentary loudness (400 ms) of voice /
# music / sfx every 100 ms, then the loudest SFX and music moments relative to the voice's median speech level, and
# any moment where an SFX or the music is within 3 LU of the voice WHILE a word is being spoken (masking risk).
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "templates", "audio"))
from dsp import read_wav, kfilt, SR, ns
D = "out/audio"
W = json.load(open("voice/words.json"))
def mom(x):
    y = kfilt(x)
    p = (y ** 2).sum(0)
    c = np.cumsum(np.concatenate([[0], p]))
    win, hop = ns(0.4), ns(0.1)
    idx = np.arange(0, len(p) - win, hop)
    m = (c[idx + win] - c[idx]) / win
    return idx / SR + 0.2, -0.691 + 10 * np.log10(m + 1e-12)
st = {k: read_wav(f"{D}/stem_{k}.wav")[0] for k in ("voice", "music", "sfx")}
t, v = mom(st["voice"]); _, m = mom(st["music"]); _, s = mom(st["sfx"])
speaking = np.zeros_like(t, bool)
for w in W: speaking |= (t >= w["s"]) & (t <= w["e"])
vmed = np.median(v[speaking])
print(f"voice median while speaking {vmed:.1f} LUFS(M); music median {np.median(m[m > -60]):.1f}; sfx median {np.median(s[s > -60]):.1f}")
order = np.argsort(-s)
seen = []
print("loudest SFX moments (rel. voice median):")
for i in order:
    if any(abs(t[i] - u) < 0.6 for u in seen): continue
    seen.append(t[i]); print(f"  {t[i]:6.2f}s f{round(t[i]*30):4d}  sfx {s[i]-vmed:+5.1f} LU  {'(during speech)' if speaking[i] else ''}")
    if len(seen) >= 12: break
bad = [(t[i], s[i] - v[i], m[i] - v[i]) for i in range(len(t)) if speaking[i] and (s[i] > v[i] - 3 or m[i] > v[i] - 3)]
print(f"masking risk windows (sfx or music within 3 LU of voice during speech): {len(bad)}")
for b in bad[:15]: print(f"  {b[0]:6.2f}s  sfx-voice {b[1]:+5.1f}  music-voice {b[2]:+5.1f}")
