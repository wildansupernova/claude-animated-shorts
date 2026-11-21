# Sound for "Floor Zero, Part 3: Don't Step in the Water": an original dark score + synthesized SFX + the narration, all from numpy (dsp.py /
# instruments.py / sfx_gen.py from the repo's templates/audio). Every event time comes from out/timeline.json (dumped
# from story.ts) and voice/words.json, so the sound lands on the same frames as the picture.
# Writes out/audio/{mix,stem_voice,stem_music,stem_sfx}.wav (48 kHz, exact video length) and out/audio/cues.md.
# Mix: voice on top; music ducked under speech; master to -14 LUFS integrated, true peak <= -1 dBTP.
import json, os, sys
import numpy as np
from scipy import signal, ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.append(os.environ.get("AUDIO_LIB", "/home/user/claude-animated-shorts/templates/audio"))
from dsp import (SR, TAU, ns, tt, rng, dbg, lp, hp, bp, peq, reson, colored, smooth_noise, fades, pan, st, place, widen, make_ir,
                 convolve_st, integrated, true_peak, read_wav, write_wav, modal, phase, shape, curve)
import instruments as I
import sfx_gen as G

ROOT = os.path.dirname(HERE)
TL = json.load(open(os.path.join(ROOT, "out", "timeline3.json")))
WORDS = json.load(open(os.path.join(ROOT, "voice", "words.json")))
FPS, TOTAL = TL["FPS"], TL["TOTAL"]
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
CUES = []
def cue(t, what): CUES.append((t, what))
R = rng(3313)
wt = lambda li, w=None, k=0: [x for x in WORDS if x["line"] == li and (w is None or x["w"].lower().strip(".,?") == w.lower())][k]["s"]
shot = {s["id"]: s for s in TL["shots"]}
T = lambda i: fr(shot[i]["a"])

# ================================================================ small synth pieces
def click(r, f=2200.0, vel=1.0):
    return fades(modal(0.06, [(f, 1.0, 0.006), (f * 1.9, 0.4, 0.004)], r) + bp(r.standard_normal(ns(0.06)), 1500, 7000, 1) * np.exp(-tt(0.06) / 0.002) * 0.5, 0.0, 0.01) * vel
def beep(f=1046.0, dur=0.11, vel=0.6):
    t = tt(dur)
    return fades(np.sin(TAU * f * t) * 0.8 + 0.2 * np.sin(TAU * 2 * f * t), 0.004, 0.03) * vel
def chime(notes, r, vel=0.7, gap=0.28):
    out = np.zeros(ns(gap * len(notes) + 2.0))
    for i, m in enumerate(notes):
        y = I.vibes(I.m2f(m), vel, r, dur=1.8, trem_depth=0.12)
        place_m(out, y, i * gap)
    return out
def place_m(buf, x, t):
    i = ns(t); b = min(len(buf), i + len(x)); buf[i:b] += x[: b - i]
def hum(dur, r, f0=120.0, buzz=0.35):
    t = tt(dur)
    y = sum((0.9 / k) * np.sin(TAU * f0 * k * t + r.uniform(0, TAU)) for k in (1, 2, 3, 4, 6))
    y += buzz * np.clip(np.sin(TAU * f0 * t) * 6, -1, 1) * 0.3
    y = bp(y, 90, 2400, 1)
    return y * (1 + 0.08 * smooth_noise(len(t), r, 0.6))
def roomtone(dur, r, lo=380.0):
    return lp(colored(ns(dur), r, 1.6), lo, 2) * 0.9
def relay_clunk(r):
    d = 0.45; t = tt(d)
    thump = np.exp(-t / 0.05) * np.sin(phase(70 * (1 + 0.5 * np.exp(-t / 0.01)))) * 1.2
    clk = bp(r.standard_normal(len(t)), 800, 5000, 1) * np.exp(-t / 0.006)
    ring = modal(d, [(310, 0.3, 0.08), (920, 0.15, 0.05)], r)
    return fades(thump + clk * 0.7 + ring, 0.0, 0.08)
def step(r, hard=False):
    d = 0.25; t = tt(d)
    th = lp(r.standard_normal(len(t)), 260 if not hard else 500, 2) * np.exp(-t / 0.03) * 1.4
    body = np.exp(-t / 0.04) * np.sin(phase(r.uniform(75, 100) * np.ones(len(t)))) * 0.6
    y = th + body
    if hard: y += bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.004) * 0.6
    else: y += bp(r.standard_normal(len(t)), 600, 2500, 1) * np.clip(t / 0.015, 0, 1) * np.exp(-t / 0.05) * 0.25
    return fades(y, 0.0, 0.05)
def casters(r, dur=0.7):
    t = tt(dur)
    nz = colored(len(t), r, 1.0)
    rum = bp(nz, 120, 900, 2) * (1 + 0.6 * np.sin(TAU * 17 * t))
    env = np.clip(t / 0.06, 0, 1) * np.exp(-np.maximum(t - 0.25, 0) / 0.18)
    return fades(rum * env, 0.005, 0.05)
def door_slide(r, dur=1.05, opening=True):
    t = tt(dur + 0.4)
    env = curve(len(t), [(0, 0), (0.08, 1), (dur - 0.15, 0.9), (dur, 0.0), (dur + 0.4, 0)])
    whir = lp(np.sign(np.sin(phase(95 + 25 * np.sin(TAU * 0.7 * t)))) * 0.5, 600, 2)
    rum = bp(colored(len(t), r, 1.2), 70, 700, 2)
    roll = bp(r.standard_normal(len(t)), 1800, 5000, 1) * 0.08 * (1 + np.sin(TAU * 31 * t))
    y = (whir * 0.35 + rum + roll) * env
    end = np.zeros(len(t)); k = ns(dur - 0.02)
    hit = step(r, True) * (1.4 if not opening else 0.6)
    end[k: k + len(hit)] += hit[: len(end) - k]
    return fades(y + end, 0.01, 0.1)
def elevator_ding(r, vel=0.7):
    return chime([88, 84], r, vel, 0.34)
def motor_bed(dur, r):
    t = tt(dur)
    y = 0.5 * np.sin(TAU * 52 * t) + 0.25 * np.sin(TAU * 104 * t + 1)
    y += 0.8 * bp(colored(len(t), r, 1.4), 40, 400, 2)
    return y * (1 + 0.15 * smooth_noise(len(t), r, 0.4))
def shaft_wind(dur, r, f0=900.0, f1=180.0):
    n = ns(dur); t = np.arange(n) / SR
    nz = colored(n, r, 0.8)
    fc = lambda T: f0 * (f1 / f0) ** np.clip(T / dur, 0, 1)
    y = shape(nz, lambda Tt, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(Tt)[None, :]) / 0.7) ** 2), 2048, 512)
    return fades(y, 0.4, 0.4)
def crackle(r, dur):
    n = ns(dur); y = np.zeros(n)
    for _ in range(int(dur * 70)):
        k = r.integers(0, max(1, n - 400)); y[k: k + 300] += r.standard_normal(300) * np.exp(-np.arange(300) / 60) * r.uniform(0.3, 1)
    return bp(y, 900, 7000, 1) + 0.5 * np.sin(TAU * 120 * np.arange(n) / SR) * (np.abs(y) > 0.2)
def ringback(dur=1.25):
    t = tt(dur)
    y = (np.sin(TAU * 440 * t) + np.sin(TAU * 480 * t)) * 0.5
    return fades(bp(y, 300, 3400, 2), 0.01, 0.03)
def impact(r):
    d = 2.2; t = tt(d)
    sub = np.sin(phase(42 * (1 + 0.6 * np.exp(-t / 0.05)))) * np.exp(-t / 0.5) * 1.6
    nz = lp(r.standard_normal(len(t)), 1800, 2) * np.exp(-t / 0.06) * 1.2
    metal = modal(d, [(187, 0.7, 0.6), (412, 0.6, 0.45), (733, 0.5, 0.35), (1189, 0.35, 0.25), (1730, 0.25, 0.18), (2611, 0.15, 0.1)], r)
    twang = modal(d, [(61, 0.6, 0.9), (122.7, 0.35, 0.6), (185, 0.2, 0.4)], r, glide=0.08, glide_tau=0.15)
    return fades(sub + nz + metal * 0.8 + twang, 0.0, 0.3)
def dong(r, f=55.0, dur=4.0):
    return fades(modal(dur, [(f, 1.0, 1.8), (f * 2.01, 0.5, 1.2), (f * 2.76, 0.35, 0.9), (f * 4.07, 0.2, 0.6), (f * 5.4, 0.1, 0.4)], r), 0.002, 0.5)
def rustle(r, dur=0.6):
    t = tt(dur); y = np.zeros(len(t))
    for _ in range(14):
        k = r.integers(0, len(t) - ns(0.05)); y[k: k + ns(0.05)] += r.standard_normal(ns(0.05)) * np.exp(-np.arange(ns(0.05)) / ns(0.012)) * r.uniform(0.3, 1)
    return fades(bp(y, 1200, 8000, 1), 0.01, 0.05)
def key_clack(r):
    d = 0.12; t = tt(d)
    return fades(modal(d, [(r.uniform(2400, 3200), 0.8, 0.008), (r.uniform(700, 900), 0.5, 0.015)], r) + bp(r.standard_normal(len(t)), 2000, 8000, 1) * np.exp(-t / 0.003) * 0.6, 0, 0.02)
def breath(r, inhale=1.1, exhale=1.5):
    n1, n2 = ns(inhale), ns(exhale)
    a = colored(n1, r, 0.4); b = colored(n2, r, 0.6)
    t1, t2 = np.arange(n1) / SR, np.arange(n2) / SR
    ia = shape(a, lambda Tt, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (900 + 900 * Tt[None, :] / inhale)) / 0.9) ** 2), 1024, 256) * np.sin(np.pi * t1 / inhale) ** 1.5
    ex = shape(b, lambda Tt, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (700 - 300 * Tt[None, :] / exhale)) / 1.0) ** 2), 1024, 256) * np.sin(np.pi * t2 / exhale) ** 1.2
    return fades(np.concatenate([ia * 0.7, np.zeros(ns(0.15)), ex]), 0.02, 0.05)
def neck_crack(r):
    y = np.zeros(ns(0.25))
    for k, a in [(0, 1), (ns(0.03), 0.6), (ns(0.07), 0.8), (ns(0.11), 0.4)]:
        y[k: k + 200] += r.standard_normal(200) * np.exp(-np.arange(200) / 25) * a
    return bp(y, 900, 5000, 1)
def squeak(r, dur=0.6, lo=420, hi=620):
    return G.creak(dur, r, lo, hi, G.SMALLMETAL, [(0, 0), (0.3, 1), (0.7, 0.8), (1, 0)], rough=0.08, noise=0.01) if hasattr(G, "SMALLMETAL") else G.swing_squeak(r)
def ui_pop(r, f=900.0):
    t = tt(0.12)
    return fades(np.sin(phase(f * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.04), 0.001, 0.02)
def heart(r, vel=1.0):
    d = 0.6; t = tt(d)
    lub = np.sin(phase(58 * (1 + 0.4 * np.exp(-t / 0.02)))) * np.exp(-t / 0.07)
    t2 = np.maximum(t - 0.2, 0)
    dub = np.sin(phase(52 * (1 + 0.4 * np.exp(-t2 / 0.02)))) * np.exp(-t2 / 0.06) * (t >= 0.2) * 0.7
    return fades(lp(lub + dub, 300, 2) * vel, 0.0, 0.05)

# ================================================================ extra synth pieces (Part 2)
def tape_rewind(r, dur):
    t = tt(dur)
    f = 900 + 700 * np.sin(TAU * 7.5 * t) * np.exp(-t) + 1400 * (t / dur)
    saw = 2 * ((np.cumsum(f) / SR) % 1.0) - 1
    y = bp(saw, 400, 5000, 2) * 0.5 + bp(colored(len(t), r, 0.3), 2000, 9000, 1) * 0.6
    y *= 0.75 + 0.25 * np.sin(TAU * 31 * t)
    return fades(y, 0.02, 0.05)
def power_down(r, dur=0.9):
    t = tt(dur)
    y = np.sin(phase(220 * np.exp(-t * 2.5) + 30)) * np.exp(-t * 2.2)
    return fades(y, 0.0, 0.1)
def screech(r, dur=2.2):
    t = tt(dur)
    f = 2400 * (0.25 ** (t / dur)) * (1 + 0.02 * np.sin(TAU * 17 * t))
    y = np.sin(phase(f)) * 0.5 + np.sin(phase(f * 1.51)) * 0.25 + bp(colored(len(t), r, 0.5), 1500, 6000, 1) * 0.3
    return fades(y * curve(len(t), [(0, 0), (0.08, 1), (dur - 0.3, 0.7), (dur, 0)]), 0.01, 0.2)
def fall_rush(r, dur):
    return shaft_wind(dur, r, 2400, 120) * curve(ns(dur), [(0, 0.2), (dur * 0.7, 1.0), (dur, 0.0)])
def boom(r, dur=3.5):
    t = tt(dur)
    sub = np.sin(phase(38 * (1 + 0.5 * np.exp(-t / 0.08)))) * np.exp(-t / 0.9) * 1.6
    rum = lp(colored(len(t), r, 1.5), 300, 2) * np.exp(-t / 1.1)
    deb = G.rattle(1.5, r, 25, np.exp(-np.linspace(0, 1, ns(1.5)) * 2.5), heavy=True)
    y = sub + rum * 0.8
    y[: len(deb)] += deb * 0.35
    return fades(lp(y, 900, 2), 0.0, 0.4)
def fans_up(r, dur=2.5):
    t = tt(dur)
    f = 60 + 160 * (1 - np.exp(-t / 0.8))
    y = bp(colored(len(t), r, 0.8), 300, 3000, 1) * (1 - np.exp(-t / 0.6)) * 0.6
    y += np.sin(phase(f * 4)) * 0.08 * (1 - np.exp(-t / 0.5))
    return fades(y, 0.05, 0.4)
def creak_door(r, dur=1.8):
    return G.creak(dur, r, 70, 130, G.WOOD, [(0, 0), (0.15, 1), (0.6, 0.8), (1, 0)], rough=0.18, noise=0.06) * 1.2
def far_step(r, dist=1.0):
    y = step(r, True)
    y = lp(y, 2500 - 1500 * dist, 2)
    return y

# ================================================================ SFX stem
sfx = np.zeros((2, N))
def S(x, t, gain_db=0.0, p=0.0, what=None):
    if x.ndim == 1: x = pan(x, p)
    place(sfx, x, max(0.0, t), dbg(gain_db))
    if what: cue(t, what)
TZ = TL["teaser"] / FPS
r0, r1 = fr(TL["rewind"][0]), fr(TL["rewind"][1])
fl = [fr(f) for f in TL["flicks"]]
arrive, flood = fr(TL["arrive"]), fr(TL["floodFrom"])
def drip(r, f=None):
    f = f or r.uniform(900, 1600); t = tt(0.25)
    return np.sin(phase(f * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.05) * 0.5
# ---- beds: floor-zero office tone (recap, the walk in), the stairwell (low wind, the lamp's buzz), the car, -1 (water) ----
rt = roomtone(DUR, R) * 0.5
office_env = curve(N, [(0, 1), (TZ, 1), (T(2), 1), (T(2) + 0.05, 0), (T(7), 0), (T(8), 1), (fr(TL["closeC"]) + 0.6, 1), (fr(TL["closeC"]) + 1.2, 0), (DUR, 0)])
S(widen(rt * office_env, R), 0, -22, what="floor zero room tone (recap + walk in)")
hm = hum(DUR, R, 120.0, 0.5)
S(widen(hm * office_env, R, 7), 0, -30)
sw = shaft_wind(T(7) - T(2), R, 320, 180)
S(widen(sw, R, 3), T(2), -24, what="stairwell: low draught")
lamp = hum(T(7) - T(2), R, 100.0, 0.9) * curve(ns(T(7) - T(2)), [(0, 1), (fr(TL["lampDie"]) - T(2), 1), (fr(TL["lampDie"]) - T(2) + 0.02, 0), (T(7) - T(2), 0)])
S(lamp, T(2), -27, 0.3, "the red lamp buzzes")
car = motor_bed(arrive - fr(TL["closeC"]), R)
S(widen(car, R, 5), fr(TL["closeC"]) + 0.5, -21, what="the car descends (motor bed)")
cab = hum(arrive + 2.5 - T(9), R, 100.0, 0.7)
S(widen(cab, R, 5), T(9), -25, what="car light hum")
wbed = colored(ns(DUR - flood), R, 1.6)
wbed = lp(wbed, 500, 2) * 0.25
S(widen(wbed, R, 9), flood, -26, what="-1: wet room tone")
for i in range(int((DUR - fr(TL["openM1"])) / 1.7)):
    S(drip(R), fr(TL["openM1"]) + 0.6 + i * 1.7 + R.uniform(-0.4, 0.4), -26 + R.uniform(-4, 2), R.uniform(-0.8, 0.8), "drips" if i == 0 else None)
# ---- cold open: the water, the smile ----
S(dong(R, 39, 2.6), 0.04, -12, 0, "teaser: sub hit")
S(drip(R, 1200), 0.35, -14, 0.1, "teaser: one drip")
S(widen(G.whoosh(0.5, R, peak=0.45, f_lo=400, f_hi=7000, tail=0.02), R), TZ - 0.5, -17, 0, "teaser: suck-in to the white flash")
# ---- branch 1: the stairs ----
S(door_slide(R, 0.7, False) * 0.7, T(2) + 0.15, -14, 0.3, "fire door swings shut")
S(relay_clunk(R) * 0.6, T(2) + 0.85, -16, 0.3, "door latch")
s0 = T(2) + 0.6
fs = fr(TL["footStop"])
k = 0
while s0 + k * 0.5 < fs:
    u = (s0 + k * 0.5 - T(2)) / max(0.1, fs - T(2))
    S(lp(far_step(R, 1 - u), 3200, 1), s0 + k * 0.5, -24 + 10 * u, 0.2, "footsteps coming up" if k == 0 else None); k += 1
S(widen(breath(R, 0.5, 0.9), R, 5) * 0.6, fs + 0.4, -22, -0.1, "you hold your breath")
S(click(R, 2600, 0.5), fr(TL["torch"][0]), -17, 0.1, "phone torch on")
lf = fr(TL["lampFlick"])
S(crackle(R, 0.5), lf, -12, 0.2, "the lamp flickers")
S(relay_clunk(R), lf + 0.23, -14, 0.2, "it dies for a moment")
S(dong(R, 44, 3.2), fr(TL["hand"]) + 0.05, -9, 0, "A HAND ON YOUR SHOULDER: sub")
S(rustle(R, 0.5), fr(TL["hand"]), -14, -0.2, "cloth: the hand")
S(relay_clunk(R), fr(TL["lampDie"]), -10, 0.2, "the lamp dies")
S(widen(tape_rewind(R, r1 - r0), R), r0, -12, what="VHS rewind")
S(click(R, 400, 1.0), r1 - 0.02, -9, 0, "tape stop")
S(relay_clunk(R), r1 + 0.05, -16, 0, "play")
# ---- branch 2: the elevator ----
w0, w1 = fr(TL["walkIn"][0]), fr(TL["walkIn"][1])
for i, t in enumerate(np.arange(w0 + 0.15, w1, 0.46)): S(step(R, i > 2), t, -16, 0.15 if i % 2 else -0.15, "you walk in" if i == 0 else None)
S(door_slide(R, 1.0, False), fr(TL["closeC"]), -11, 0, "the doors close on the two of you")
for i, f0 in enumerate(fl):
    S(crackle(R, 0.35), f0 - 0.15, -13, 0.1, "flicker %d" % (i + 1))
    S(relay_clunk(R) * 0.8, f0, -13, 0.0)
    S(lp(step(R, True), 1400, 2), f0 + 0.08, -12 + 2 * i, -0.15, "one step closer (in the dark)" if i == 0 else None)
    S(dong(R, 49 - 2 * i, 2.4), f0 + 0.2, -16 + 2 * i, 0, None)
S(ui_pop(R, 380) * 0.6, fr(TL["steel"][0]), -18, 0, "the steel insert")
S(elevator_ding(R, 0.6), arrive, -10, 0, "ding: minus one")
S(door_slide(R, 1.1, True), fr(TL["openM1"]), -11, 0, "doors open on -1")
b0, b1 = fr(TL["backOut"][0]), fr(TL["backOut"][1])
for i, t in enumerate(np.arange(b0 + 0.2, b1, 0.55)): S(step(R, False), t, -17, 0.1, "you back out" if i == 0 else None)
S(door_slide(R, 1.2, False), fr(TL["closeM1"]), -12, 0, "the doors close on it")
for i, f in enumerate(sorted(TL["rowOff"], reverse=False)):
    S(relay_clunk(R), fr(f), -12 + 1.5 * (4 - i), 0.4 - 0.2 * i, "a row of lights dies" if i == 0 else None)
S(ui_pop(R, 700), fr(TL["tagsAt"]), -20, -0.4, "tag 1 pops")
S(ui_pop(R, 980), fr(TL["tagsAt"]) + 5 / FPS, -20, 0.4, "tag 2 pops")
room = convolve_st(sfx.mean(0), make_ir(0.4, 7, hf=1.8)) * dbg(-16)
sfx = sfx + room

# ================================================================ music
mus = np.zeros((2, N))
def M(x, t, gain_db=0.0, p=0.0):
    if x.ndim == 1: x = pan(x, p)
    place(mus, x, t, dbg(gain_db))
m2f = I.m2f
MOTIF = [69, 65, 62, 61]
def motif(t0, vel=0.55, slow=1.0, oct=0, gain=-12, detune=0.0):
    for i, m in enumerate(MOTIF):
        f = m2f(m + 12 * oct) * (1 + detune * (i % 2 * 2 - 1))
        M(I.musicbox(f, vel, R, 2.4), t0 + i * 0.42 * slow, gain, 0.3 * np.sin(i))
def drone(t0, t1, notes, vel=0.5, warm=500, trem=None, gain=-10):
    M(I.pad([m2f(n) for n in notes], max(0.5, t1 - t0), vel, R, att=1.2, rel=1.2, warm=warm, detune=9, trem=trem), t0, gain)
# recap: the choice's heartbeat carries over
t = TZ
while t < T(2):
    M(heart(R, 0.9), t, -10); t += 60 / 96
drone(TZ - 0.3, T(2) + 0.5, [38, 44, 50, 56, 57], 0.5, 600, trem=lambda t: 1 + 0.3 * np.sin(TAU * 0.5 * t), gain=-12)
cue(TZ, "music: the choice's heartbeat + drone carry over")
# branch 1: a low red drone, silence on the hand
drone(T(2), fr(TL["hand"]), [26, 32, 37], 0.55, 300, gain=-11)
cl = I.pad([m2f(n) for n in (62, 63, 68, 69, 74, 75)], 3.5, 0.5, R, att=0.25, rel=1.5, warm=2600, detune=16)
M(cl, fr(TL["hand"]) - 0.05, -13); cue(fr(TL["hand"]) - 0.05, "music: string-cluster stinger (the hand)")
# branch 2: tension pad in the car, a pulse that tightens with each flicker; the motif on -1
drone(r1 + 0.1, fl[0], [38, 45, 53], 0.45, 480, gain=-14)
drone(fl[0], arrive, [38, 44, 51, 57], 0.5, 520, trem=lambda t: 1 + 0.35 * np.sin(TAU * 1.2 * t), gain=-13)
t = fl[0]
while t < arrive:
    u = (t - fl[0]) / max(0.1, arrive - fl[0]); M(heart(R, 0.8 + 0.2 * u), t, -12 + 3 * u); t += 60 / (84 + 40 * u)
drone(arrive, DUR + 0.5, [26, 33, 38], 0.55, 260, gain=-12)
motif(fr(TL["floodFrom"]) + 0.2 if False else wt(19) - 0.1, 0.42, slow=1.3, gain=-15, detune=0.012)
cue(wt(19) - 0.1, "music: the motif as -1 appears")
t = fr(TL["tagsAt"]) - 4.0
while t < DUR - 0.4:
    u = (t - (fr(TL["tagsAt"]) - 4)) / (DUR - fr(TL["tagsAt"]) + 4)
    M(heart(R, 1.0), t, -9 + 2 * u); t += 60 / (78 + 30 * u)
motif(wt(30) - 0.1, 0.4, slow=0.9, oct=1, gain=-15)
cue(fr(TL["tagsAt"]) - 4, "music: heartbeat for the choice")
mus = mus + convolve_st(mus.mean(0), make_ir(2.4, 3, hf=1.1)) * dbg(-10)
# silence in the black (music too)
g = np.ones(N)
for a, b in TL["blacks"]: g[ns(fr(a)):ns(fr(b))] = 0.0
g = ndimage.uniform_filter1d(g, ns(0.03))
mus *= g[None, :]
# ================================================================ voice + mix
vx, vsr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = signal.resample_poly(vx[0], SR, vsr)
voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
voice = peq(shelfless := hp(voice, 75), 220, 1.0, 0.9)   # a little warmth
voice = peq(voice, 3800, 1.5, 0.8)                         # presence
# a very small, dark room on the voice (close, intimate)
voice = voice + convolve_st(voice, make_ir(0.3, 11, hf=2.0)).mean(0) * dbg(-22)
voice = st(voice)
mask = np.zeros(N)
for w in WORDS: mask[ns(w["s"]): ns(w["e"] + 0.05)] = 1.0
mask = ndimage.maximum_filter1d(mask, ns(0.18))
mask = ndimage.uniform_filter1d(mask, ns(0.12))
duck, sfx_duck = dbg(-5.5 * mask), dbg(-2.5 * mask)
def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -70.0
voice *= dbg(-17.0 - lufs(voice))
mus = mus * dbg(-17.0 - 5.0 - lufs(mus)) * duck[None, :]
sfx = sfx * dbg(-17.0 - 4.5 - lufs(sfx)) * sfx_duck[None, :]
mix = voice + mus + sfx
def limit(mix, ceil_db=-1.3):
    ceil = dbg(ceil_db)
    look = ns(0.004)
    pk = ndimage.maximum_filter1d(np.abs(mix).max(0), 2 * look + 1)
    gain = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    gain = -ndimage.maximum_filter1d(-gain, ns(0.01))
    a = np.exp(-1 / ns(0.08))
    g = gain.copy()
    for i in range(1, len(g)): g[i] = min(gain[i], a * g[i - 1] + (1 - a) * gain[i])
    return mix * g[None, :]
for _ in range(4):
    mix *= dbg(-14.0 - lufs(mix))
    mix = limit(mix)
tp = true_peak(mix)
if tp > -1.0: mix *= dbg(-1.0 - tp - 0.05)
mix[:, -ns(0.12):] *= np.linspace(1, 0, ns(0.12))[None, :]

OUT = os.path.join(ROOT, "out", "audio3")
os.makedirs(OUT, exist_ok=True)
write_wav(os.path.join(OUT, "mix.wav"), mix)
write_wav(os.path.join(OUT, "stem_voice.wav"), voice)
write_wav(os.path.join(OUT, "stem_music.wav"), mus)
write_wav(os.path.join(OUT, "stem_sfx.wav"), sfx)
rep = [f"# Sound cues: Floor Zero, Part 3 ({DUR:.3f} s, {N} samples @ {SR} Hz)",
       f"mix integrated {lufs(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP; stems integrated: voice {lufs(voice):.1f}, music {lufs(mus):.1f}, sfx {lufs(sfx):.1f} LUFS", ""]
rep += [f"- {t:7.3f} s (f{round(t * FPS):4d})  {w}" for t, w in sorted(CUES)]
open(os.path.join(OUT, "cues.md"), "w").write("\n".join(rep) + "\n")
print("\n".join(rep[:2]))
print(len(CUES), "cues")
