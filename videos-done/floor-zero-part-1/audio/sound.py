# Sound for "Floor Zero, Part 1": an original dark score + synthesized SFX + the narration, all from numpy (dsp.py /
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
TL = json.load(open(os.path.join(ROOT, "out", "timeline.json")))
WORDS = json.load(open(os.path.join(ROOT, "voice", "words.json")))
FPS, TOTAL = TL["FPS"], TL["TOTAL"]
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
CUES = []
def cue(t, what): CUES.append((t, what))
R = rng(1213)
wt = lambda li, w=None, k=0: [x for x in WORDS if x["line"] == li and (w is None or x["w"].lower().strip(".,?") == w.lower())][k]["s"]
shot = {s["id"]: s for s in TL["shots"]}
T = lambda i: fr(shot[i]["a"])
JOLT = fr(TL["jolt"])

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

# ================================================================ SFX stem
sfx = np.zeros((2, N))
def S(x, t, gain_db=0.0, p=0.0, what=None):
    if x.ndim == 1: x = pan(x, p)
    place(sfx, x, t, dbg(gain_db))
    if what: cue(t, what)

# ---- office room tone + fluorescent hum (thinning as the rows die), until the doors shut
t_shut = fr(TL["close1"]) + 0.95
rt = roomtone(t_shut + 0.5, R) * 0.5
hm = hum(t_shut + 0.5, R)
rows_on = np.ones(len(hm))
for k, f0 in enumerate(TL["rowOff"]):
    rows_on[ns(fr(f0)):] -= 0.17
S(widen(rt * curve(len(rt), [(0, 1), (t_shut - 0.6, 1), (t_shut, 0.2), (t_shut + 0.5, 0)]), R), 0, -18, what="office room tone")
S(widen(hm * rows_on * curve(len(hm), [(0, 1), (t_shut - 0.5, 1), (t_shut, 0.1), (t_shut + 0.5, 0)]), R, 7), 0, -27, what="fluorescent hum")
for k, f0 in enumerate(TL["rowOff"]):
    S(relay_clunk(R), fr(f0), -9 - 0.8 * (4 - k), p=0.0, what=f"row {k} lights off (clunk)")
S(casters(R), fr(TL["rise"]), -16, -0.3, "chair rolls back")
# clock ticks (shot 2)
for i in range(6):
    S(click(R, 3300, 0.6), T(2) + 0.08 + i * 1.0 - (T(2) % 1.0), -24, 0.2, "clock tick" if i == 0 else None)
# footsteps on carpet: walk phase (z + 2.3) / 1.1, a step every half cycle
w0, w1 = TL["walk"]; z0, z1 = -2.3, 1.55
def walk_steps(fa, fb, za, zb, base, hard):
    out = []
    for f in range(fa, fb):
        u0, u1 = (f - fa) / (fb - fa), (f + 1 - fa) / (fb - fa)
        p0, p1 = (za + (zb - za) * u0 - base) / 1.1, (za + (zb - za) * u1 - base) / 1.1
        if np.floor(p1 * 2) > np.floor(p0 * 2): out.append(fr(f))
    for i, t in enumerate(out): S(step(R, hard), t, -15 if hard else -17, -0.15 if i % 2 else 0.15, "footsteps" if i == 0 else None)
walk_steps(w0, w1, z0, z1, -2.3, False)
e0, e1 = TL["enter"]
walk_steps(e0, e1, 1.72, 3.12, 1.72, True)
# call button, the elevator arrives, doors
S(click(R, 2000), fr(TL["callPress"]), -12, -0.4, "call button")
S(beep(1318, 0.09, 0.5), fr(TL["callPress"]) + 0.03, -22, -0.4)
S(elevator_ding(R, 0.6), fr(TL["open1"]) - 0.35, -14, 0.0, "elevator arrives: ding")
S(door_slide(R, 1.0, True), fr(TL["open1"]), -12, 0.0, "doors open")
S(click(R, 2400), fr(TL["pressG"]), -12, 0.5, "press G")
S(beep(1046, 0.09, 0.5), fr(TL["pressG"]) + 0.03, -22, 0.5)
S(door_slide(R, 0.95, False), fr(TL["close1"]), -11, 0.0, "doors close")
# the car: motor + descending shaft wind from the close until the jolt
t_mv = fr(TL["close1"]) + 0.9
mb = motor_bed(JOLT - t_mv + 0.1, R)
S(widen(mb * curve(len(mb), [(0, 0), (0.6, 1), (JOLT - t_mv - 0.05, 1.15), (JOLT - t_mv, 0)]), R), t_mv, -17, what="car motor")
sw = shaft_wind(JOLT - t_mv, R, 1100, 160)
S(widen(sw * curve(len(sw), [(0, 0.2), (10, 0.6), (JOLT - t_mv - 4, 1.0), (JOLT - t_mv - 0.05, 1.4), (JOLT - t_mv, 0)]), R, 13), t_mv, -20, what="shaft wind (deepening)")
cab_hum = hum(DUR - t_mv, R, 100.0, 0.6)
S(widen(cab_hum, R, 5), t_mv, -31, what="car light hum")
# floor counter blips
prev = None
for f, d in TL["display"]:
    if d in ("12",) or f < TL["close1"]: continue
    if d in ("3", "2", "1"): S(beep(880, 0.12, 0.55), fr(f), -19, 0, f"floor {d}")
    elif d == "G": S(chime([79], R, 0.6), fr(f), -17, 0, "floor G (chime)")
    elif d == "v": S(beep(330, 0.06, 0.4), fr(f), -30)
    elif d == "0": pass
    elif d.isdigit(): S(beep(880, 0.06, 0.35), fr(f), -27)
# flickers: electrical crackle
fl = [f for f, k in TL["flicker"]]
if fl:
    groups, g0 = [], [fl[0]]
    for f in fl[1:]:
        if f - g0[-1] > 2: groups.append(g0); g0 = [f]
        else: g0.append(f)
    groups.append(g0)
    for g in groups: S(crackle(R, (g[-1] - g[0] + 3) / FPS), fr(g[0]), -19, 0.2, "light flicker crackle")
# G pressed again x3
for f in TL["pumps"]: S(click(R, 2400, 1.0), fr(f), -11, 0.4, "G pressed again")
# the phone comes up: a low-battery chirp
S(beep(1760, 0.07, 0.4), T(10) + 0.35, -24, -0.1, "phone low battery chirp")
S(beep(1760, 0.07, 0.4), T(10) + 0.5, -24, -0.1)
# emergency bell: rings out, nobody answers, the line clicks dead
S(click(R, 1700), fr(TL["bell"]), -12, 0.4, "emergency button")
for t in [fr(TL["bell"]) + 0.25, fr(TL["rings"][0]) - 0.05, fr(TL["rings"][1]) + 0.2]:
    S(ringback(1.15), t, -17, 0.3, "ringback")
S(click(R, 900, 0.8), wt(14, "answers") + 0.55, -16, 0.3, "line goes dead")
# new buttons: descending vibes chime per button + glow hum swell
for i, f in enumerate(TL["newBtn"]):
    S(I.vibes(I.m2f([76, 74, 72, 71, 69, 67, 65, 64][i]), 0.55, R, dur=1.6, trem_depth=0.3), fr(f), -18 + 0.4 * i, 0.4 - 0.1 * i, f"button {['0','-1','-2','-3','-4','-5','-6','-7'][i]} appears")
# the jolt
S(impact(R), JOLT, -3, 0, "JOLT: impact, metal, cable twang")
S(G.rattle(0.6, R, 40, np.exp(-np.linspace(0, 1, ns(0.6)) * 4), heavy=True), JOLT + 0.03, -16, 0.3)
S(dong(R, 49), fr(TL["zeroLit"]), -11, 0, "floor zero: deep dong")
S(beep(220, 0.5, 0.4), fr(TL["zeroLit"]) + 0.02, -26, 0)
# turn to the mirror: cloth + paper
S(rustle(R, 0.5), fr(TL["turn2"]), -24, -0.2, "turn (cloth)")
S(rustle(R, 0.4), T(16) + 0.4, -27, 0.2, "card paper")
# ding: floor zero doors open (slower, heavier)
t_ding = wt(26, "ding") - 0.05
S(elevator_ding(R, 0.5), t_ding, -10, 0, "soft ding")
S(door_slide(R, 1.35, True), fr(TL["open2"]), -12, 0, "doors open on floor zero")
# chairs finish turning: swivel creaks
c0, c1 = TL["chairTurn"]
S(squeak(R, (c1 - c0) / FPS * 0.6, 380, 520), fr(c0) + 0.1, -21, 0.5, "chair swivel creak")
S(squeak(R, (c1 - c0) / FPS * 0.5, 450, 600), fr(c0) + 0.5, -23, 0.7)
# the computer types Y, O, U
for i, f in enumerate(TL["type"]): S(key_clack(R), fr(f), -13, 0.25, "key: " + "YOU"[i])
# breathing: in time with the figure (3.4 s period), close and behind
b0 = fr(TL["breath"][0])
t = b0
k = 0
while t < DUR - 1.0:
    g = -19 if t < wt(34, "Right") + 1 else -22
    S(widen(breath(R, 1.15, 1.6), R, 9), t, g, -0.25, "breathing" if k == 0 else None)
    t += 3.4; k += 1
# dolly zoom on "Right behind you": riser into a sub boom
tr = wt(34, "Right")
S(G.whoosh(1.0, R, peak=0.75, f_lo=200, f_hi=1600, tail=0.2), tr - 0.75, -15, 0, "dolly zoom riser")
S(dong(R, 41, 2.5), tr, -12, 0, "sub boom")
# POV turn whoosh, the neck crack on "wall"
S(G.whoosh(0.8, R, peak=0.35, f_lo=300, f_hi=2400, tail=0.25), T(24) + 0.05, -17, -0.3, "POV turn whoosh")
S(neck_crack(R), wt(36, "wall") - 0.03, -15, -0.3, "head twitch: neck crack")
# the doors start to close (slow, groaning)
S(door_slide(R, 3.5, True), fr(TL["close2"]), -15, 0, "doors start to close (slow)")
# choice tags
S(ui_pop(R, 700), fr(TL["tagsAt"]), -20, -0.4, "tag 1 pops")
S(ui_pop(R, 980), fr(TL["tagsAt"]) + 5 / FPS, -20, 0.4, "tag 2 pops")
# short car room on everything
room = convolve_st(sfx.mean(0), make_ir(0.35, 7, hf=1.8)) * dbg(-17)
sfx = sfx + room

# ================================================================ music
mus = np.zeros((2, N))
def M(x, t, gain_db=0.0, p=0.0):
    if x.ndim == 1: x = pan(x, p)
    place(mus, x, t, dbg(gain_db))
m2f = I.m2f
# the Floor Zero motif: four falling notes (a lift going down): A4 F4 D4 C#4
MOTIF = [69, 65, 62, 61]
def motif(t0, vel=0.55, slow=1.0, oct=0, gain=-12, detune=0.0):
    for i, m in enumerate(MOTIF):
        f = m2f(m + 12 * oct) * (1 + detune * (i % 2 * 2 - 1))
        M(I.musicbox(f, vel, R, 2.4), t0 + i * 0.42 * slow, gain, 0.3 * np.sin(i))
# drone bed (D minor, low), evolving per act
def drone(t0, t1, notes, vel=0.5, warm=500, trem=None, gain=-10):
    M(I.pad([m2f(n) for n in notes], t1 - t0, vel, R, att=1.5, rel=1.2, warm=warm, detune=9, trem=trem), t0, gain)
cue(0, "music: motif on music box over the empty office")
motif(0.35, 0.5, gain=-11)
motif(3.0, 0.42, gain=-14)
drone(0, T(5), [38, 45, 53], 0.45, 480, gain=-13)
drone(T(5), JOLT, [38, 44, 50, 57], 0.45, 420, trem=lambda t: 1 + 0.18 * np.sin(TAU * 0.25 * t), gain=-12)
cue(T(5), "music: drone darkens in the car (tritone)")
# riser into the jolt: dissonant cluster swell + noise, cut dead on the impact
rs = JOLT - fr(TL["newBtn"][0])
cl = I.pad([m2f(n) for n in (62, 63, 68, 69, 74)], rs, 0.5, R, att=rs * 0.9, rel=0.02, warm=2500, detune=14)
cl = cl[:, : ns(rs)] * np.linspace(0.2, 1.3, ns(rs))[None, :] ** 2
M(cl, fr(TL["newBtn"][0]), -14)
M(widen(G.whoosh(rs, R, peak=rs * 0.97, f_lo=200, f_hi=5000, tail=0.02), R), fr(TL["newBtn"][0]), -18)
cue(fr(TL["newBtn"][0]), "music: riser into the jolt")
# heartbeat: from the panel change until the jolt (60 -> 84 bpm), stops on the impact
t = fr(TL["newBtn"][0]) - 3.0
while t < JOLT - 0.3:
    u = (t - (fr(TL["newBtn"][0]) - 3)) / (JOLT - fr(TL["newBtn"][0]) + 3)
    M(heart(R, 0.9), t, -10 + 2 * u)
    t += 60 / (60 + 24 * u)
# after the jolt: almost nothing (sub drone + a thin high tone under the card)
drone(JOLT + 0.4, wt(25), [26, 33], 0.6, 260, gain=-12)
t_hi = T(15) + 0.5
M(widen(np.sin(TAU * 2093 * tt(wt(25) - t_hi)) * curve(ns(wt(25) - t_hi), [(0, 0), (2, 1), (wt(25) - t_hi - 1, 1), (wt(25) - t_hi, 0)]) * 0.15, R), t_hi, -24)
cue(JOLT + 0.4, "music: sub drone, thin high tone under the card")
# false relief: a warm chord under the laugh
M(I.pad([m2f(n) for n in (50, 57, 62, 65)], 2.6, 0.4, R, att=0.4, rel=0.8, warm=900), wt(25) + 0.1, -16)
# floor zero: the motif again, slower, detuned, a low cluster swell
motif(wt(27) - 0.2, 0.45, slow=1.5, gain=-12, detune=0.012)
drone(T(18) + 1.0, wt(32), [38, 39, 45, 51], 0.5, 380, trem=lambda t: 1 + 0.25 * np.sin(TAU * 0.33 * t), gain=-11)
cue(T(18) + 1.0, "music: floor zero cluster + slow detuned motif")
# breathing section: drop to a sub only, then the boom (SFX), then the choice
drone(wt(32), wt(37), [26], 0.7, 200, gain=-12)
# the choice: heartbeat returns, faster; drone + motif high and thin on the question; cut at the end
t = wt(37) - 0.2
while t < DUR - 0.5:
    u = (t - wt(37)) / (DUR - wt(37))
    M(heart(R, 1.0), t, -9 + 2 * u)
    t += 60 / (78 + 30 * u)
drone(wt(37) - 0.3, DUR + 0.5, [38, 44, 50, 56, 57], 0.5, 600, trem=lambda t: 1 + 0.3 * np.sin(TAU * 0.5 * t), gain=-11)
motif(wt(41) - 0.1, 0.4, slow=0.9, oct=1, gain=-15)
cue(wt(37), "music: heartbeat returns for the choice")
mus = mus + convolve_st(mus.mean(0), make_ir(2.4, 3, hf=1.1)) * dbg(-10)

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

OUT = os.path.join(ROOT, "out", "audio")
os.makedirs(OUT, exist_ok=True)
write_wav(os.path.join(OUT, "mix.wav"), mix)
write_wav(os.path.join(OUT, "stem_voice.wav"), voice)
write_wav(os.path.join(OUT, "stem_music.wav"), mus)
write_wav(os.path.join(OUT, "stem_sfx.wav"), sfx)
rep = [f"# Sound cues: Floor Zero, Part 1 ({DUR:.3f} s, {N} samples @ {SR} Hz)",
       f"mix integrated {lufs(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP; stems integrated: voice {lufs(voice):.1f}, music {lufs(mus):.1f}, sfx {lufs(sfx):.1f} LUFS", ""]
rep += [f"- {t:7.3f} s (f{round(t * FPS):4d})  {w}" for t, w in sorted(CUES)]
open(os.path.join(OUT, "cues.md"), "w").write("\n".join(rep) + "\n")
print("\n".join(rep[:2]))
print(len(CUES), "cues")
