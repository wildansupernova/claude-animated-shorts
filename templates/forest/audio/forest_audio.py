# Sound for "The Forest Snitch": original sneaky pizzicato score (ducked under the voice) + synthesized SFX timed to
# the picture (story.ts frames) + the narration. Writes mix.wav (48 kHz stereo 24-bit, exact length) and stems.
# Run with the venv python:  python -I forest_audio.py
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, ns, tt, rng, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

FPS = 30
TOTAL = 1890
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
WORDS = json.load(open("/home/user/forest-short/voice/words.json"))
# v2 timeline (mirrors story.ts): shots, camera cuts, glides, impact kicks
SHOTS = [(1, 0, 120, "forest"), (2, 120, 259, "forest"), (3, 259, 356, "forest"), (4, 356, 560, "forest"), (5, 560, 729, "forest"),
         (6, 729, 950, "forest"), (7, 950, 1105, "lawn"), (8, 1105, 1323, "forest"), (9, 1323, 1516, "forest"), (10, 1516, 1712, "forest"),
         (11, 1712, TOTAL, "forest")]
CUTS = [37, 60, 211, 282, 298, 328, 403, 500, 665, 803, 859, 898, 996, 1044, 1161, 1251, 1469, 1590, 1674, 1808, 1840]
GLIDES = [(176, 22), (1290, 18)]
KICKS = [(95, 0.9), (235, 0.6), (318, 0.4), (469, 0.5), (527, 0.7), (650, 0.4), (754, 0.8), (771, 0.9), (910, 0.7), (1140, 0.5),
         (1301, 0.8), (1500, 0.8), (1688, 0.6), (1818, 0.7)]
POP0 = 1126  # first mushroom pop (frame) in shot 8; pop i at POP0 + 2.6 i

R = rng(2026)
def buf(): return np.zeros((2, N))

# ================================================================ small synth helpers
def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)

def sweep(f0, f1, dur, kind="sine", curve=1.0):
    n = ns(dur); t = np.arange(n) / SR
    u = (t / dur) ** curve
    f = f0 * (f1 / f0) ** u
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "sine": return np.sin(ph)
    return np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.18 * np.sin(3 * ph)

def pop_snd(r, f0=900):
    d = 0.12; t = tt(d)
    y = np.sin(2 * np.pi * np.cumsum(f0 * (0.45 + 0.55 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.035)
    y += 0.3 * hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.004)
    return fades(y * 0.8, 0.001, 0.01)

def thud(r, f=70, d=0.45, g=1.0):
    t = tt(d)
    y = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * np.exp(-t / 0.03))) / SR) * np.exp(-t / 0.09)
    y += 0.5 * lp(r.standard_normal(len(t)), 400) * np.exp(-t / 0.03)
    return fades(g * y, 0.001, 0.02)

def dig(r):
    d = 0.42; t = tt(d)
    chuff = bp(r.standard_normal(len(t)), 300, 2400) * np.exp(-t / 0.05) * 0.9
    grit = hp(r.standard_normal(len(t)), 1800) * (r.random(len(t)) < 0.015) * np.exp(-t / 0.18) * 2.0
    clank = 0.25 * np.sin(2 * np.pi * 1450 * t) * np.exp(-t / 0.03)
    return fades(chuff + grit + clank + 0.5 * thud(r, 85, d, 0.6), 0.001, 0.02)

def sprinkle(r, dur=0.6, dens=0.02):
    n = ns(dur); y = np.zeros(n)
    hits = np.where(r.random(n) < dens / 40)[0]
    for h in hits:
        k = min(n - h, 400); y[h:h + k] += r.uniform(0.2, 1) * np.exp(-np.arange(k) / 60) * r.standard_normal(k)
    return fades(bp(y, 800, 6000) * np.hanning(n) ** 0.3, 0.005, 0.05)

def rumble(r, dur, f=45):
    n = ns(dur); t = np.arange(n) / SR
    y = lp(colored(n, r, 1.0), 180) * (0.6 + 0.4 * smooth_noise(n, r, 3))
    y += 0.4 * np.sin(2 * np.pi * f * t) * smooth_noise(n, r, 1.5)
    return fades(y * np.sin(np.pi * np.arange(n) / n) ** 0.7, 0.05, 0.2)

def creak(r, dur):
    n = ns(dur); t = np.arange(n) / SR
    rate = 30 + 20 * smooth_noise(n, r, 2)
    imp = (np.sin(2 * np.pi * np.cumsum(rate) / SR) > 0.97).astype(float)
    from dsp import resbank
    y = resbank(imp, [(180, 9, 1.0), (420, 12, 0.7), (950, 14, 0.4)])
    return fades(y * np.sin(np.pi * t / dur), 0.02, 0.1)

def sizzle(r, dur):
    n = ns(dur)
    y = hp(r.standard_normal(n), 3500) * (0.5 + 0.5 * (r.random(n) < 0.05)) * np.sin(np.pi * np.arange(n) / n)
    return fades(0.4 * y, 0.02, 0.1)

def chime(r, notes, step=0.07, vel=0.6):
    out = np.zeros(ns(len(notes) * step + 1.6))
    for i, m in enumerate(notes):
        g = I.glock(I.m2f(m), vel, r, 1.5); a = ns(i * step); out[a:a + len(g)] += g
    return out

def drone_buzz(r, dur, f=190):
    n = ns(dur); t = np.arange(n) / SR
    wob = 1 + 0.02 * smooth_noise(n, r, 4)
    ph = 2 * np.pi * np.cumsum(f * wob) / SR
    y = sum(np.sin(k * ph + k) / k ** 0.9 for k in range(1, 12))
    y = bp(y, 150, 5000) + 0.25 * hp(r.standard_normal(n), 3000)
    return 0.25 * y

def tinkle(r, dur):
    return G.bubbles(dur, r, 26, 1500, 4200, (0.004, 0.012))

# ================================================================ SFX stem
def sfx():
    out = buf()
    r = R
    # ambience: forest birds + breeze; the lawn gets sparrows
    for (sid, a, b, kind) in SHOTS:
        d = F(b - a) + 0.3
        place(out, widen(G.bird_chirps(d, r, 0.55 if kind == "forest" else 0.4, "blackbird" if sid % 2 else "sparrow"), r), F(a), 0.55)
        place(out, G.breeze(d, r, 0.8), F(a), 0.45)
    # whooshes on cuts and glides, flash swell into "Meet Gary"
    for c in CUTS: place(out, pan(G.whoosh(0.45, r, 0.35, 400, 2600), r.uniform(-0.4, 0.4)), F(c) - 0.22, 0.32)
    for g, d in GLIDES: place(out, widen(G.whoosh(F(d) + 0.2, r, 0.5), r), F(g) - 0.05, 0.3)
    place(out, widen(G.whoosh(0.9, r, 0.75, 500, 4000), r), F(120) - 0.7, 0.55)
    place(out, I.cymbal(0.35, r, 1.6), F(120), 0.25)
    for f, g in KICKS: place(out, thud(r, 60, 0.4, 0.9 * g), F(f), 0.7)
    # hook: low sting on "grass"
    place(out, I.timpani(I.m2f(38), 0.9, r, 1.6), F(95), 0.5); place(out, I.brass(I.m2f(50), 0.8, 0.7, r, "tuba"), F(95), 0.2)
    # the rug is wearing shoes: a comedy slide-whistle up + plonk
    place(out, sweep(500, 1400, 0.28) * env_ad(ns(0.28), 0.02, 0.2) * 0.16, F(229))
    place(out, pop_snd(r, 330), F(236), 0.6)
    # burial: three shovel strokes, the rug rolls and thumps in, the soil goes back, pats, footsteps away
    for f0 in (262.4, 270.1, 277.8):
        place(out, dig(r), F(f0), 0.8); place(out, pan(sprinkle(r, 0.5), -0.3), F(f0 + 2.5), 0.5)
    place(out, rumble(r, 0.55, 55) * 0.5, F(282)); place(out, thud(r, 52, 0.6, 1.2), F(296)); place(out, sprinkle(r, 0.4, 0.04), F(296), 0.4)
    place(out, lp(colored(ns(1.0), r, 0.4), 2500) * 0.2 * np.hanning(ns(1.0)), F(299))
    for f0 in (304, 312, 320): place(out, thud(r, 110, 0.2, 0.5) + 0.3 * dig(r)[: ns(0.2)], F(f0), 0.6)
    for k in range(4): place(out, pan(G.stroll_step(r, 0.6), 0.2), F(330) + 0.31 * k, 0.4)
    # luckily: bush rustle; unluckily: record-stop zip; "three ways": three rising ticks; "the creepiest": dread swell
    place(out, bp(colored(ns(0.6), r, 0.2), 1200, 6000) * np.hanning(ns(0.6)) * 0.25, F(358))
    place(out, sweep(900, 120, 0.35, "saw", 0.6) * env_ad(ns(0.35), 0.005, 0.25) * 0.2, F(403))
    for k, m in enumerate([84, 88, 91]): place(out, I.glock(I.m2f(m), 0.55, r, 0.9), F(469) + 0.17 * k, 0.4)
    place(out, widen(rumble(r, 1.5, 38), r), F(500), 0.7); place(out, I.timpani(I.m2f(37), 1.0, r, 2.0), F(527), 0.55)
    # snitch 1: clock ticks (weeks later), wilt slide + sizzle on "brown"
    for k in range(6): place(out, pan(G.clink(r, 2600, 0.05, 0.5), 0.3 * (-1) ** k), F(612) + 0.18 * k, 0.12)
    place(out, sweep(700, 260, 0.9, "saw", 0.8) * env_ad(ns(0.9), 0.05, 0.5) * 0.18, F(636)); place(out, sizzle(r, 0.7), F(640), 0.4)
    # greener: rising slide + rustle, chimes on the two steps
    place(out, sweep(250, 900, 0.8, "saw", 1.2) * env_ad(ns(0.8), 0.35, 0.3) * 0.15, F(731))
    place(out, bp(colored(ns(0.9), r, 0.2), 1500, 7000) * np.hanning(ns(0.9)) * 0.25, F(731))
    place(out, widen(chime(r, [76, 79, 83, 88], 0.05), r), F(754), 0.4); place(out, widen(chime(r, [79, 83, 86, 91, 95], 0.045, 0.75), r), F(771), 0.45)
    # why: dig strokes (flashback), the sack pops in on "bag"
    for k in range(6): place(out, dig(r), F(806.5 + 9 * k), 0.55)
    place(out, pop_snd(r, 420), F(908), 0.7); place(out, thud(r, 90, 0.3, 0.7), F(912), 0.6); place(out, widen(chime(r, [84, 88], 0.06), r), F(914), 0.25)
    # dog: collar jingle, tinkle, sizzle on "burns", regrow slide, sparkle on "extra green"
    for k in range(3): place(out, G.clink(r, 3800 + 300 * k, 0.08, 0.4), F(952 + 4 * k), 0.15)
    place(out, tinkle(r, 0.7), F(988), 0.2); place(out, sizzle(r, 0.9), F(998), 0.45)
    place(out, sweep(250, 1000, 0.7, "saw", 1.2) * env_ad(ns(0.7), 0.3, 0.3) * 0.13, F(1046)); place(out, widen(chime(r, [79, 84, 88], 0.05), r), F(1069), 0.35)
    # snitch 2: mushroom pops, the corpse finder's eyes turn (zip), "dun-dun" on "corpse finder"
    for i in range(17): place(out, pan(pop_snd(r, 700 + 60 * (i % 5)), 0.4 * np.sin(i * 1.3)), F(POP0 + 2.6 * i) + 0.01, 0.55)
    place(out, pop_snd(r, 520), F(POP0 + 26), 0.6)
    place(out, sweep(1600, 700, 0.1) * env_ad(ns(0.1), 0.003, 0.04) * 0.2, F(1272))
    for m, d in [(38, 0.0), (37, 0.24)]: place(out, I.timpani(I.m2f(m), 0.9, r, 1.6), F(1294) + d, 0.5)
    place(out, I.brass(I.m2f(50), 0.9, 0.7, r, "tuba"), F(1294), 0.25)
    # snitch 3: the ground sinks (rumble + creak + trickling soil), settle on "grave"
    place(out, widen(rumble(r, 2.0, 40), r), F(1446), 0.8); place(out, creak(r, 1.2), F(1452), 0.25); place(out, sprinkle(r, 1.0, 0.03), F(1458), 0.3)
    place(out, I.timpani(I.m2f(36), 1.0, r, 2.0), F(1500), 0.5)
    # search team footsteps, drone buzz, scan blip
    for k in range(6): place(out, pan(G.stroll_step(r, 0.7), 0.3 * np.sin(k)), F(1516) + 0.33 * k + 0.1, 0.35)
    d = drone_buzz(r, F(1712 - 1586))
    n = d.shape[-1]; e = np.minimum(1, np.arange(n) / ns(0.8)) * (0.6 + 0.4 * np.sin(np.pi * np.arange(n) / n))
    place(out, widen(d * e, r), F(1586), 0.4)
    place(out, sweep(1200, 2400, 0.15) * env_ad(ns(0.15), 0.005, 0.06) * 0.12, F(1680))
    # picnic: the mushroom pushes up through the blanket, uh-oh
    place(out, pop_snd(r, 600), F(1816), 0.8); place(out, widen(chime(r, [72, 71], 0.12, 0.7), r), F(1820), 0.3)
    return out

# ================================================================ music: original sneaky pizzicato (D minor, 120 bpm)
BEAT = 0.5
def music():
    out = buf(); r = rng(7)
    def note(fn, m, t, vel, dur=0.6, p=0.0, g=1.0):
        if t < 0 or t >= DUR: return
        x = fn(I.m2f(m), vel, r, dur) if fn is not I.pluck else I.pluck(I.m2f(m), vel, r, dur, 0.55)
        place(out, pan(x, p), t, g)
    MIN = {"Dm": [38, 45, 50, 53, 57], "Gm": [43, 50, 55, 58, 62], "A": [45, 52, 57, 61, 64], "Bb": [46, 53, 58, 62, 65]}
    MAJ = {"D": [38, 45, 50, 54, 57], "G": [43, 50, 55, 59, 62], "A": [45, 52, 57, 61, 64], "Bm": [47, 54, 59, 62, 66]}
    sneaky = ["Dm", "Dm", "Gm", "A"]
    MOTIF = [(0, 62), (1, 65), (1.5, 64), (2, 62), (3, 69), (4, 68), (4.5, 69), (5, 70), (6, 69), (7, 65)]
    def bass_bar(t0, ch, vel=0.7, walk=True, table=MIN):
        c = table[ch]
        for k, m in enumerate([c[0], c[1], c[0] + 12 if walk else c[0], c[1]]): note(I.pluck, m - 12 if m > 50 else m, t0 + k * BEAT, vel * (1 if k % 2 == 0 else 0.75), 0.45, -0.15)
    def stabs(t0, ch, vel=0.35, table=MIN):
        for k in (0.5, 2.5):
            for m in table[ch][2:]: note(I.pluck, m, t0 + k * BEAT, vel, 0.25, 0.25)
    def motif(t0, vel=0.55, tr=0, fn=I.pluck, gain=1.0, upto=99):
        for b, m in MOTIF:
            if b < upto: note(fn, m + tr, t0 + b * BEAT, vel, 0.5, 0.1, gain)
    def brushes(t0, bars, vel=0.25):
        for k in range(int(bars * 4)):
            place(out, pan(I.brush(vel * (1.0 if k % 2 else 0.6), r, 0.3, k % 4 == 3), 0.3), t0 + k * BEAT)
    def groove(t0, chords, vel=0.7, table=MIN, st=0.35, br=0.25):
        for b, ch in enumerate(chords): bass_bar(t0 + 2 * b, ch, vel, True, table); stabs(t0 + 2 * b, ch, st, table)
        brushes(t0, len(chords), br)
    # hook: low pulse + vibes motif
    for b in range(2): bass_bar(b * 2, "Dm", 0.55, False)
    motif(0.0, 0.45, 0, I.vibes, 0.8)
    # meet Gary + the burial: sneaky groove; a stop-plonk on "shoes"
    groove(F(120), ["Dm", "Dm"]); motif(F(120) + 0.4, 0.5, 0, I.pluck, 1.0, 7)
    for m in (50, 57): note(I.pluck, m, F(236), 0.8, 0.6)
    groove(F(259), ["Gm", "A"]); 
    # luckily: relaxed; unluckily: stop + low tension; "three ways" + "creepiest": dread
    bass_bar(F(356), "Dm", 0.5, False); motif(F(358), 0.4, 0, I.vibes, 0.7, 6)
    place(out, I.pad([I.m2f(m) for m in [38, 44, 50, 53]], 4.9, 0.5, r, 0.2, 0.8, 600), F(403))
    for k in range(8): note(I.pluck, 38, F(405) + 0.5 * k, 0.55, 0.4)
    for k in range(9): place(out, I.timpani(I.m2f(38), 0.22 + 0.04 * k, r, 0.6), F(500) + 0.1 + 0.1 * k, 0.6)
    # snitch 1: music box (sad, descending) over the brown
    for k, m in enumerate([74, 72, 70, 69, 67, 65, 64, 62, 65, 64]): note(I.musicbox, m, F(562) + 0.5 * k, 0.45, 1.2)
    # greener: D major bounce + glock; why: curious vibes over a soft pulse
    groove(F(729), ["D", "G"], 0.7, MAJ, 0.35, 0.3)
    for k, m in enumerate([74, 76, 78, 81, 78, 81, 83, 86]): note(I.glock, m, F(735) + 0.25 * k, 0.4, 1.0)
    for b, ch in enumerate(["Dm", "Bb", "A"]): bass_bar(F(803) + 2 * b, ch, 0.45, False); stabs(F(803) + 2 * b, ch, 0.25)
    motif(F(803) + 1, 0.4, 12, I.vibes, 0.7)
    # dog: playful major
    groove(F(950), ["D", "Bm", "G"], 0.65, MAJ, 0.3, 0.3)
    for k, m in enumerate([69, 74, 78, 76, 74, 71, 74, 69]): note(I.glock, m, F(1046) + 0.25 * k, 0.35, 0.9)
    # snitch 2: pizz pops follow the mushrooms, sneaky low, stop before the sting
    for i in range(17): note(I.pluck, [62, 65, 69, 74, 72][i % 5] + 12, F(POP0 + 2.6 * i), 0.35, 0.3, 0.3)
    for b in range(3): bass_bar(F(1161) + 2 * b, sneaky[b], 0.55); stabs(F(1161) + 2 * b, sneaky[b], 0.3)
    motif(F(1161) + 0.5, 0.45, -12, I.pluck, 0.9, 7)
    # snitch 3: tension pad + timpani roll into the hit on "grave"
    place(out, I.pad([I.m2f(m) for m in [38, 45, 51, 56]], 6.0, 0.5, r, 0.8, 0.8, 700), F(1323))
    for k in range(16): place(out, I.timpani(I.m2f(38), 0.25 + 0.03 * k, r, 0.6), F(1440) + 0.12 * k, 0.6)
    # search + drone: driving sneaky groove with snare
    T9 = F(1516)
    for b in range(3):
        ch = sneaky[b % 4]; bass_bar(T9 + 2 * b, ch, 0.7); stabs(T9 + 2 * b, ch, 0.35)
        for k in range(8): place(out, pan(I.snare(0.18 + (0.15 if k % 4 == 2 else 0), r, 0.2), -0.2), T9 + 2 * b + 0.25 * k)
    motif(T9 + 1, 0.5, 0, I.pluck, 1.0, 7); motif(F(1590), 0.5, 12, I.glock, 0.6)
    # picnic: sunny major, then the sneaky motif creeps back on "pick a different picnic spot", sly last pluck
    groove(F(1712), ["D", "G"], 0.6, MAJ, 0.3, 0.25)
    for k, m in enumerate([74, 78, 81, 78, 76, 74]): note(I.glock, m, F(1714) + 0.5 * k, 0.35, 1.0)
    bass_bar(F(1816), "Dm", 0.6); motif(F(1816), 0.45, 0, I.pluck, 0.9, 4)
    note(I.pluck, 38, F(1872), 0.8, 0.8); note(I.pluck, 50, F(1872), 0.6, 0.8)
    ir = make_ir(0.9, 3)
    out = out + 0.18 * convolve_st(out, ir)
    return out

# ================================================================ voice + mix
def voice():
    x, sr = read_wav("/home/user/forest-short/voice/voice.wav") if False else (None, None)
    import soundfile as sf
    from scipy import signal
    v, vsr = sf.read("/home/user/forest-short/voice/voice.wav", dtype="float64")
    v = signal.resample_poly(v, 2, 1)  # 24k -> 48k
    v = hp(v, 70)
    v = peq(v, 3000, 2.0, 0.8)  # a touch of presence
    out = np.zeros(N); out[: min(N, len(v))] = v[:N]
    return st(out)

def duck_env():
    """music gain: -6 dB while words are spoken (with 120 ms attack / 300 ms release)"""
    g = np.zeros(N)
    for w in WORDS:
        a, b = ns(w["s"] - 0.05), ns(w["e"] + 0.15)
        g[max(0, a): min(N, b)] = 1
    k = ns(0.25)
    sm = np.convolve(g, np.hanning(k) / np.hanning(k).sum(), mode="same")
    return 10 ** (-3.5 * sm / 20)

def limiter(x, ceil_db=-1.8):
    c = 10 ** (ceil_db / 20)
    peak = np.abs(x).max(axis=0)
    look = ns(0.003)
    need = np.maximum(1, peak / c)
    from scipy import ndimage
    need = ndimage.maximum_filter1d(need, look * 2 + 1)
    g = 1 / need
    g = np.convolve(g, np.ones(look) / look, mode="same")
    return x * np.minimum(1, g)

if __name__ == "__main__":
    V = voice(); print("voice", round(integrated(V), 1))
    M = music(); print("music raw", round(integrated(M), 1))
    S = sfx(); print("sfx raw", round(integrated(S), 1))
    vL = integrated(V)
    M = M * 10 ** ((vL - 11.5 - integrated(M)) / 20)  # bed ~13 LU under the voice before ducking (+3 dB music standard -> -10 after)
    M = M * 10 ** (3.0 / 20)
    M = M * duck_env()
    S = S * 10 ** ((vL - 10.0 - integrated(S)) / 20) * 10 ** (-6.0 / 20) * 2.0
    mix = V + M + S
    g = 10 ** ((-15.0 - integrated(mix)) / 20)
    mix = limiter(mix * g)
    mix = fades(mix, 0.005, 0.6)
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    write_wav(os.path.join(HERE, "out", "mix.wav"), mix)
    for name, x in [("voice", V * g), ("music", M * g), ("sfx", S * g)]: write_wav(os.path.join(HERE, "out", f"stem_{name}.wav"), x)
    print("mix LUFS", round(integrated(mix), 2), "TP", round(true_peak(mix), 2), "dur", mix.shape[1] / SR)
