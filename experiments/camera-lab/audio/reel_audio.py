# Sound for the camera-lab review reel: per clip the same narration + a light original score (vibes / music box,
# ducked under the voice) + synthesized story SFX, plus each variant's camera whooshes (whip, snap zoom, fly-through,
# wipe, spin). Cards between clips get a soft chime. Events come from out/timeline.json (scripts/dump.ts), already in
# real clip frames, so the speed-ramp variants line up. Output: out/audio/reel.wav (48 kHz stereo) + per-clip wavs.
import json, os, sys
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, place, pan, st, read_wav, write_wav, integrated, true_peak, dbg, norm_to
from sfx_gen import whoosh, push_thump, clink
from instruments import vibes, musicbox, glock, triangle, m2f

ROOT = os.path.join(os.path.dirname(__file__), "..")
TL = json.load(open(os.path.join(ROOT, "out/timeline.json")))
FPS, CLIP = TL["fps"], TL["clip"]
CARD = int(os.environ.get("CARD_FRAMES", "60"))
CL = CLIP / FPS
OUT = os.path.join(ROOT, "out/audio"); os.makedirs(OUT, exist_ok=True)
fs = lambda f: f / FPS

# ---------------- voice ----------------
v, sr = read_wav(os.path.join(ROOT, "voice/voice.wav"))
voice = signal.resample_poly(v[0], SR, sr)
voice = norm_to(voice, -16.0, "integrated")
vbuf = np.zeros(ns(CL)); vbuf[: min(len(voice), len(vbuf))] = voice[: len(vbuf)]
# voice activity envelope for ducking
env = np.abs(vbuf); k = ns(0.05); env = np.convolve(env, np.ones(k) / k, "same"); act = np.clip(env / (env.max() * 0.08), 0, 1)
act = np.convolve(act, np.ones(ns(0.15)) / ns(0.15), "same")

# ---------------- score: 14 s, 120 bpm, C major, light and bouncy ----------------
def score():
    r = rng(7); buf = np.zeros((2, ns(CL + 1)))
    beat = 0.5
    chords = [[48, 55, 64], [45, 52, 60], [41, 53, 57], [43, 50, 59]]  # C  Am  F  G
    mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 74, 71]
    nb = int(CL / beat) + 1
    for b in range(nb):
        t = b * beat; ch = chords[(b // 4) % 4]
        if b % 2 == 0:
            for i, m in enumerate(ch): place(buf, pan(vibes(m2f(m + 12), 0.32, r, dur=1.4, damp=0.9), -0.3 + 0.3 * i), t + 0.004 * i)
        place(buf, pan(vibes(m2f(ch[0] - 12), 0.5, r, dur=0.9, damp=0.45), 0.0), t)          # bass on every beat
        if b % 2 == 1: place(buf, pan(musicbox(m2f(mel[(b // 2) % 16]), 0.45, r, dur=1.0), 0.25), t)
        if b % 4 == 3: place(buf, pan(musicbox(m2f(mel[(b // 2 + 3) % 16] + 12), 0.22, r, dur=0.8), -0.3), t + beat / 2)
    return buf[:, : ns(CL)]
mus = score()
mus = norm_to(mus, -27.0, "integrated")
duck = 1 - 0.55 * act
mus = mus * duck[None, :]

# ---------------- sfx ----------------
def mixm(*xs):
    n = max(len(x) for x in xs); y = np.zeros(n)
    for x in xs: y[: len(x)] += x
    return y
def splat(r):
    t = tt(0.5)
    thud = lp(r.standard_normal(len(t)), 260, 2) * np.exp(-t / 0.05) * 1.6
    squelch = bp(r.standard_normal(len(t)), 500, 2500, 2) * np.exp(-t / 0.09) * (1 + 0.6 * np.sin(2 * np.pi * 38 * t)) * 0.5
    return fades(thud + squelch, 0.001, 0.08)
def scrape(r, d=0.35):
    t = tt(d); y = bp(colored(len(t), r, 0.3), 1200, 5200, 2) * np.sin(np.pi * t / d) ** 2 * 0.35
    return fades(y, 0.005, 0.05)
def zip_(r):
    t = tt(0.2); f = 600 + 3000 * (t / 0.2) ** 1.5
    y = bp(r.standard_normal(len(t)), 500, 7000, 2) * np.sin(np.pi * t / 0.2) ** 2 * 0.5 + 0.12 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.2)
    return fades(y, 0.002, 0.03)
def cheer(r):
    from sfx_gen import hurrah
    return hurrah(r, 300.0, 1.25, kid=True) * 0.6

def clip_sfx(V):
    r = rng(V["n"] * 13 + 1); buf = np.zeros((2, ns(CL + 1))); e = V["ev"]
    place(buf, pan(mixm(push_thump(r) * 0.5, clink(r, 2600) * 0.5), 0.3), fs(e["ruler"]))
    for i in range(6): place(buf, pan(clink(r, 3400 + 120 * i, 0.06, 0.6) * 0.18, 0.3), fs(e["mark"] + i * 2.4))
    place(buf, pan(scrape(r), 0.25), fs(e["nudge"] + 2))
    slow = any(a <= e["half"] <= b for a, b in V["slow"])
    fd = max(0.3, fs(e["splat"] - e["fall0"]))
    w = whoosh(fd + 0.1, r, peak=fd * 0.85, f_lo=200 if slow else 300, f_hi=900 if slow else 1500, tail=0.08) * 0.45
    place(buf, pan(w, 0.3), fs(e["fall0"]))
    place(buf, pan(splat(r), 0.25), fs(e["splat"]))
    place(buf, pan(mixm(push_thump(r) * 0.5, clink(r, 2300) * 0.5), 0.35), fs(e["gruler"]))
    gd = max(0.3, fs(e["gland"] - e["gfall0"]))
    place(buf, pan(whoosh(gd + 0.1, r, peak=gd * 0.85, f_lo=200 if V["slow"] else 300, f_hi=1100, tail=0.08) * 0.4, 0.4), fs(e["gfall0"]))
    place(buf, pan(push_thump(r) * 0.6, 0.4), fs(e["gland"]))
    place(buf, pan(triangle(0.6, r), 0.4), fs(e["gland"] + 1))
    place(buf, pan(cheer(r), -0.1), fs(e["gland"] + 4))
    for f, kind in V["sfx"]:
        if kind == "whoosh": place(buf, pan(whoosh(0.45, r, peak=0.2, f_lo=300, f_hi=2600, tail=0.12) * 0.9, 0.0), fs(f) - 0.05)
        elif kind == "swish": place(buf, pan(whoosh(0.3, r, peak=0.14, f_lo=900, f_hi=4200, tail=0.07) * 0.7, 0.0), fs(f) - 0.03)
        elif kind == "zip": place(buf, pan(zip_(r), 0.0), fs(f) - 0.02)
    return buf[:, : ns(CL)]

def chime(i):
    r = rng(100 + i); buf = np.zeros((2, ns(CARD / FPS)))
    place(buf, pan(glock(m2f(84), 0.5, r, dur=1.0), -0.2), 0.02); place(buf, pan(glock(m2f(91), 0.35, r, dur=1.0), 0.2), 0.12)
    return buf

# ---------------- assemble ----------------
sfx_level = None
parts = []
for i, V in enumerate(TL["variants"]):
    sx = clip_sfx(V)
    if sfx_level is None: sfx_level = dbg(-19.0 - (20 * np.log10(np.abs(sx).max() + 1e-9)))  # same gain for every clip
    clip = st(vbuf) + mus + sx * sfx_level
    write_wav(os.path.join(OUT, f"clip_{V['n']:02d}.wav"), clip * 0.7)
    parts += [chime(i) * 0.25, clip]
reel = np.concatenate(parts, axis=1)
def limit(x, ceil_db=-1.5, look=0.004, rel=0.06):
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(np.abs(x).max(axis=0), size=ns(look) * 2 + 1)
    g = np.minimum(1.0, dbg(ceil_db) / np.maximum(pk, 1e-9))
    a = np.exp(-1.0 / (rel * SR)); out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):  # instant attack (the max filter looks ahead), smooth release
        cur = g[i] if g[i] < cur else a * cur + (1 - a) * g[i]; out[i] = cur
    return x * out[None, :]
for _ in range(3):
    reel = norm_to(reel, -14.0, "integrated"); reel = limit(reel)
tp = true_peak(reel)
if tp > -1.0: reel = reel * dbg(-1.0 - tp)
write_wav(os.path.join(OUT, "reel.wav"), reel)
print(f"reel {reel.shape[1] / SR:.2f} s, {integrated(reel):.1f} LUFS, peak {true_peak(reel):.1f} dBTP")
