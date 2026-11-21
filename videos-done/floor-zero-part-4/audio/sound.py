# Sound for "Floor Zero, Part 4: Never Turn Around": an original dark score + synthesized SFX + the narration, all from numpy (dsp.py /
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
TL = json.load(open(os.path.join(ROOT, "out", "timeline4.json")))
WORDS = json.load(open(os.path.join(ROOT, "voice", "words.json")))
FPS, TOTAL = TL["FPS"], TL["TOTAL"]
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
CUES = []
def cue(t, what): CUES.append((t, what))
R = rng(4421)
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

# ================================================================ extra synth pieces (Part 4)
def splash(r, size=1.0, dur=0.9):
    t = tt(dur)
    nz = bp(r.standard_normal(len(t)), 500, 7000, 1) * np.exp(-t / (0.08 + 0.12 * size))
    plop = np.sin(phase(180 * size ** -0.3 * (1 + 1.5 * np.exp(-t / 0.015)))) * np.exp(-t / 0.05) * 0.8
    drops = np.zeros(len(t))
    for _ in range(int(14 * size)):
        k = r.integers(ns(0.05), len(t) - ns(0.08)); drops[k: k + ns(0.06)] += np.sin(phase(r.uniform(900, 2200) * np.ones(ns(0.06)))) * np.exp(-np.arange(ns(0.06)) / ns(0.012)) * r.uniform(0.1, 0.4)
    return fades(nz * size + plop * size + drops, 0.0, 0.1)
def wade_step(r):
    t = tt(0.6)
    slosh = bp(colored(len(t), r, 0.6), 300, 3500, 1) * curve(len(t), [(0, 0), (0.04, 1), (0.25, 0.5), (0.6, 0)])
    return fades(slosh * 0.8 + splash(r, 0.35, 0.6) * 0.6, 0.0, 0.08)
def desk_land(r):
    t = tt(0.4)
    thud = np.sin(phase(95 * (1 + 0.6 * np.exp(-t / 0.01)))) * np.exp(-t / 0.06) * 1.2
    lam = modal(0.4, [(340, 0.5, 0.05), (760, 0.3, 0.03), (1500, 0.2, 0.02)], r)
    rattle = bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.03) * 0.25
    return fades(thud + lam + rattle, 0.0, 0.08)
def plastic_clack(r):
    return fades(modal(0.12, [(r.uniform(1800, 2400), 0.8, 0.01), (r.uniform(4200, 5200), 0.4, 0.006)], r), 0, 0.02)
def static_burst(r, dur=0.5):
    t = tt(dur)
    y = bp(r.standard_normal(len(t)), 1200, 9000, 1) * (0.6 + 0.4 * (np.sin(TAU * 60 * t) > 0))
    return fades(y, 0.005, 0.08)
def monitor_whine(dur, r):
    t = tt(dur)
    return (np.sin(TAU * 7800 * t) * 0.15 + np.sin(TAU * 60 * t) * 0.4 + np.sin(TAU * 180 * t) * 0.15) * (1 + 0.1 * smooth_noise(len(t), r, 0.5))
def zoom_servo(r, dur=0.6):
    t = tt(dur)
    f = 900 + 400 * t / dur
    return fades(lp(np.sign(np.sin(phase(f))) * 0.3, 2500, 2) * (1 + 0.3 * np.sin(TAU * 40 * t)), 0.02, 0.05)

# ================================================================ SFX stem
sfx = np.zeros((2, N))
def S(x, t, gain_db=0.0, p=0.0, what=None):
    if x.ndim == 1: x = pan(x, p)
    place(sfx, x, max(0.0, t), dbg(gain_db))
    if what: cue(t, what)
TZ = TL["teaser"] / FPS
r0, r1 = fr(TL["rewind"][0]), fr(TL["rewind"][1])
F3, ST0 = fr(TL["floor3"]), T(12)
def drip(r, f=None):
    f = f or r.uniform(900, 1600); t = tt(0.25)
    return np.sin(phase(f * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.05) * 0.5
# ---- beds: -1 wet room tone + drips; the stairwell; -3 office hum + every monitor's whine ----
wbed = lp(colored(ns(ST0), R, 1.6), 500, 2) * 0.25
S(widen(wbed, R, 9), 0, -25, what="-1: wet room tone")
for i in range(int(ST0 / 1.6)):
    S(drip(R), 0.4 + i * 1.6 + R.uniform(-0.4, 0.4), -26 + R.uniform(-4, 2), R.uniform(-0.8, 0.8), "drips" if i == 0 else None)
sw = shaft_wind(F3 - ST0 + 0.4, R, 320, 180)
S(widen(sw, R, 3), ST0, -23, what="stairwell: low draught")
S(hum(F3 - ST0, R, 100.0, 0.9), ST0, -28, 0.3, "the red lamp buzzes")
rt3 = roomtone(DUR - F3, R) * 0.5
S(widen(rt3, R), F3, -22, what="-3: office room tone")
S(widen(hum(DUR - F3, R, 120.0, 0.5), R, 7), F3, -29)
S(widen(monitor_whine(DUR - F3, R), R, 4), F3, -33, what="-3: every monitor hums")
# ---- cold open: the monitors, and something breathing right behind you ----
S(dong(R, 39, 2.6), 0.04, -12, 0, "teaser: sub hit")
S(static_burst(R, 0.35), 0.02, -18, 0, "teaser: screen static")
S(widen(breath(R, 0.6, 1.0), R, 3) * 0.7, 0.9, -20, -0.6, "teaser: a breath behind you (left)")
S(widen(G.whoosh(0.5, R, peak=0.45, f_lo=400, f_hi=7000, tail=0.02), R), TZ - 0.5, -17, 0, "teaser: suck-in to the white flash")
# ---- branch 1: wade ----
S(wade_step(R), fr(TL["step1"][0]) + 0.15, -12, 0.1, "your first step into the water")
S(wade_step(R), fr(TL["step2"][0]) + 0.15, -12, 0.1, "your second step (its doesn't make a sound)")
S(dong(R, 46, 3.0), wt(2, "doesn't") - 0.02, -15, 0, "low dong: your reflection doesn't step")
pull = fr(TL["pull"])
S(lp(splash(R, 0.4, 0.5), 3000, 1), pull - 0.45, -18, -0.1, "something breaks the surface")
S(impact(R) * 0.5, pull, -10, 0, "IT PULLS: hit")
S(splash(R, 1.6, 1.3), pull + 0.02, -8, 0, "you go under: big splash")
S(widen(fall_rush(R, 0.9), R) * 0.6, pull + 0.1, -18, 0, "underwater rush")
S(widen(tape_rewind(R, r1 - r0), R), r0, -12, what="VHS rewind")
S(click(R, 400, 1.0), r1 - 0.02, -9, 0, "tape stop")
S(relay_clunk(R), r1 + 0.05, -16, 0, "play")
# ---- branch 2: climb ----
h = TL["hops"]
for i, t in enumerate(np.arange(fr(h[0][0]) + 0.1, fr(h[0][1]), 0.42)): S(step(R, False), t, -18, 0.1 if i % 2 else -0.1, "you walk to the desks" if i == 0 else None)
S(click(R, 2600, 0.5), fr(h[0][0]) - 0.05, -18, 0.1, "phone torch on")
for i, (a, b) in enumerate(h[1:]): S(desk_land(R), fr(b) - 0.03, -11, 0.15, "landing on a desk" if i == 0 else None)
bd = fr(TL["badgeDrop"])
S(plastic_clack(R), bd - 0.1, -14, 0.2, "the lanyard snags")
S(lp(splash(R, 0.3, 0.5), 5000, 1), bd + 12 / FPS, -13, -0.1, "the badge hits the water")
S(squeak(R, 0.5, 300, 420) * 0.5, fr(TL["kneel"]), -20, 0.1, "the desk creaks as you kneel")
S(wade_step(R) * 0.7, fr(TL["reach"]) + 0.3, -14, 0, "your hand goes in")
S(impact(R) * 0.45, fr(TL["grab"]), -10, 0, "IT GRABS YOUR WRIST: hit")
S(splash(R, 0.9, 0.9), fr(TL["grab"]) + 0.05, -12, 0, "thrash")
S(splash(R, 1.3, 1.1), fr(TL["tear"]), -9, 0.1, "you tear free")
S(widen(breath(R, 0.35, 0.7), R, 5) * 0.8, fr(TL["tear"]) + 0.5, -18, 0, "you gasp")
w0 = fr(TL["wrist"][0])
S(dong(R, 52, 2.4), w0, -16, 0, "the wrist insert: a low note")
for i, (a, b) in enumerate(TL["hops2"]): S(desk_land(R), fr(b) - 0.03, -12 + i, 0.2 - 0.1 * i, "hops to the far door" if i == 0 else None)
lo = fr(TL["lobbyOff"])
S(relay_clunk(R) * 1.4, lo, -7, 0.4, "THE LAST LIGHT DIES (relay)")
S(power_down(R, 0.6), lo + 0.02, -16, 0.4)
S(impact(R) * 0.35, fr(TL["blacks"][1][1]) + 0.05, -14, 0, "you slam into the stairs door (push bar)")
S(click(R, 900, 1.0), fr(TL["blacks"][1][1]) + 0.08, -12, 0, "push bar clack")
# ---- the stairwell: down past -2; behind the bricks, very faint, someone typing ----
sw0, sw1 = fr(TL["stairWalk"][0]), fr(TL["stairWalk"][1])
for i, t in enumerate(np.arange(sw0 + 0.1, sw1, 0.36)): S(step(R, True), t, -16, 0.1 if i % 2 else -0.1, "footsteps going down" if i == 0 else None)
t = ST0 + 0.9
while t < F3 - 0.15:
    S(lp(key_clack(R), 2400, 2), t, -31, 0.25, "faint typing behind the bricked door" if t < ST0 + 0.95 else None); t += R.uniform(0.09, 0.2)
# ---- -3 ----
S(door_slide(R, 0.7, True) * 0.6, F3 + 0.05, -16, 0.3, "the stairwell door onto -3")
S(widen(static_burst(R, 0.4), R), T(15), -20, 0, "the feed: a little static")
S(ui_pop(R, 520) * 0.6, fr(TL["raise"][0]) + 0.1, -20, 0, "live: every screen lifts a hand")
S(dong(R, 41, 3.0), T(17) + 0.1, -15, 0, "the sign")
fo = fr(TL["figOn"])
S(widen(static_burst(R, 0.6), R), fo - 0.05, -9, 0, "EVERY SCREEN: glitch")
S(impact(R) * 0.6, fo, -9, 0, "IT'S BEHIND YOU: hit")
cp0, cp1 = fr(TL["cctvPush"][0]), fr(TL["cctvPush"][1])
S(zoom_servo(R, 0.8), cp0 + 0.2, -20, 0, "digital zoom servo")
S(zoom_servo(R, 0.9), cp0 + 3.0, -20, 0)
S(dong(R, 37, 3.0), wt(23, "facing", 0) - 0.05 if False else wt(23, "Facing") - 0.05, -12, 0, "'Facing you': low hit")
S(heart(R, 1.2), fr(TL["yours"]), -8, 0, "'Like yours': one heartbeat")
S(widen(breath(R, 0.6, 1.1), R, 3) * 0.6, T(19) + 0.3, -26, -0.7, "a breath, close behind (left)")
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
# recap: Part 3's heartbeat + drone carry over
t = TZ
while t < T(2):
    M(heart(R, 0.9), t, -10); t += 60 / 96
drone(TZ - 0.3, T(2) + 0.5, [38, 44, 50, 56, 57], 0.5, 600, trem=lambda t: 1 + 0.3 * np.sin(TAU * 0.5 * t), gain=-12)
cue(TZ, "music: the choice's heartbeat + drone carry over")
# branch 1: a cold teal drone; a string cluster on the pull, then nothing
drone(T(2), pull, [33, 40, 45], 0.5, 380, gain=-12)
M(I.pad([m2f(n) for n in (62, 63, 68, 69, 74, 75)], 3.0, 0.5, R, att=0.2, rel=1.4, warm=2600, detune=16), pull - 0.05, -13); cue(pull - 0.05, "music: string-cluster stinger (the pull)")
# branch 2: a pulse that tightens while you climb; it cuts with the last light
drone(r1 + 0.1, lo, [38, 45, 53], 0.45, 480, gain=-14)
t = T(6)
while t < lo:
    u = (t - T(6)) / max(0.1, lo - T(6)); M(heart(R, 0.75 + 0.25 * u), t, -13 + 3 * u); t += 60 / (90 + 45 * u)
cue(T(6), "music: climbing pulse")
M(I.pad([m2f(n) for n in (61, 62, 67, 68)], 2.2, 0.45, R, att=0.05, rel=1.2, warm=2200, detune=14), fr(TL["grab"]) - 0.03, -15); cue(fr(TL["grab"]), "music: stab on the grab")
# the stairwell and -3: a low red drone, then the motif as the screens come on
drone(fr(TL["blacks"][1][1]), F3 + 0.5, [26, 32, 37], 0.55, 300, gain=-12)
drone(F3, fo, [38, 45, 50], 0.45, 520, gain=-14)
motif(wt(18) - 0.1, 0.42, slow=1.25, gain=-15, detune=0.012); cue(wt(18) - 0.1, "music: the motif as the monitors appear")
M(I.pad([m2f(n) for n in (62, 63, 68, 69, 74, 75)], 3.5, 0.5, R, att=0.15, rel=1.5, warm=2600, detune=16), fo - 0.03, -12); cue(fo, "music: cluster on the reveal")
drone(fo + 0.5, DUR + 0.5, [26, 33, 38, 44], 0.55, 300, trem=lambda t: 1 + 0.3 * np.sin(TAU * 0.7 * t), gain=-12)
t = fr(TL["tagsAt"]) - 4.0
while t < DUR - 0.4:
    u = (t - (fr(TL["tagsAt"]) - 4)) / (DUR - fr(TL["tagsAt"]) + 4)
    M(heart(R, 1.0), t, -9 + 2 * u); t += 60 / (78 + 30 * u)
motif(wt(28) - 0.1, 0.4, slow=0.9, oct=1, gain=-15)
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
def limit(mix, ceil_db=-1.9):
    ceil = dbg(ceil_db)
    look = ns(0.004)
    pk = ndimage.maximum_filter1d(np.abs(mix).max(0), 2 * look + 1)
    gain = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    gain = -ndimage.maximum_filter1d(-gain, ns(0.01))
    a = np.exp(-1 / ns(0.08))
    g = gain.copy()
    for i in range(1, len(g)): g[i] = min(gain[i], a * g[i - 1] + (1 - a) * gain[i])
    return mix * g[None, :]
for _ in range(10):
    mix *= dbg(-14.0 - lufs(mix))
    mix = limit(mix)
tp = true_peak(mix)
if tp > -1.0: mix *= dbg(-1.0 - tp - 0.05)
mix[:, -ns(0.12):] *= np.linspace(1, 0, ns(0.12))[None, :]

OUT = os.path.join(ROOT, "out", "audio4")
os.makedirs(OUT, exist_ok=True)
write_wav(os.path.join(OUT, "mix.wav"), mix)
write_wav(os.path.join(OUT, "stem_voice.wav"), voice)
write_wav(os.path.join(OUT, "stem_music.wav"), mus)
write_wav(os.path.join(OUT, "stem_sfx.wav"), sfx)
rep = [f"# Sound cues: Floor Zero, Part 4 ({DUR:.3f} s, {N} samples @ {SR} Hz)",
       f"mix integrated {lufs(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP; stems integrated: voice {lufs(voice):.1f}, music {lufs(mus):.1f}, sfx {lufs(sfx):.1f} LUFS", ""]
rep += [f"- {t:7.3f} s (f{round(t * FPS):4d})  {w}" for t, w in sorted(CUES)]
open(os.path.join(OUT, "cues.md"), "w").write("\n".join(rep) + "\n")
print("\n".join(rep[:2]))
print(len(CUES), "cues")
