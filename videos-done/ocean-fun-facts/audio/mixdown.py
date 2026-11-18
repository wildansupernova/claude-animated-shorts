"""Final mix for a short: voice (unchanged) + procedural score (ducked under words) + SFX events + ambience beds.
usage: tts-venv/bin/python audio/mixdown.py videos/<name>
reads  videos/<name>/voice/voice.wav, voice/words.json, cues.py (DURATION, SECTIONS, BPM, EVENTS, BEDS)
writes videos/<name>/mix.wav (48 kHz stereo 24-bit, -14 LUFS integrated, <= -1 dBTP) + mix_report.txt"""
import os
import sys
import json
import importlib.util
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, ns, dbg, st, place, read_wav, write_wav, integrated, true_peak, lp  # noqa: E402
import fxlib  # noqa: E402
import score  # noqa: E402

vdir = sys.argv[1]
spec = importlib.util.spec_from_file_location("cues", os.path.join(vdir, "cues.py"))
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)

DUR = C.DURATION
N = ns(DUR)

# ---- voice (24 kHz mono -> 48 kHz)
import soundfile as sf  # noqa: E402
vx, vsr = sf.read(os.path.join(vdir, "voice", "voice.wav"))
if vx.ndim > 1:
    vx = vx.mean(axis=1)
vx = signal.resample_poly(vx, SR // 1000, vsr // 1000) if vsr != SR else vx
voice = np.zeros(N)
voice[:min(N, len(vx))] = vx[:N]
voice_st = st(voice)

# ---- music, ducked by the word timeline (attack 60 ms, release 250 ms)
words = json.load(open(os.path.join(vdir, "voice", "words.json")))
music = score.render(DUR, C.SECTIONS, bpm=getattr(C, "BPM", 104), seed=getattr(C, "SEED", 7), key_shift=getattr(C, "KEY", 0))
gate = np.zeros(N)
for w in words:
    a, b = ns(max(0, w["s"] - 0.05)), ns(min(DUR, w["e"] + 0.12))
    gate[a:b] = 1.0
k = ns(0.25)
from scipy.ndimage import uniform_filter1d as _uf  # noqa: E402
duck = _uf(gate, size=k)
duck_db = -getattr(C, "DUCK_DB", 5.0) * np.clip(duck, 0, 1)
music = music[:, :N] * dbg(duck_db)[None, :]
# section level rides (t0, t1, dB)
for t0, t1, db in getattr(C, "RIDES", []):
    a, b = ns(t0), ns(t1)
    music[:, a:b] *= dbg(db)

# ---- SFX events: (time_s, generator, kwargs, gain_db, pan)
sfx = np.zeros((2, N))
for ev in C.EVENTS:
    t, name = ev[0], ev[1]
    kw = ev[2] if len(ev) > 2 else {}
    gdb = ev[3] if len(ev) > 3 else 0.0
    p = ev[4] if len(ev) > 4 else 0.0
    x = fxlib.GEN[name](**kw)
    x = st(x) if x.ndim == 1 else x
    if x.ndim == 2 and p:
        L, R = x
        th = (p + 1) * np.pi / 4
        x = np.stack([L * np.cos(th) * np.sqrt(2), R * np.sin(th) * np.sqrt(2)])
    place(sfx, x / (np.abs(x).max() + 1e-9) * 0.5, t, dbg(gdb))
# beds: (t0, t1, generator, kwargs, gain_db)
beds = np.zeros((2, N))
for t0, t1, name, kw, gdb in getattr(C, "BEDS", []):
    d = t1 - t0
    x = fxlib.GEN[name](dur=d + 0.1, **kw)
    x = st(x)
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.05
    fl = min(ns(0.25), x.shape[1] // 3)
    ramp = np.ones(x.shape[1]); ramp[:fl] = np.linspace(0, 1, fl); ramp[-fl:] = np.linspace(1, 0, fl)
    place(beds, x * ramp[None, :], t0, dbg(gdb))

# ---- levels relative to the voice
Lv = integrated(voice_st)
def to_rel(x, rel):
    L = integrated(x)
    return x * dbg(Lv + rel - L) if np.isfinite(L) else x
music = to_rel(music, getattr(C, "MUSIC_REL", -13.0))
sfx = to_rel(sfx, getattr(C, "SFX_REL", -9.0))
beds = to_rel(beds, getattr(C, "BED_REL", -20.0))
mix = voice_st + music + sfx + beds

# ---- master: loudness to -14 LUFS, simple look-ahead peak limiter to -1 dBTP
mix *= dbg(-14.0 - integrated(mix))
ceil = dbg(-1.3)
env = np.abs(mix).max(axis=0)
la = ns(0.004)
# windowed max over the look-ahead
from scipy.ndimage import maximum_filter1d, uniform_filter1d  # noqa: E402
pk = maximum_filter1d(env, size=2 * la + 1)
gain = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
gain = uniform_filter1d(gain, size=la)  # smooth
gain = np.minimum(gain, ceil / np.maximum(pk, 1e-9) * 1.02)
mix *= gain[None, :]
mix *= dbg(-14.0 - integrated(mix))
mix = np.clip(mix, -dbg(-1.0), dbg(-1.0))
write_wav(os.path.join(vdir, "mix.wav"), mix)
rep = f"duration {DUR:.3f}s  integrated {integrated(mix):.2f} LUFS  true peak {true_peak(mix):.2f} dBTP  voice {integrated(voice_st):.1f}  music {integrated(music):.1f}  sfx {integrated(sfx):.1f}"
open(os.path.join(vdir, "mix_report.txt"), "w").write(rep + "\n")
print(rep)
