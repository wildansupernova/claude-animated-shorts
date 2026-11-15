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
TOTAL = 2115
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
WORDS = json.load(open("/home/user/forest-short/voice/words.json"))
SHOTS = [(1, 0, 122, "forest"), (2, 122, 246, "forest"), (3, 246, 440, "forest"), (4, 440, 562, "forest"), (5, 562, 719, "forest"),
         (6, 719, 788, "forest"), (7, 788, 908, "forest"), (8, 908, 1086, "forest"), (9, 1086, 1270, "forest"), (10, 1270, 1505, "lawn"),
         (11, 1505, 1703, "forest"), (12, 1703, 1914, "forest"), (13, 1914, TOTAL, "forest")]
# camera cuts (frames) and glides (frame, dur) from story.ts
CUTS = [64, 85, 100, 214, 293, 318, 354, 413, 525, 642, 770, 854, 988, 1153, 1220, 1341, 1422, 1609, 1797, 1878, 2025, 2062]
GLIDES = [(183, 24), (1668, 18)]
KICKS = [(87, 0.6), (389, 0.5), (416, 0.6), (602, 0.8), (620, 1.0), (746, 0.4), (755, 0.4), (883, 0.8), (1070, 0.8), (1225, 0.7), (1678, 0.8), (1889, 0.6), (2040, 0.7)]
MUSH0 = 744

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
    # ambience: forest birds + breeze in forest shots; golden: crickets; lawn: suburban birds
    for (sid, a, b, kind) in SHOTS:
        d = F(b - a) + 0.3
        if kind == "golden":
            place(out, widen(G.crickets(d, r) * 0.18, r), F(a), 1.0)
            place(out, G.breeze(d, r, 0.6), F(a), 0.5)
        else:
            place(out, widen(G.bird_chirps(d, r, 0.55 if kind == "forest" else 0.4, "blackbird" if sid % 2 else "sparrow"), r), F(a), 0.55)
            place(out, G.breeze(d, r, 0.8), F(a), 0.45)
    # whooshes on cuts and glides, flash swell
    for c in CUTS: place(out, pan(G.whoosh(0.45, r, 0.35, 400, 2600), r.uniform(-0.4, 0.4)), F(c) - 0.22, 0.32)
    for g, d in GLIDES: place(out, widen(G.whoosh(F(d) + 0.2, r, 0.5), r), F(g) - 0.05, 0.3)
    place(out, widen(G.whoosh(0.9, r, 0.75, 500, 4000), r), F(122) - 0.7, 0.55)
    place(out, I.cymbal(0.35, r, 1.6), F(122), 0.25)
    # impacts on the kicks
    for f, g in KICKS: place(out, thud(r, 60, 0.4, 0.9 * g), F(f), 0.7)
    # hook: eyes squint (a tiny "zip")
    place(out, sweep(1800, 900, 0.12) * env_ad(ns(0.12), 0.005, 0.05) * 0.25, F(88))
    # 3a footsteps across the clearing + rug drag
    for k in range(10): place(out, pan(G.stroll_step(r, 0.6), -0.2), F(246) + 0.31 * k + 0.05, 0.4)
    place(out, lp(colored(ns(1.6), r, 0.3), 1200) * 0.15 * np.hanning(ns(1.6)), F(248))
    # digging strokes (every 9 frames from 293) + clods
    for k in range(3):
        place(out, dig(r), F(293 + 9 * k + 4), 0.8); place(out, pan(sprinkle(r, 0.5), -0.3), F(293 + 9 * k + 7), 0.5)
    # rug roll + thump into the hole
    place(out, rumble(r, 0.85, 55) * 0.5, F(320))
    place(out, thud(r, 52, 0.6, 1.2), F(350))
    place(out, sprinkle(r, 0.4, 0.04), F(350), 0.4)
    # grass back on top: shovel pats + soil pour
    place(out, lp(colored(ns(1.2), r, 0.4), 2500) * 0.2 * np.hanning(ns(1.2)), F(358))
    for k in range(4): place(out, thud(r, 110, 0.2, 0.5) + 0.3 * dig(r)[: ns(0.2)], F(366 + 10 * k), 0.6)
    # "Perfect": a little ta-da chime
    place(out, widen(chime(r, [79, 84, 88, 91]), r), F(416), 0.35)
    # weeks later: clock-tick time-lapse, then the sad wilt slide on "brown"
    for k in range(10): place(out, pan(G.clink(r, 2600, 0.05, 0.5), 0.3 * (-1) ** k), F(442) + 0.25 * k, 0.12)
    place(out, sweep(700, 260, 0.9, "saw", 0.8) * env_ad(ns(0.9), 0.05, 0.5) * 0.18, F(490))
    place(out, sizzle(r, 0.7), F(492), 0.4)
    # regrowth: rising slide + leafy rustle; magic chimes on "Greener" and "way greener"
    place(out, sweep(250, 900, 0.9, "saw", 1.2) * env_ad(ns(0.9), 0.4, 0.35) * 0.15, F(571))
    place(out, bp(colored(ns(1.0), r, 0.2), 1500, 7000) * np.hanning(ns(1.0)) * 0.25, F(571))
    place(out, widen(chime(r, [76, 79, 83, 88], 0.05), r), F(602), 0.4)
    place(out, widen(chime(r, [79, 83, 86, 91, 95], 0.045, 0.75), r), F(620), 0.45)
    place(out, widen(G.whoosh(1.6, r, 0.3, 300, 1800), r), F(642), 0.35)
    # mushroom pops
    for i in range(17): place(out, pan(pop_snd(r, 700 + 60 * (i % 5)), 0.4 * np.sin(i * 1.3)), F(MUSH0 + 2.6 * i) + 0.01, 0.55)
    place(out, pop_snd(r, 520), F(MUSH0 + 26), 0.6)
    # the sink: rumble + creak, settle thump on "grave"
    place(out, widen(rumble(r, 2.2, 40), r), F(812), 0.8)
    place(out, creak(r, 1.4), F(820), 0.25)
    place(out, sprinkle(r, 1.2, 0.03), F(830), 0.3)
    # Gary hiding: bush rustle
    place(out, bp(colored(ns(0.6), r, 0.2), 1200, 6000) * np.hanning(ns(0.6)) * 0.25, F(912))
    # unluckily: record-stop-ish downward zip
    place(out, sweep(900, 120, 0.35, "saw", 0.6) * env_ad(ns(0.35), 0.005, 0.25) * 0.2, F(988))
    # why: dig flashback strokes
    for k in range(7): place(out, dig(r), F(1086 + 27 * (k // 3) + 9 * (k % 3) + 18), 0.55)
    # fertilizer sack pop + plop
    place(out, pop_snd(r, 420), F(1222), 0.7); place(out, thud(r, 90, 0.3, 0.7), F(1226), 0.6)
    # dog: jingle of the collar, tiny tinkle while peeing, sizzle on "burns", sparkle on "greener"
    for k in range(3): place(out, G.clink(r, 3800 + 300 * k, 0.08, 0.4), F(1276 + 4 * k), 0.15)
    place(out, tinkle(r, 1.0), F(1298), 0.2)
    place(out, sizzle(r, 0.9), F(1370), 0.45)
    place(out, sweep(250, 1000, 0.7, "saw", 1.2) * env_ad(ns(0.7), 0.3, 0.3) * 0.13, F(1430))
    place(out, widen(chime(r, [79, 84, 88], 0.05), r), F(1449), 0.35)
    # corpse finder: eyes open blink, squint "dun-dun" sting
    place(out, sweep(1600, 700, 0.1) * env_ad(ns(0.1), 0.003, 0.04) * 0.2, F(1640))
    for k, (m, d) in enumerate([(38, 0.0), (37, 0.36)]): place(out, I.timpani(I.m2f(m), 0.9, r, 1.6), F(1670) + d, 0.5)
    place(out, I.brass(I.m2f(50), 0.9, 0.7, r, "tuba"), F(1670), 0.25)
    # search team footsteps
    for k in range(14): place(out, pan(G.stroll_step(r, 0.7), 0.3 * np.sin(k)), F(1703) + 0.33 * k + 0.1, 0.35)
    # drone: buzz with a doppler-ish swell
    d = drone_buzz(r, F(1914 - 1790))
    n = d.shape[-1]; e = np.minimum(1, np.arange(n) / ns(0.8)) * (0.6 + 0.4 * np.sin(np.pi * np.arange(n) / n))
    place(out, widen(d * e, r), F(1790), 0.4)
    place(out, sweep(1200, 2400, 0.15) * env_ad(ns(0.15), 0.005, 0.06) * 0.12, F(1880))  # scan blip
    # picnic: a mushroom pops through the blanket, gasp-sting
    place(out, pop_snd(r, 600), F(2036), 0.8)
    place(out, widen(chime(r, [72, 71], 0.12, 0.7), r), F(2040), 0.3)
    return out

# ================================================================ music: original sneaky pizzicato (D minor, 120 bpm)
BEAT = 0.5
def music():
    out = buf(); r = rng(7)
    def note(fn, m, t, vel, dur=0.6, p=0.0, g=1.0):
        if t < 0 or t >= DUR: return
        x = fn(I.m2f(m), vel, r, dur) if fn is not I.pluck else I.pluck(I.m2f(m), vel, r, dur, 0.55)
        place(out, pan(x, p), t, g)
    # chords per bar (2 s): i - iv - V - i pattern in D minor, major lift for "greener" and the picnic
    MIN = {"Dm": [38, 45, 50, 53, 57], "Gm": [43, 50, 55, 58, 62], "A": [45, 52, 57, 61, 64], "Bb": [46, 53, 58, 62, 65]}
    MAJ = {"D": [38, 45, 50, 54, 57], "G": [43, 50, 55, 59, 62], "A": [45, 52, 57, 61, 64], "Bm": [47, 54, 59, 62, 66]}
    sneaky = ["Dm", "Dm", "Gm", "A"]
    # melody motif (beats, midi), original: creeping up a minor third, a chromatic slip, a sly turn
    MOTIF = [(0, 62), (1, 65), (1.5, 64), (2, 62), (3, 69), (4, 68), (4.5, 69), (5, 70), (6, 69), (7, 65)]
    def bass_bar(t0, ch, vel=0.7, walk=True, table=MIN):
        c = table[ch]
        for k, m in enumerate([c[0], c[1], c[0] + 12 if walk else c[0], c[1]]): note(I.pluck, m - 12 if m > 50 else m, t0 + k * BEAT, vel * (1 if k % 2 == 0 else 0.75), 0.45, -0.15)
    def stabs(t0, ch, vel=0.35, table=MIN):
        for k in (0.5, 2.5):
            for m in table[ch][2:]: note(I.pluck, m, t0 + k * BEAT, vel, 0.25, 0.25)
    def motif(t0, vel=0.55, tr=0, fn=I.pluck, gain=1.0):
        for b, m in MOTIF: note(fn, m + tr, t0 + b * BEAT, vel, 0.5, 0.1, gain)
    def brushes(t0, bars, vel=0.25):
        for k in range(bars * 4):
            place(out, pan(I.brush(vel * (1.0 if k % 2 else 0.6), r, 0.3, k % 4 == 3), 0.3), t0 + k * BEAT)

    t = 0.0
    # hook (0-4.07): low pulse + motif on vibes, swell into the flash
    for b in range(2): bass_bar(b * 2, "Dm", 0.55, False)
    motif(0.0, 0.45, 0, I.vibes, 0.8)
    # meet Gary + the deed (4.07-14.7): full sneaky groove, 5 bars from 4.07
    T0 = F(122)
    for b in range(5):
        ch = sneaky[b % 4]; bass_bar(T0 + 2 * b, ch); stabs(T0 + 2 * b, ch)
    brushes(T0, 5)
    motif(T0 + 2, 0.55); motif(T0 + 6, 0.55, 0)
    # "Perfect" (13.87): stop + ta-da
    tp = F(416)
    for m in [62, 66, 69, 74]: note(I.glock, m + 12, tp, 0.5, 1.4, 0.0, 0.8)
    # weeks later (14.7-18.7): music box, slow, sad slip on brown
    T1 = F(440)
    for k, m in enumerate([74, 72, 70, 69, 67, 65, 64, 62]): note(I.musicbox, m, T1 + 0.5 * k, 0.45, 1.2)
    # grows back greener (18.7-24): D major bounce + glock
    T2 = F(562)
    for b in range(3):
        ch = ["D", "G", "A"][b]; bass_bar(T2 + 2 * b, ch, 0.7, True, MAJ); stabs(T2 + 2 * b, ch, 0.35, MAJ)
    brushes(T2, 3, 0.3)
    for k, m in enumerate([74, 76, 78, 81, 78, 81, 83, 86]): note(I.glock, m, T2 + 1.3 + 0.5 * k, 0.4, 1.0)
    # mushrooms (24-26.3): pizz pops follow the pops
    for i in range(17): note(I.pluck, [62, 65, 69, 74, 72][i % 5] + 12, F(MUSH0 + 2.6 * i), 0.35, 0.3, 0.3)
    bass_bar(F(719), "Dm", 0.6)
    # sink (26.3-30.3): tension pad + timpani roll
    T3 = F(788)
    place(out, I.pad([I.m2f(m) for m in [38, 45, 51, 56]], 4.0, 0.5, r, 0.8, 0.8, 700), T3)
    for k in range(16): place(out, I.timpani(I.m2f(38), 0.25 + 0.03 * k, r, 0.6), T3 + 0.12 + 0.2 * k, 0.6)
    place(out, I.timpani(I.m2f(38), 1.0, r, 2.0), F(883))
    # luckily (30.3-33): relaxed sneaky; unluckily (33-36.2): stop then low tension
    T4 = F(908)
    bass_bar(T4, "Dm", 0.55); stabs(T4, "Dm"); motif(T4 + 0.2, 0.4, 0, I.vibes, 0.7)
    T5 = F(990)
    place(out, I.pad([I.m2f(m) for m in [38, 44, 50, 53]], 3.2, 0.5, r, 0.2, 0.6, 600), T5)
    for k in range(6): note(I.pluck, 38, T5 + 0.5 * k, 0.6, 0.4)
    # why (36.2-42.2): light curious vibes over a soft pulse
    T6 = F(1086)
    for b in range(3):
        ch = ["Dm", "Bb", "A"][b]; bass_bar(T6 + 2 * b, ch, 0.45, False); stabs(T6 + 2 * b, ch, 0.25)
    motif(T6 + 1, 0.4, 12, I.vibes, 0.7)
    # dog (42.3-50.2): playful major bounce
    T7 = F(1270)
    for b in range(4):
        ch = ["D", "Bm", "G", "A"][b]; bass_bar(T7 + 2 * b, ch, 0.65, True, MAJ); stabs(T7 + 2 * b, ch, 0.3, MAJ)
    brushes(T7, 4, 0.3)
    for k, m in enumerate([69, 74, 78, 76, 74, 71, 74, 69]): note(I.glock, m, T7 + 4.3 + 0.5 * k, 0.35, 0.9)
    # corpse finder (50.2-56.8): sneaky again, low and slow, stop before the sting
    T8 = F(1505)
    for b in range(3):
        ch = sneaky[b]; bass_bar(T8 + 2 * b, ch, 0.55); stabs(T8 + 2 * b, ch, 0.3)
    motif(T8 + 0.5, 0.45, -12, I.pluck, 0.9)
    # search + drone (56.8-63.8): driving sneaky groove with snare
    T9 = F(1703)
    for b in range(4):
        ch = sneaky[b % 4]; bass_bar(T9 + 2 * b, ch, 0.7); stabs(T9 + 2 * b, ch, 0.35)
        for k in range(8): place(out, pan(I.snare(0.18 + (0.15 if k % 4 == 2 else 0), r, 0.2), -0.2), T9 + 2 * b + 0.25 * k * 2 * 0.5 + (0.25 if k % 2 else 0))
    motif(T9 + 1, 0.5); motif(T9 + 5, 0.55, 12, I.glock, 0.6)
    # picnic (63.8-70.5): sunny major, then the sneaky motif sneaks back on "somewhere else" and ends on a sly pluck
    T10 = F(1914)
    for b in range(2):
        ch = ["D", "G"][b]; bass_bar(T10 + 2 * b, ch, 0.6, True, MAJ); stabs(T10 + 2 * b, ch, 0.3, MAJ)
    brushes(T10, 2, 0.25)
    for k, m in enumerate([74, 78, 81, 78, 76, 74]): note(I.glock, m, T10 + 0.5 + 0.5 * k, 0.35, 1.0)
    T11 = F(2040)
    bass_bar(T11, "Dm", 0.6); motif(T11, 0.45, 0, I.pluck, 0.9)
    note(I.pluck, 38, F(2100), 0.8, 0.8); note(I.pluck, 50, F(2100), 0.6, 0.8)
    # gentle room
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
