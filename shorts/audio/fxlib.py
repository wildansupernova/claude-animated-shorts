# Cartoon SFX library for the ocean shorts (own numpy synthesis on top of dsp.py / sfx_gen.py / instruments.py).
# Every generator returns a mono float array at SR (48 kHz) or a (2, n) stereo array.
import numpy as np
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, make_ir, convolve_st, st, pan
import sfx_gen as G
import instruments as I


def _r(seed):
    return rng(seed)


def pop(seed=1, f0=900):
    t = tt(0.12)
    y = np.sin(phase(f0 * np.exp(-t / 0.03) + 200)) * np.exp(-t / 0.03)
    return fades(y * 0.9, 0.0005, 0.02)


def boing(seed=1, f0=180, dur=0.6):
    t = tt(dur)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.08)) * (1 + 0.08 * np.sin(TAU * 14 * t) * np.exp(-t / 0.3))
    y = np.sin(phase(f)) * np.exp(-t / 0.22)
    return fades(y * 0.8, 0.002, 0.05)


def whoosh(seed=1, dur=0.6, peak=0.18, lo=300, hi=2600):
    return G.whoosh(dur, _r(seed), peak=peak, f_lo=lo, f_hi=hi, width=0.8, tail=0.18, air=0.2) * 0.9


def bubbles(seed=1, dur=1.0, rate=40, lo=300, hi=2200, decay=None):
    r = _r(seed)
    t = tt(dur)
    env = np.exp(-t / decay) if decay else np.ones(len(t))
    return G.bubbles(dur, r, rate, lo, hi, (0.006, 0.03), env) * 0.8


def toot(seed=1, dur=0.45, f0=95, wet=1.0):
    """cartoon 'pfffrt': buzzy low reed tone with pitch wobble + air, then a burst of bubbles"""
    r = _r(seed)
    t = tt(dur)
    f = f0 * (1 + 0.25 * np.sin(TAU * 9 * t + r.uniform(0, 3))) * (1 - 0.25 * t / dur)
    ph = phase(f)
    saw = 2 * ((ph / TAU) % 1) - 1
    buzz = bp(saw, 80, 1800, 2) * (np.sin(TAU * 31 * t) * 0.35 + 0.65)
    air = bp(r.standard_normal(len(t)), 400, 3000, 1) * 0.25
    env = np.minimum(1, t / 0.02) * np.exp(-np.maximum(0, t - dur * 0.6) / 0.06)
    y = (buzz * 0.9 + air) * env
    b = bubbles(seed + 5, 1.0, 60, 400, 2600, 0.35) * 0.7 * wet
    out = np.zeros(ns(1.0))
    out[:len(y)] += y
    out += b
    return fades(out, 0.002, 0.08)


def sonar_ping(seed=1, f0=1480, dur=2.2):
    t = tt(dur)
    y = np.sin(phase(f0 * (1 + 0.004 * np.exp(-t / 0.3)))) * np.exp(-t / 0.35) * np.minimum(1, t / 0.004)
    y += 0.3 * np.sin(phase(f0 * 2.01)) * np.exp(-t / 0.15)
    ir = make_ir(1.8, seed, hf=0.6)
    return convolve_st(st(y * 0.6), ir) * 0.8 + st(y * 0.4)


def crackle(seed=1, dur=2.0, density=300):
    """frying-bacon hiss: dense random clicks through a bright band + soft noise bed"""
    r = _r(seed)
    n = ns(dur)
    y = np.zeros(n)
    k = 0
    while k < n - 400:
        L = int(r.uniform(30, 200))
        c = r.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * r.uniform(0.2, 1)
        y[k:k + L] += c
        k += int(r.exponential(SR / density))
    y = hp(y, 1800, 2)
    bed = bp(colored(n, r, 0.2), 2500, 9000, 1) * 0.12 * (0.7 + 0.3 * smooth_noise(n, r, 3))
    return fades((y * 0.5 + bed), 0.05, 0.2)


def siren(seed=1, dur=1.2, lo=620, hi=880, rate=2.6):
    t = tt(dur)
    f = np.where((t * rate) % 1 < 0.5, lo, hi)
    ph = phase(f)
    y = np.sign(np.sin(ph)) * 0.35 + np.sin(ph) * 0.4
    y = lp(y, 3000)
    return fades(y * np.minimum(1, t / 0.02), 0.01, 0.1)


def impact(seed=1, f0=55, dur=0.9, crack=0.5):
    r = _r(seed)
    t = tt(dur)
    boom = np.sin(phase(f0 * (1 + 1.2 * np.exp(-t / 0.03)))) * np.exp(-t / 0.22)
    nz = lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.06) * 0.8
    cr = hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.01) * crack
    return fades((boom * 1.4 + nz + cr) * 0.8, 0.0, 0.1)


def thud(seed=1):
    return impact(seed, 70, 0.5, 0.15) * 0.8


def ding(seed=1, f=1568.0, vel=0.7):
    return I.glock(f, vel, _r(seed), 1.6)


def sparkle(seed=1, base=1568.0):
    out = np.zeros(ns(1.6))
    for i, m in enumerate([0, 4, 7, 12, 16]):
        y = I.glock(base * 2 ** (m / 12), 0.5, _r(seed + i), 1.0)
        a = ns(i * 0.05)
        out[a:a + len(y)] += y[:len(out) - a]
    return out * 0.7


def record_scratch(seed=1):
    r = _r(seed)
    t = tt(0.45)
    f = 900 * (1 + 0.9 * np.sin(TAU * 3.2 * t))
    nz = r.standard_normal(len(t))
    y = bp(nz, 500, 4000) * (0.6 + 0.4 * np.sin(phase(f)))
    return fades(y * np.exp(-t / 0.25), 0.002, 0.05) * 1.1


def squeak(seed=1, dur=1.2, f0=1100):
    """balloon air squeal: wobbling high tone + breathy noise"""
    r = _r(seed)
    t = tt(dur)
    f = f0 * (1 + 0.35 * smooth_noise(len(t), r, 6)) * (1 + 0.25 * np.sin(TAU * 7 * t))
    y = np.sin(phase(f)) * 0.5 + 0.25 * np.sin(phase(f * 2.02))
    y += bp(r.standard_normal(len(t)), 1500, 5000) * 0.15
    env = np.minimum(1, t / 0.03) * (0.8 + 0.2 * smooth_noise(len(t), r, 10))
    return fades(y * env, 0.01, 0.1) * 0.7


def tape_whirr(seed=1, dur=2.0):
    r = _r(seed)
    t = tt(dur)
    m = np.sin(phase(np.full(len(t), 92.0))) * 0.3 + bp(r.standard_normal(len(t)), 600, 2400) * 0.12
    m *= 0.8 + 0.2 * np.sin(TAU * 4 * t)
    return fades(m, 0.15, 0.2)


def engine_hum(seed=1, dur=2.0, f0=48):
    r = _r(seed)
    t = tt(dur)
    y = np.sin(phase(f0 * (1 + 0.02 * smooth_noise(len(t), r, 1)))) + 0.5 * np.sin(phase(f0 * 2))
    y += lp(r.standard_normal(len(t)), 300) * 0.6
    y *= 0.7 + 0.3 * np.sin(TAU * 7.5 * t)
    return fades(y * 0.6, 0.2, 0.3)


def gull(seed=1):
    r = _r(seed)
    out = np.zeros(ns(1.2))
    for i in range(3):
        d = 0.18 + 0.05 * i
        t = tt(d)
        f = 1700 * (1 - 0.35 * t / d) * (1 + 0.04 * np.sin(TAU * 40 * t))
        y = np.sin(phase(f)) * np.sin(np.pi * t / d) ** 0.7 + 0.3 * bp(r.standard_normal(len(t)), 1500, 3500) * np.sin(np.pi * t / d)
        a = ns(i * 0.24)
        out[a:a + len(y)] += y * (0.7 - 0.15 * i)
    return out * 0.5


def crickets(seed=1, dur=2.0):
    return G.crickets(dur, _r(seed), 3) * 1.2


def wind(seed=1, dur=2.0):
    return G.breeze(dur, _r(seed), 1.0, 0.3, 700)


def applause(seed=1, dur=2.5):
    t = tt(dur)
    return G.applause(dur, _r(seed), 30, np.minimum(1, t / 0.2) * np.exp(-np.maximum(0, t - dur + 0.8) / 0.3))


def underwater_bed(seed=1, dur=4.0):
    r = _r(seed)
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        rum = lp(colored(n, r, 1.5), 260, 2) * 0.7
        mov = bp(colored(n, r, 0.5), 150, 900, 1) * 0.25 * (0.6 + 0.4 * smooth_noise(n, r, 0.4))
        bub = G.bubbles(dur, r, 6, 200, 1400, (0.008, 0.03)) * 0.25
        out[ch] = rum + mov + bub
    return out


def sea_bed(seed=1, dur=4.0):
    """surface sea: waves wash + gulls far away"""
    r = _r(seed)
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        sw = 0.5 + 0.5 * np.sin(TAU * 0.18 * np.arange(n) / SR + ch + r.uniform(0, 3)) ** 2
        out[ch] = bp(colored(n, r, 0.7), 150, 3500, 1) * 0.35 * sw
    return out


def room_tone(seed=1, dur=4.0):
    r = _r(seed)
    n = ns(dur)
    return st(lp(colored(n, r, 1.0), 400) * 0.25 + 0.03 * np.sin(phase(np.full(n, 60.0))))


def tick_clock(seed=1, dur=2.0, rate=2.0):
    out = np.zeros(ns(dur))
    r = _r(seed)
    for k in range(int(dur * rate)):
        c = modal(0.05, [(3200, 1, 0.004), (5100, 0.5, 0.002)], r) * (0.6 if k % 2 else 0.4)
        a = ns(k / rate)
        out[a:a + len(c)] += c[:len(out) - a]
    return out


def flag_fall(seed=1):
    """pole creak + whoosh + thud"""
    r = _r(seed)
    out = np.zeros(ns(1.4))
    c = G.creak(0.4, r, 60, 120)
    out[:len(c)] += c * 0.6
    w = whoosh(seed, 0.5, 0.3)
    a = ns(0.25)
    out[a:a + len(w)] += w[:len(out) - a]
    th = impact(seed, 60, 0.7, 0.3)
    a = ns(0.55)
    out[a:a + len(th)] += th[:len(out) - a] * 0.9
    return out


def splashy(seed=1):
    return G.splash_big(_r(seed)) * 0.5


def gulp(seed=1):
    t = tt(0.3)
    f = 300 * (1 + 1.5 * t / 0.3)
    y = np.sin(phase(f)) * np.exp(-((t - 0.08) / 0.06) ** 2)
    return fades(y * 0.8 + bubbles(seed, 0.3, 40, 400, 1500) * 0.4, 0.002, 0.04)


def camera_shutter(seed=1):
    r = _r(seed)
    return fades(hp(r.standard_normal(ns(0.08)), 2000) * np.exp(-tt(0.08) / 0.01), 0, 0.01)


def zap(seed=1, dur=0.6):
    r = _r(seed)
    t = tt(dur)
    buzz = np.sign(np.sin(phase(120 + 60 * smooth_noise(len(t), r, 30)))) * 0.4
    crack = hp(r.standard_normal(len(t)), 1500) * (r.random(len(t)) < 0.02) * 3
    y = (buzz + bp(r.standard_normal(len(t)), 2000, 8000) * 0.6 + crack) * np.exp(-t / 0.25)
    return fades(y * 0.7, 0.001, 0.05)


def slime(seed=1, dur=0.8):
    """wet squelch: low-passed bursty noise with a resonant glide"""
    r = _r(seed)
    t = tt(dur)
    f = 400 * (1 - 0.5 * t / dur)
    y = lp(r.standard_normal(len(t)), 1200) * (0.5 + 0.5 * np.sin(phase(f))) * np.exp(-t / 0.25)
    y += np.sin(phase(f * 0.5)) * np.exp(-t / 0.15) * 0.4
    return fades(y * 0.8, 0.005, 0.1)


def explosion(seed=1, dur=3.0):
    r = _r(seed)
    t = tt(dur)
    boom = np.sin(phase(42 * (1 + 2 * np.exp(-t / 0.05)))) * np.exp(-t / 0.6) * 1.5
    rum = lp(colored(len(t), r, 1.5), 400) * np.exp(-t / 0.9) * 2.5
    crack = bp(r.standard_normal(len(t)), 500, 6000) * np.exp(-t / 0.08) * 1.2
    deb = G.bubbles(dur, r, 300 * np.exp(-t / 0.6) + 5, 800, 4000, (0.003, 0.01), np.exp(-t / 1.0)) * 0.5
    return fades((boom + rum + crack + deb) * 0.7, 0.0, 0.4)


def buzz(seed=1, dur=2.0):
    """flies buzzing around"""
    r = _r(seed)
    t = tt(dur)
    out = np.zeros(len(t))
    for k in range(3):
        f = 210 + 40 * k + 30 * smooth_noise(len(t), r, 3)
        saw = 2 * ((phase(f) / TAU) % 1) - 1
        out += bp(saw, 150, 2500) * (0.5 + 0.5 * smooth_noise(len(t), r, 1.5)) * 0.4
    return fades(out, 0.2, 0.3)


def horn(seed=1, dur=0.5):
    t = tt(dur)
    y = np.zeros(len(t))
    for f in (330, 415):
        ph = phase(np.full(len(t), float(f)))
        y += np.sign(np.sin(ph)) * 0.3 + np.sin(ph) * 0.3
    return fades(lp(y, 2500) * 0.6, 0.01, 0.05)


def beep(seed=1, f=880.0, dur=0.18):
    t = tt(dur)
    return fades(np.sin(phase(np.full(len(t), f))) * 0.6, 0.004, 0.03)


def sad_trombone(seed=1):
    r = _r(seed)
    out = np.zeros(ns(2.6))
    notes = [(I.m2f(58), 0.0, 0.42), (I.m2f(57), 0.45, 0.42), (I.m2f(56), 0.9, 0.42), (I.m2f(55), 1.35, 1.0)]
    for f, t0, d in notes:
        y = I.brass(f, d, 0.55, r, "soft", scoop=-10, fall=-0.6 if t0 > 1 else 0.0)
        a = ns(t0)
        out[a:a + len(y)] += y[:len(out) - a]
    return out * 0.8


def crunch(seed=1):
    """car roof crushed: heavy thump + metal crumple + glass shatter"""
    r = _r(seed)
    out = np.zeros(ns(1.5))
    th = impact(seed, 50, 0.8, 0.4)
    out[:len(th)] += th * 1.2
    for i in range(14):
        m = modal(0.25, [(r.uniform(300, 900), 1, 0.05), (r.uniform(1200, 3000), 0.6, 0.03)], r) * r.uniform(0.2, 0.7)
        a = ns(0.01 + abs(r.normal(0, 0.06)))
        out[a:a + len(m)] += m[:len(out) - a]
    for i in range(30):
        gl = modal(0.12, [(r.uniform(3000, 8000), 1, 0.02), (r.uniform(6000, 11000), 0.6, 0.01)], r) * r.uniform(0.1, 0.4)
        a = ns(0.05 + r.exponential(0.12))
        if a < len(out):
            out[a:a + len(gl)] += gl[:len(out) - a]
    return out


def rip(seed=1, dur=0.5):
    r = _r(seed)
    t = tt(dur)
    y = bp(r.standard_normal(len(t)), 300, 4000) * (0.5 + 0.5 * (r.random(len(t)) < 0.3)) * np.exp(-t / 0.2)
    return fades(y + slime(seed, dur) * 0.5, 0.002, 0.05)


def murmur(seed=1, dur=3.0):
    r = _r(seed)
    out = np.zeros(ns(dur))
    for k in range(5):
        out += G.babble(dur, r, r.uniform(110, 210), r.uniform(0.9, 1.1))[:len(out)] * 0.3
    return out


def thunder(seed=1, dur=1.5):
    r = _r(seed)
    t = tt(dur)
    return fades(lp(colored(len(t), r, 1.6), 300) * np.exp(-t / 0.5) * (1 - np.exp(-t / 0.05)), 0.01, 0.2)


def rain(seed=1, dur=2.0):
    return G.bubbles(dur, _r(seed), 120, 2000, 6000, (0.002, 0.006)) * 0.6


def fuse(seed=1, dur=1.5):
    return crackle(seed, dur, 900) * 0.8


def flaps(seed=1, dur=1.2):
    out = np.zeros(ns(dur))
    for k in range(int(dur * 9)):
        w = whoosh(seed + k, 0.12, 0.03, 600, 2400)
        a = ns(k / 9 + 0.02 * (k % 3))
        out[a:a + len(w)] += w[:len(out) - a] * 0.5
    return out


def kaching(seed=1):
    out = np.zeros(ns(1.4))
    c = modal(0.1, [(2400, 1, 0.01), (3700, 0.5, 0.008)], _r(seed)) * 0.8
    out[:len(c)] += c
    d = I.glock(2093.0, 0.8, _r(seed), 1.2)
    a = ns(0.08)
    out[a:a + len(d)] += d[:len(out) - a]
    return out


GEN = {k: v for k, v in globals().items() if callable(v) and not k.startswith("_") and k not in ("np",)}
