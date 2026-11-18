# Procedural sound effects (own numpy synthesis). Generic generators reused from the bridge template (creaks by
# stick-slip friction, clinks, rattles, whooshes, bubbles, water, birds, crickets, breeze, footsteps, hammer) - its
# formant-voice generators (grunts, crowd babble, cheers, applause) are removed: this short has NO vocal sounds.
# New for the Haber short: wind/howl, trench rumble, gas hiss, room tone, sparkles, flash impact, cartoon stings,
# waves, gulls, plops, rope strain, cannon, field guns, pump pistons, pressure creak, furnace, fire, drips, chimes,
# conveyor, sacks, shell clank, steam whistle/engine, watch and clock ticks, gas valves + cloud, alarm whistle,
# running boots, cowbells, poof, medal ding, confetti pop, spray can, bug thuds, searchlight hum, candle, low booms.
import numpy as np
from scipy import signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, ramp, fades, shape,
                 phase, modal, impulse_train, pan, st, widen)


def _place_mono(buf, x, t):
    i = ns(t)
    a, b = max(0, i), min(len(buf), i + len(x))
    if b > a:
        buf[a:b] += x[a - i: b - i]


# ================================================================ creak engine (stick-slip friction)
def stick_slip(dur, rate, r, jitter=0.12, amp=None, accel_noise=0.0):
    """impulse train whose instantaneous rate follows `rate` (array or float, Hz); returns (impulses, times)"""
    n = ns(dur)
    rt = np.full(n, rate, float) if np.isscalar(rate) else np.interp(np.arange(n), np.linspace(0, n - 1, len(rate)), rate)
    x = np.zeros(n)
    t = r.uniform(0, 1.0 / max(rt[0], 1))
    while t < dur:
        k = ns(t)
        if k >= n:
            break
        a = 1.0 if amp is None else amp[min(k, len(amp) - 1)]
        x[k] += a * r.uniform(0.55, 1.0)
        t += (1.0 / max(rt[k], 1.0)) * (1 + r.normal(0, jitter))
    return x


WOOD = [(230, 9, 1.0), (520, 12, 0.8), (940, 14, 0.55), (1650, 16, 0.35), (2800, 18, 0.18)]
TIMBER = [(95, 7, 1.0), (180, 9, 0.9), (330, 11, 0.7), (560, 12, 0.5), (930, 14, 0.3), (1500, 15, 0.15)]
CHAIN = [(190, 28, 0.9), (430, 34, 1.0), (760, 38, 0.8), (1180, 42, 0.6), (1720, 45, 0.45), (2500, 50, 0.3), (3400, 55, 0.18)]
SMALLMETAL = [(1850, 40, 1.0), (3100, 45, 0.8), (4600, 50, 0.6), (6900, 55, 0.35)]


def creak(dur, r, rate0=110, rate1=180, modes=WOOD, shape_pts=None, rough=0.12, noise=0.05, scale=1.0):
    """wooden/metal creak: friction impulses exciting a resonator bank; rate glides rate0 -> rate1 (with a bend)"""
    n = ns(dur)
    u = np.linspace(0, 1, 64)
    rate = rate0 + (rate1 - rate0) * u + 0.15 * (rate0 + rate1) / 2 * np.sin(np.pi * u) * r.uniform(-1, 1)
    env_pts = shape_pts or [(0, 0), (0.15, 1), (0.7, 0.85), (1.0, 0)]
    env = np.interp(np.linspace(0, 1, n), [p[0] for p in env_pts], [p[1] for p in env_pts])
    x = stick_slip(dur, rate, r, rough, env)
    md = [(f * scale * r.uniform(0.94, 1.06), q, g) for f, q, g in modes]
    y = resbank(x, md)
    y += noise * bp(r.standard_normal(n), 400, 4000, 1) * env
    return fades(y, 0.004, 0.03)


def clink(r, f0=None, dur=0.12, bright=1.0):
    """one small metal-on-metal clink (chain link, buckle, canteen)"""
    f0 = f0 or np.exp(r.uniform(np.log(1800), np.log(5200)))
    modes = [(f0, 1.0, r.uniform(0.012, 0.03)), (f0 * r.uniform(2.3, 2.9), 0.5 * bright, 0.01), (f0 * r.uniform(3.9, 5.1), 0.25 * bright, 0.006)]
    y = modal(dur, modes, r)
    t = tt(dur)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0008) * 0.4
    return y


def rattle(dur, r, density=30.0, env=None, heavy=False):
    """chain / kit rattle: a cloud of clinks"""
    n = ns(dur)
    y = np.zeros(n)
    cnt = int(density * dur) + 1
    times = np.sort(r.uniform(0, dur, cnt))
    for tm in times:
        k = ns(tm)
        a = 1.0 if env is None else env[min(k, n - 1)]
        if a < 0.02:
            continue
        c = clink(r, np.exp(r.uniform(np.log(700 if heavy else 1600), np.log(2600 if heavy else 5500))), 0.1)
        _place_mono(y, c * a * r.uniform(0.4, 1.0), tm)
    return y


# ================================================================ marching boots
def boot(r, hard=1.0):
    """one hobnailed boot heel on a wooden plank"""
    dur = 0.22
    t = tt(dur)
    f = r.uniform(78, 118)
    thump = np.exp(-t / r.uniform(0.028, 0.045)) * np.sin(phase(f * (1 + 0.18 * np.exp(-t / 0.012))))
    plank = modal(dur, [(r.uniform(170, 260), 0.6, r.uniform(0.018, 0.035)), (r.uniform(380, 620), 0.45, r.uniform(0.012, 0.025)),
                        (r.uniform(800, 1300), 0.25, 0.01)], r)
    nz = r.standard_normal(len(t))
    slap = bp(nz, 500, 3500, 1) * np.exp(-t / 0.006) * 0.5
    click = hp(nz, 3500) * np.exp(-t / 0.0012) * 0.22 * hard
    return thump + plank + slap + click


def column_stomp(r, intensity=1.0, foot=0, boots=30, spread=0.007, width=0.6, boom_gain=1.0):
    """74 men landing the same foot together: ~30 audible boots with tiny timing spread + deck boom + kit jingle"""
    dur = 0.6
    out = np.zeros((2, ns(dur)))
    pre = 0.03
    for i in range(boots):
        row = i // 4
        g = r.uniform(0.6, 1.0) * 10 ** (-0.35 * row / 20)
        dt = pre + abs(r.normal(0, spread)) * (1 if r.uniform() < 0.7 else -0.6)
        x = boot(r, intensity) * g
        p = np.clip((i % 4 - 1.5) / 1.5 * width * 0.6 + r.normal(0, 0.1) + (0.05 if foot else -0.05), -1, 1)
        k = ns(max(0, dt))
        seg = pan(x, p)
        m = min(seg.shape[1], out.shape[1] - k)
        out[:, k:k + m] += seg[:, :m]
    t = tt(dur)
    boom = np.exp(-t / 0.13) * np.sin(phase(r.uniform(47, 56) * (1 + 0.25 * np.exp(-t / 0.02)))) * 2.2 * intensity * boom_gain
    out += np.roll(st(boom), ns(pre), axis=1)
    kit = rattle(0.25, r, 50, np.exp(-np.linspace(0, 1, ns(0.25)) * 3)) * 0.35
    out[:, ns(pre + 0.02): ns(pre + 0.02) + len(kit)] += widen(kit, r, 9, 0.8)
    return out, pre


def deck_flex(r, a):
    """the deck answers a footfall once it is bouncing: low flex 'whump', plank creak on the rebound, hangers rattle"""
    dur = 0.75
    n = ns(dur)
    t = np.arange(n) / SR
    whump = np.exp(-t / 0.2) * np.sin(phase(r.uniform(38, 48) * (1 - 0.12 * t))) * (1 - np.exp(-t / 0.015))
    c = creak(r.uniform(0.2, 0.32) + 0.2 * a, r, r.uniform(70, 110), r.uniform(150, 260), WOOD, rough=0.15, scale=r.uniform(0.85, 1.2))
    y = whump * 1.6
    _place_mono(y, c * (0.35 + 0.65 * a), r.uniform(0.07, 0.13))
    ratt = rattle(0.35, r, 25 + 40 * a, np.exp(-np.linspace(0, 1, ns(0.35)) * 2.5), heavy=True) * 0.3 * a
    _place_mono(y, ratt, 0.04)
    return widen(y, r, 13, 0.6)


def chain_groan(dur, r, i0=0.2, i1=1.0, rate0=22, rate1=40, beats=None, t0=0.0):
    """iron chains under rising tension: slow stick-slip through metal modes + a low moan; swells on each footfall"""
    n = ns(dur)
    t = np.arange(n) / SR
    inten = i0 + (i1 - i0) * (t / dur) ** 1.4
    am = np.full(n, 0.35)
    if beats is not None:
        for b in beats:
            u = t + t0 - (b + 0.04)
            am += np.where(u > 0, np.exp(-u / 0.22) * (1 - np.exp(-u / 0.03)), 0)
    env = np.clip(am, 0, 1.2) * inten
    rate = np.linspace(rate0, rate1, 64) * (1 + 0.1 * np.sin(np.linspace(0, 9, 64)))
    x = stick_slip(dur, rate, r, 0.2, env)
    y = resbank(x, [(f * r.uniform(0.97, 1.03), q, g) for f, q, g in CHAIN])
    moan_f = np.linspace(48, 72, n) * (1 + 0.03 * smooth_noise(n, r, 1.5))
    ph = phase(moan_f)
    moan = sum(np.sin(k * ph) / k for k in range(1, 14))
    moan = bp(moan, 180, 900, 2) * env * 0.4
    return fades(y + moan, 0.2, 0.05)


# ================================================================ metal / bolt
def bolt_strain(r, a=1.0, dur=0.32):
    c = creak(dur, r, r.uniform(320, 420) * (0.9 + 0.3 * a), r.uniform(520, 760) * (0.9 + 0.3 * a), SMALLMETAL,
              [(0, 0), (0.2, 1), (0.75, 0.7), (1, 0)], rough=0.1, noise=0.02)
    tick = clink(r, r.uniform(2500, 3800), 0.08) * 0.6
    y = c
    _place_mono(y, tick, 0.0)
    return y


def bolt_snap(r):
    """bolt shears: crack + two bolt halves ringing as they fly (slight Doppler drop) + release thunk + chain jolt"""
    dur = 1.6
    n = ns(dur)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    crack = bp(nz, 900, 14000, 2) * np.exp(-t / 0.0028) * 2.2
    crack[: ns(0.0004)] += 1.5
    y = crack
    for k, (f0, dl, gl) in enumerate([(1760, 0.0, -0.07), (2090, 0.009, -0.05)]):
        g = 1 + gl * (1 - np.exp(-t / 0.35))
        ph = phase(f0 * g)
        ring = (np.exp(-t / 0.55) * np.sin(ph) + 0.55 * np.exp(-t / 0.22) * np.sin(2.756 * ph + 1)
                + 0.3 * np.exp(-t / 0.08) * np.sin(5.404 * ph + 2) + 0.12 * np.exp(-t / 0.03) * np.sin(8.933 * ph))
        ring *= 1 - np.exp(-t / 0.0015)
        y = y + np.roll(ring, ns(dl)) * (0.8 if k else 1.0)
    thunk = np.exp(-t / 0.07) * np.sin(phase(105 * (1 - 0.3 * t))) * 1.2
    y += thunk
    jolt = rattle(0.35, r, 70, np.exp(-np.linspace(0, 1, ns(0.35)) * 3), heavy=True) * 0.6
    _place_mono(y, jolt, 0.01)
    return fades(y, 0.0, 0.1)


def whoosh(dur, r, peak=0.3, f_lo=350, f_hi=2200, width=0.8, tail=0.25, air=0.15):
    """noise whoosh: band centre and level rise to `peak` then fall (ease-out burst when peak is early)"""
    n = ns(dur)
    nz = colored(n, r, 0.6)
    t = np.arange(n) / SR
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / tail))
    fc = lambda T: f_lo + (f_hi - f_lo) * np.interp(T, t, np.where(t < peak, t / peak, np.exp(-(t - peak) / (tail * 1.3))))
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / width) ** 2), 1024, 256)
    y = y * env + air * hp(nz, 4000) * env ** 2
    return fades(y, 0.005, 0.04)


def chain_whip(r):
    """the snapped backstay whipping up: fast swish + rattle along it + heavy clank as it flops"""
    y = whoosh(0.75, r, peak=0.07, f_lo=500, f_hi=2600, width=0.7, tail=0.18, air=0.3)
    ratt = rattle(0.6, r, 90, np.exp(-np.linspace(0, 1, ns(0.6)) * 2.2), heavy=True) * 0.5
    _place_mono(y, ratt, 0.02)
    clank = modal(0.5, [(310, 0.8, 0.09), (690, 0.6, 0.06), (1130, 0.4, 0.04), (1870, 0.25, 0.03)], r)
    clank += lp(r.standard_normal(ns(0.5)), 500) * np.exp(-tt(0.5) / 0.03) * 0.8
    _place_mono(y, np.concatenate([clank, np.zeros(ns(0.3))]) * 0.7, 0.6)
    return y


# ================================================================ timber + water
def timber_tear(r, dur=0.8):
    """the near half tearing loose: big low creak + splintering crackle that thickens"""
    n = ns(dur)
    t = np.arange(n) / SR
    c = creak(dur, r, 28, 75, TIMBER, [(0, 0), (0.3, 0.8), (0.85, 1), (1, 0.3)], rough=0.25, noise=0.08)
    dens = 10 + 120 * (t / dur) ** 2
    cr = np.zeros(n)
    tm = 0.05
    while tm < dur:
        k = ns(tm)
        crk = modal(0.06, [(r.uniform(600, 1800), 1, 0.006), (r.uniform(2000, 5000), 0.6, 0.003)], r)
        crk += hp(r.standard_normal(ns(0.06)), 1500) * np.exp(-tt(0.06) / 0.002)
        _place_mono(cr, crk * r.uniform(0.2, 1.0) * (t[min(k, n - 1)] / dur), tm)
        tm += r.exponential(1.0 / dens[min(k, n - 1)])
    return c + 0.5 * cr


def wood_crack(r):
    """deck slamming down: splintering crack burst + heavy timber boom"""
    dur = 1.2
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i in range(9):
        tm = (abs(r.normal(0, 0.03)) if i else 0.0) + i * 0.006     # first splinter exactly on the impact
        md = [(r.uniform(500, 1400), 1.0, 0.012), (r.uniform(1500, 3500), 0.7, 0.006), (r.uniform(3500, 7000), 0.4, 0.003)]
        k = modal(0.15, md, r) + hp(r.standard_normal(ns(0.15)), 1200) * np.exp(-tt(0.15) / 0.003)
        _place_mono(y, k * (1.0 if i == 0 else r.uniform(0.3, 0.8)), tm)
    boom = np.exp(-t / 0.32) * np.sin(phase(52 * (1 + 0.4 * np.exp(-t / 0.03)))) * 3.0
    boom += resbank(lp(r.standard_normal(n), 900) * np.exp(-t / 0.05), [(f, q, g) for f, q, g in TIMBER[:4]]) * 0.5
    return y + boom


def bubbles(dur, r, rate, f_lo=300, f_hi=2500, tau=(0.008, 0.035), env=None, rise=(4, 12)):
    """Minnaert-style bubble 'plinks': damped sines gliding up"""
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur:
        k = ns(tm)
        a = 1.0 if env is None else env[min(k, n - 1)]
        rr = rate if np.isscalar(rate) else rate[min(k, n - 1)]
        if a > 0.01:
            f0 = np.exp(r.uniform(np.log(f_lo), np.log(f_hi)))
            ta = r.uniform(*tau)
            L = min(int(ta * 6 * SR), n - k)
            if L > 8:
                tl = np.arange(L) / SR
                b = np.exp(-tl / ta) * np.sin(phase(f0 * (1 + r.uniform(*rise) * tl)))
                y[k:k + L] += b * a * r.uniform(0.2, 1.0) * (600 / f0) ** 0.3
        tm += r.exponential(1.0 / max(rr, 0.1))
    return y


def splash_big(r):
    """the near half of the deck + 70 soldiers hitting two feet of water: thump, slap, body, bubble cloud, spray"""
    dur = 2.6
    n = ns(dur)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    thump = np.exp(-t / 0.2) * np.sin(phase(58 * (1 + 0.5 * np.exp(-t / 0.025)))) * 2.0
    slap = bp(nz, 250, 7000, 1) * np.exp(-t / 0.035) * 1.6
    body_env = (1 - np.exp(-t / 0.02)) * (0.6 * np.exp(-t / 0.18) + 0.4 * np.exp(-t / 0.7))
    body = shape(colored(n, r, 0.4), lambda T, F: (np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (900 + 1800 * np.exp(-T[None, :] / 0.4))) / 1.4) ** 2)), 1024, 256)
    body *= body_env * 1.4
    bub = bubbles(dur, r, 900 * np.exp(-t / 0.5) + 20, 250, 2600, (0.006, 0.03), np.exp(-t / 0.8)) * 1.1
    spray_env = np.clip((t - 0.25) / 0.2, 0, 1) * np.exp(-np.maximum(t - 0.45, 0) / 0.55)
    spray = bubbles(dur, r, 500 * spray_env + 5, 1200, 5000, (0.003, 0.012), spray_env, rise=(8, 25)) * 0.6
    spray += hp(nz, 3000) * spray_env * 0.06
    return fades(thump + slap + body + bub + spray, 0.0, 0.3)


def water_bed(dur, r, close=1.0, slosh_rate=0.8):
    """river around the soldiers sitting in it: flow noise, babble, lapping, sloshes, drips"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        lap = 0.65 + 0.35 * smooth_noise(n, r, 0.5)
        flow = bp(colored(n, r, 0.8), 180, 2600, 1) * lap * 0.5
        bab = bubbles(dur, r, 70 * close + 15, 350, 2400, (0.006, 0.025)) * 0.9 * close
        rum = lp(colored(n, r, 2.0), 160, 2) * 0.35
        out[ch] = flow + bab + rum
    tm = r.uniform(0.2, 0.8)
    while tm < dur - 0.5:
        sl = shape(r.standard_normal(ns(0.5)), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / 700) / 1.2) ** 2), 512, 128)
        sl *= np.exp(-tt(0.5) / 0.12) * (1 - np.exp(-tt(0.5) / 0.03)) * 0.9 * close
        sl += bubbles(0.5, r, 120, 300, 1500, (0.006, 0.02), np.exp(-tt(0.5) / 0.15)) * 0.7 * close
        p = r.uniform(-0.7, 0.7)
        seg = pan(sl, p)
        k = ns(tm)
        out[:, k:k + seg.shape[1]] += seg[:, : n - k]
        tm += r.exponential(1 / slosh_rate) + 0.3
    drips = bubbles(dur, r, 3.5 * close, 1500, 4200, (0.004, 0.012), rise=(10, 30)) * 0.9
    out += widen(drips, r, 7, 1.0)
    return out


# ================================================================ nature
def bird_chirps(dur, r, density=0.5, kind="sparrow"):
    """sparse distant birds: sparrow chips or a blackbird-like fluting phrase"""
    n = ns(dur)
    y = np.zeros(n)
    tm = r.uniform(0.2, 1.5)
    while tm < dur - 1.0:
        if kind == "sparrow":
            for j in range(r.integers(2, 6)):
                L = r.uniform(0.04, 0.08)
                tl = tt(L)
                f = r.uniform(3800, 5600) * (1 - 0.35 * tl / L) if r.uniform() < 0.6 else r.uniform(3000, 4200) * (1 + 0.4 * tl / L)
                c = np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 2
                _place_mono(y, c * r.uniform(0.5, 1.0), tm + j * r.uniform(0.09, 0.16))
            tm += r.exponential(1 / density) + 0.6
        else:
            for j in range(r.integers(3, 7)):
                L = r.uniform(0.09, 0.22)
                tl = tt(L)
                f0 = r.uniform(1500, 2900)
                f = f0 * (1 + r.uniform(-0.25, 0.3) * np.sin(np.pi * tl / L * r.uniform(0.5, 1.5)))
                c = (np.sin(phase(f)) + 0.15 * np.sin(2 * phase(f))) * np.sin(np.pi * tl / L) ** 1.5
                _place_mono(y, c * r.uniform(0.4, 1.0), tm)
                tm += L + r.uniform(0.03, 0.12)
            tm += r.exponential(1 / density) + 1.0
    return y


def crickets(dur, r, voices=3):
    n = ns(dur)
    y = np.zeros(n)
    t = np.arange(n) / SR
    for v in range(voices):
        f = r.uniform(4200, 4900)
        pulse = (np.sin(TAU * r.uniform(28, 34) * t) > 0.2).astype(float)
        chirp = (np.sin(TAU * r.uniform(1.6, 2.4) * t + r.uniform(0, TAU)) > 0.55).astype(float)
        e = lp(pulse * chirp, 200, 1)
        y += np.sin(TAU * f * t) * e * r.uniform(0.4, 1.0)
    return y


def breeze(dur, r, level=1.0, gust=0.18, bright=900):
    n = ns(dur)
    out = np.zeros((2, n))
    g = 0.6 + 0.4 * smooth_noise(n, r, gust)
    for ch in range(2):
        w = lp(colored(n, r, 1.0), bright, 2) * g
        w += 0.25 * bp(colored(n, r, 0.5), 1200, 4000, 1) * g ** 2
        out[ch] = w * level
    return out


def flag_flutter(dur, r):
    n = ns(dur)
    t = np.arange(n) / SR
    rate = 5.5 + 1.5 * smooth_noise(n, r, 0.3)
    m = 0.5 + 0.5 * np.sin(phase(rate))
    return bp(r.standard_normal(n), 300, 3000, 1) * m ** 3 * (0.5 + 0.5 * smooth_noise(n, r, 0.2))


# ================================================================ park, sign, tourists
def swing_squeak(r, a=1.0, fwd=True):
    """playground swing hanger squeak through the bottom of the arc ('eee' forward, 'aww' back)"""
    d = 0.22 + 0.2 * a
    lo, hi = (520, 760) if fwd else (380, 470)
    c = creak(d, r, lo, hi, SMALLMETAL if fwd else CHAIN[2:], [(0, 0), (0.35, 1), (0.65, 1), (1, 0)], rough=0.06, noise=0.01,
              scale=r.uniform(0.9, 1.1))
    return c


def push_thump(r):
    d = 0.3
    t = tt(d)
    th = lp(r.standard_normal(len(t)), 350, 2) * np.exp(-t / 0.035) * 1.5
    cloth = bp(r.standard_normal(len(t)), 900, 4500, 1) * np.exp(-t / 0.05) * 0.25
    jing = rattle(0.25, r, 30, np.exp(-np.linspace(0, 1, ns(0.25)) * 3), heavy=False) * 0.25
    y = th + cloth
    _place_mono(y, jing, 0.02)
    return y


def hammer_hit(r, big=1.0):
    """officer's hammer: steel on nail head ('tink') + wooden sign 'thock' + post thump"""
    d = 0.9
    t = tt(d)
    tink = modal(d, [(3150, 0.6, 0.05), (5070, 0.45, 0.03), (7900, 0.25, 0.015)], r)
    sign = modal(d, [(165, 1.0, 0.09), (345, 0.8, 0.07), (610, 0.55, 0.05), (990, 0.35, 0.03), (1520, 0.2, 0.02)], r, glide=0.03)
    nz = r.standard_normal(len(t))
    hit = bp(nz, 400, 6000, 1) * np.exp(-t / 0.004) * 1.2
    post = np.exp(-t / 0.08) * np.sin(phase(82 * (1 + 0.3 * np.exp(-t / 0.01)))) * 1.3
    return fades((tink * 0.8 + sign * 1.2 + hit + post) * big, 0.0, 0.1)


def stroll_step(r, scuff=0.5):
    d = 0.3
    t = tt(d)
    heel = np.exp(-t / 0.03) * np.sin(phase(r.uniform(90, 130) * (1 + 0.15 * np.exp(-t / 0.01))))
    plank = modal(d, [(r.uniform(180, 280), 0.5, 0.025), (r.uniform(420, 700), 0.35, 0.015)], r)
    nz = r.standard_normal(len(t))
    tap = bp(nz, 700, 4000, 1) * np.exp(-t / 0.005) * 0.4
    sc = bp(nz, 400, 3000, 1) * np.clip(t / 0.02, 0, 1) * np.exp(-t / 0.07) * 0.25 * scuff
    return (heel * 0.7 + plank + tap + sc)


# ================================================================ Haber short: new generators
from dsp import place  # noqa: E402
import instruments as I  # noqa: E402


def _t(dur):
    return np.arange(ns(dur)) / SR


def _lowpass_track(x, fc_t, fc_v, order=1.0, nper=1024, hop=256):
    """time-varying gentle low-pass via STFT: cutoff curve (fc_t, fc_v)"""
    return shape(x, lambda T, F: 1.0 / (1 + (F[:, None] / np.maximum(np.interp(T, fc_t, fc_v), 30)[None, :]) ** (2 * order)), nper, hop)


def wind(dur, r, level=1.0, gust=0.15, bright=700, howl=0.0, howl_lo=380, howl_hi=900):
    """wind bed (stereo): template breeze + optional moving resonant howl (cold wind)"""
    out = breeze(dur, r, level, gust, bright)
    if howl > 0:
        n = ns(dur)
        tt_ = np.arange(n) / SR
        fc = howl_lo + (howl_hi - howl_lo) * (0.5 + 0.5 * smooth_noise(n, r, 0.07))
        g = 0.45 + 0.55 * (0.5 + 0.5 * smooth_noise(n, r, 0.1))
        for ch in range(2):
            nz = colored(n, r, 0.6)
            y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / np.interp(T, tt_, fc)[None, :]) / 0.10) ** 2), 2048, 512)
            out[ch] += howl * level * y / (np.std(y) + 1e-9) * g * np.std(out[ch]) / (level + 1e-9)
    return out


def distant_boom(r, dur=2.2, f=42.0, bright=380):
    t = _t(dur)
    nz = r.standard_normal(len(t))
    y = np.exp(-t / 0.35) * np.sin(phase(f * (1 + 0.6 * np.exp(-t / 0.04)))) * 1.2
    y += lp(nz, bright, 2) * np.exp(-t / 0.18) * (1 - np.exp(-t / 0.01)) * 2.0
    y += lp(colored(len(t), r, 2.0), 160, 2) * np.exp(-t / 0.8) * (1 - np.exp(-t / 0.08)) * 0.6
    return fades(y, 0.002, 0.3)


def rumble(dur, r, level=1.0, lo=22, hi=150, thuds=0.5):
    """trench rumble bed: low brown noise + far shelling thuds"""
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        out[ch] = lp(hp(colored(n, r, 2.0), lo, 2), hi, 2) * (0.7 + 0.3 * smooth_noise(n, r, 0.3))
    s0 = np.std(out)
    tm = r.uniform(0.05, 0.4)
    while tm < dur - 0.2 and thuds > 0:
        b = distant_boom(r, 2.0, r.uniform(36, 52), r.uniform(250, 450)) * r.uniform(1.0, 2.2) * s0 / 0.3
        place(out, pan(b, r.uniform(-0.7, 0.7)), tm)
        tm += r.exponential(1 / thuds) + 0.35
    return out * level


def hiss(dur, r, lo=2500, hi=11000, flutter=0.25, rate=1.5):
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        out[ch] = bp(colored(n, r, 0.3), lo, hi, 2) * (1 - flutter + flutter * smooth_noise(n, r, rate))
    return out


def room_tone(dur, r, hum=50.0, hum_level=0.12, air_lp=2500):
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    h = (np.sin(TAU * hum * t) + 0.5 * np.sin(TAU * 2 * hum * t + 1) + 0.3 * np.sin(TAU * 3 * hum * t + 2)) * (1 + 0.1 * smooth_noise(n, r, 0.5))
    for ch in range(2):
        a = lp(hp(colored(n, r, 1.0), 70, 2), air_lp, 2)
        out[ch] = a / np.std(a) + hum_level * h / np.std(h)
    return out


def ping(r, f, tau=0.12, bright=0.35, dur=0.6):
    """tiny chime / twinkle ping"""
    return modal(dur, [(f, 1.0, tau), (f * 2.76, bright, tau * 0.35), (f * 5.4, bright * 0.3, tau * 0.12)], r)


def sparkle(dur, r, rate=14.0, f_lo=2600, f_hi=7500, env=None, spread=0.85, fall=0.0, shimmer=0.08):
    """twinkle cloud (stereo): random tiny chimes, optional downward pitch drift (falling sparkles), airy shimmer"""
    n = ns(dur)
    out = np.zeros((2, n))
    tt_ = np.arange(n) / SR
    e = np.ones(n) if env is None else env(tt_)
    tm = r.uniform(0, 0.05)
    while tm < dur:
        k = min(ns(tm), n - 1)
        a = e[k]
        if a > 0.02:
            f = np.exp(r.uniform(np.log(f_lo), np.log(f_hi)))
            if fall:
                f *= 2 ** (-fall * tm / dur)
            c = ping(r, f, r.uniform(0.06, 0.2), r.uniform(0.2, 0.45))
            place(out, pan(c * a * r.uniform(0.3, 1.0), r.uniform(-spread, spread)), tm)
        tm += r.exponential(1 / rate)
    sh = hp(colored(n, r, 0.0), 6500, 2) * e * shimmer
    out += widen(sh, r, 7, 1.0)
    return out


def flash_impact(r):
    """white flash: reverse swell peaking on the cut + impact (sub thump, crack, bright burst, sizzle tail); anchor = peak"""
    dur, pk = 1.6, 0.5
    sw = whoosh(dur, r, pk, 450, 6000, 0.9, 0.14, 0.45)
    t = _t(dur)
    u = np.maximum(t - pk, 0)
    on = (t >= pk).astype(float)
    nz = r.standard_normal(len(t))
    boom = on * np.exp(-u / 0.22) * np.sin(TAU * 52 * u * (1 + 0.8 * np.exp(-u / 0.03))) * 2.2
    crack = on * bp(nz, 1200, 14000, 2) * np.exp(-u / 0.004) * 1.2
    burst = on * bp(nz, 300, 9000, 1) * np.exp(-u / 0.03) * 0.6
    sizzle = on * hp(colored(len(t), r, 0.2), 5000, 2) * np.exp(-u / 0.35) * (1 - np.exp(-u / 0.02)) * 0.25
    y = sw * 1.2 + boom + crack + burst + sizzle
    return widen(fades(y, 0.01, 0.2), r, 12, 0.9), pk


def shock_sting(r, soft=False):
    """cartoon 'shock': rapid upward zip, wobbling squeal, toy clang (soft: no clang, rounder)"""
    dur = 0.75
    t = _t(dur)
    zip_d = 0.09
    f = np.where(t < zip_d, 380 * (2400 / 380) ** (t / zip_d), 2400 * (1 + 0.045 * np.sin(TAU * 17 * (t - zip_d))))
    if soft:
        f = f * 0.75
    ph = phase(f)
    tone = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph))
    env = np.clip(t / 0.01, 0, 1) * np.where(t < zip_d, 0.6 + 0.4 * t / zip_d, np.exp(-(t - zip_d) / (0.16 if not soft else 0.12)))
    y = tone * env
    if not soft:
        clang = modal(0.6, [(1730, 1.0, 0.09), (2470, 0.8, 0.07), (3590, 0.5, 0.05), (5210, 0.3, 0.03)], r)
        clang += hp(r.standard_normal(ns(0.6)), 3000) * np.exp(-_t(0.6) / 0.004) * 0.6
        _place_mono(y, clang * 0.5, zip_d - 0.005)
    return fades(y, 0.002, 0.05)


def waves(dur, r, period=(3.2, 5.5), level=1.0, foam=0.35, boom=0.5):
    """sea waves (stereo): each wave a swell whose low-pass opens to the crest, foam hiss after it, low boom"""
    n = ns(dur)
    tt_ = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        amp = np.full(n, 0.22)
        fc = np.full(n, 350.0)
        tm = -r.uniform(0.5, 3.0)
        while tm < dur:
            L = r.uniform(*period)
            rise = 0.42 * L
            u = tt_ - tm
            e = np.where((u >= 0) & (u < rise), (np.clip(u, 0, None) / rise) ** 2, 0.0)
            e += np.where(u >= rise, np.exp(-(u - rise) / (0.35 * L)), 0.0)
            g = r.uniform(0.6, 1.0)
            amp += g * e
            fc = np.maximum(fc, 350 + 2600 * g * e)
            tm += L * r.uniform(0.7, 1.0)
        nz = colored(n, r, 0.9)
        body = _lowpass_track(nz, tt_, fc, 1.0, 2048, 512)
        fo = hp(colored(n, r, 0.2), 3500, 2) * np.clip(amp - 0.5, 0, None) ** 1.5 * foam
        lo = lp(colored(n, r, 2.0), 120, 2) * amp * boom
        out[ch] = body * amp + fo * np.std(body) / (np.std(fo) + 1e-9) * 0.5 + lo * np.std(body) / (np.std(lo) + 1e-9) * 0.6
    return out * level


def gull(r, calls=None):
    """seagull-like synthesized chirp: 1-3 'kee-ow' tonal calls with a raspy flutter (not a voice)"""
    calls = calls or r.integers(1, 4)
    out = np.zeros(ns(1.4))
    tm = 0.0
    for c in range(calls):
        d = r.uniform(0.16, 0.3)
        t = _t(d)
        u = t / d
        f0 = r.uniform(1200, 1450) * np.interp(u, [0, 0.25, 1], [1.0, 1.55, 1.05])
        ph = phase(f0)
        rasp = 1 - 0.45 * (0.5 + 0.5 * np.sin(TAU * r.uniform(48, 62) * t))
        y = (np.sin(ph) + 0.45 * np.sin(2 * ph + 0.3) + 0.2 * np.sin(3 * ph + 1.0)) * rasp * np.sin(np.pi * u) ** 1.2
        y += bp(r.standard_normal(len(t)), 1500, 5000, 1) * np.sin(np.pi * u) * 0.08
        _place_mono(out, y * r.uniform(0.6, 1.0), tm)
        tm += d + r.uniform(0.05, 0.14)
    return lp(out, 6000, 1)


def plop(r, f0=None, size=1.0):
    """water drop 'plop': rising bubble resonance + tiny splash + low bloop + droplets"""
    f0 = f0 or r.uniform(550, 800)
    dur = 0.45
    t = _t(dur)
    nz = r.standard_normal(len(t))
    y = np.exp(-t / 0.045) * np.sin(phase(f0 * (1 + 3.5 * t))) * (1 - np.exp(-t / 0.002))
    y += bp(nz, 1000, 7000, 1) * np.exp(-t / 0.012) * 0.25
    y += np.exp(-t / 0.03) * np.sin(TAU * 140 * t) * 0.35 * size
    y += bubbles(dur, r, 14, 1400, 4200, (0.004, 0.012), np.exp(-t / 0.12), rise=(8, 20)) * 0.25
    return fades(y, 0.0005, 0.05)


ROPE_M = [(140, 5, 1.0), (260, 6, 0.8), (470, 7, 0.6), (820, 8, 0.45), (1450, 9, 0.25)]


def rope_strain(r, dur=1.1):
    """tug-of-war rope: slow fibrous creak + fibre crackle + a low strain moan"""
    c = creak(dur, r, 30, 80, ROPE_M, [(0, 0), (0.2, 0.9), (0.6, 1), (1, 0)], rough=0.3, noise=0.12)
    n = len(c)
    t = np.arange(n) / SR
    cr = np.zeros(n)
    tm = 0.05
    while tm < dur - 0.05:
        k = modal(0.03, [(r.uniform(1500, 3500), 1, 0.003)], r) + hp(r.standard_normal(ns(0.03)), 2000) * np.exp(-_t(0.03) / 0.0015)
        _place_mono(cr, k * r.uniform(0.2, 0.8), tm)
        tm += r.exponential(1 / 35)
    moan = np.sin(phase(np.linspace(85, 105, n))) * np.sin(np.pi * np.clip(t / dur, 0, 1)) * 0.25
    return c + 0.35 * cr * np.std(c) / (np.std(cr) + 1e-9) + moan * np.std(c) / 0.18


def cannon(r, dur=3.0, f=46.0, big=1.0):
    """cannon / gun boom: muzzle crack, blast, pitch-dropping boom, rumble tail, late echo (mono)"""
    t = _t(dur)
    n = len(t)
    nz = r.standard_normal(n)
    crack = bp(nz, 700, 12000, 2) * np.exp(-t / 0.004) * 1.6
    blast = lp(nz, 1600, 2) * np.exp(-t / 0.09) * 2.2 * (1 - np.exp(-t / 0.002))
    boom = np.exp(-t / (0.45 * big)) * np.sin(phase(f * (1 + 0.9 * np.exp(-t / 0.03)))) * 2.6 * big
    tail = lp(colored(n, r, 2.0), 220, 2) * np.exp(-t / (0.9 * big)) * (1 - np.exp(-t / 0.05)) * 0.9
    y = crack + blast + boom + tail
    echo = lp(np.roll(blast + 0.5 * boom, ns(0.38)), 700, 2) * 0.22
    echo[: ns(0.38)] = 0
    return fades(y + echo, 0.0, 0.4)


def debris_puff(r, dur=1.2):
    t = _t(dur)
    nz = r.standard_normal(len(t))
    puff = bp(nz, 250, 3000, 1) * (t / 0.02).clip(0, 1) * np.exp(-t / 0.25) * 0.6
    y = puff
    for k in range(6):
        knock = modal(0.2, [(r.uniform(250, 500), 1.0, 0.03), (r.uniform(700, 1400), 0.6, 0.015), (r.uniform(1800, 3500), 0.3, 0.008)], r)
        _place_mono(y, knock * r.uniform(0.25, 0.8), r.uniform(0.12, 0.9))
    y += bubbles(dur, r, 30 * np.exp(-t / 0.4) + 1, 2000, 6000, (0.002, 0.006), np.exp(-t / 0.5)) * 0.2
    return y


def tink(r, f=None):
    f = f or r.uniform(3900, 5200)
    t = _t(0.5)
    y = modal(0.5, [(f, 1.0, 0.07), (f * 1.53, 0.5, 0.04), (f * 2.8, 0.3, 0.02), (f * 4.1, 0.12, 0.01)], r)
    y += hp(r.standard_normal(len(t)), 5000) * np.exp(-t / 0.0006) * 0.5
    return y


def boing(r, f0=160.0, dur=0.95):
    """cartoon spring 'boing' with a wobbling pitch"""
    t = _t(dur)
    vib = 1 + 0.28 * np.exp(-t / 0.3) * np.sin(TAU * 10.5 * t)
    f = f0 * (1 + 0.7 * np.exp(-t / 0.04)) * vib
    ph = phase(f)
    y = (np.sin(ph) + 0.55 * np.sin(2 * ph + 0.5) + 0.3 * np.sin(3 * ph + 1.0) + 0.15 * np.sin(5 * ph)) * np.exp(-t / 0.4)
    y += reson(r.standard_normal(len(t)), 1100, 6) * np.exp(-t / 0.05) * 0.3
    return fades(y * (1 - np.exp(-t / 0.002)), 0.0, 0.1)


def circling_stars(r, dur=1.5, n_pings=9):
    """dazed 'stars' circling the head: high pings orbiting left-right"""
    out = np.zeros((2, ns(dur)))
    for k in range(n_pings):
        tm = 0.05 + k * (dur - 0.45) / n_pings + r.uniform(-0.02, 0.02)
        f = [3520, 4186, 4699, 3951, 5274][k % 5] * r.uniform(0.99, 1.01)
        p = 0.75 * np.sin(TAU * 0.9 * tm)
        c = ping(r, f, 0.16, 0.25) * (1 - 0.5 * k / n_pings)
        place(out, pan(c, p), tm)
    return out


def piston(r, big=1.0):
    """pump piston stroke: metal thunk + pneumatic chuff + valve click"""
    dur = 0.38
    t = _t(dur)
    nz = r.standard_normal(len(t))
    thunk = lp(nz, 400, 2) * np.exp(-t / 0.022) * 1.4 + np.exp(-t / 0.05) * np.sin(TAU * r.uniform(85, 95) * t) * 0.8
    click = modal(dur, [(r.uniform(1700, 1900), 0.35, 0.012), (r.uniform(3000, 3300), 0.25, 0.007)], r)
    u = np.maximum(t - 0.04, 0)
    chuff = bp(nz, 700, 5000, 1) * (t > 0.04) * np.clip(u / 0.01, 0, 1) * np.exp(-u / 0.07) * 0.45
    return fades((thunk + click + chuff) * big, 0.0005, 0.04)


def pressure_build(dur, r):
    """rising pressure: metal creak whose rate climbs + hiss rising in level and pitch (stereo)"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    c = creak(dur, r, 45, 260, SMALLMETAL, [(0, 0.1), (0.3, 0.4), (0.8, 0.9), (1, 1)], rough=0.15, noise=0.02)
    c = c[:n] if len(c) >= n else np.pad(c, (0, n - len(c)))
    hs = np.zeros(n)
    nz = colored(n, r, 0.4)
    hs = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (1800 * 2 ** (2.0 * np.clip(T, 0, dur) / dur))[None, :]) / 0.6) ** 2), 1024, 256)
    hs *= u ** 1.6
    out = pan(c, -0.2) * 0.8 + widen(hs * np.std(c) / (np.std(hs) + 1e-9), r, 8, 0.8) * 0.9
    return fades(out, 0.3, 0.05)


def whoomph(r, dur=1.5):
    """furnace ignition: igniter tick, gas 'whoomph' (low-pass opening and closing), sub thump"""
    t = _t(dur)
    n = len(t)
    nz = colored(n, r, 0.8)
    fc = np.interp(t, [0, 0.03, 0.13, 0.5, dur], [150, 300, 2600, 900, 500])
    y = _lowpass_track(nz, t, fc, 1.0, 1024, 128) * np.clip(t / 0.05, 0, 1) ** 2 * np.exp(-np.maximum(t - 0.06, 0) / 0.35)
    y = y / (np.std(y[: ns(0.4)]) + 1e-9)
    y += np.exp(-t / 0.12) * np.sin(phase(55 * (1 + 0.4 * np.exp(-t / 0.03)))) * 1.6 * (t > 0.02)
    tick = modal(0.05, [(3200, 1.0, 0.004), (5400, 0.6, 0.002)], r)
    _place_mono(y, tick * 0.8, 0.0)
    return widen(fades(y, 0.0, 0.2), r, 10, 0.7)


def fire_bed(dur, r):
    """roaring furnace fire: low roar with flicker, crackles, a little rumble (stereo)"""
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        roar = lp(hp(colored(n, r, 1.4), 60, 2), 1100, 2) * (0.72 + 0.28 * smooth_noise(n, r, 6.0)) * (0.85 + 0.15 * smooth_noise(n, r, 0.6))
        roar /= np.std(roar)
        cr = np.zeros(n)
        tm = 0.0
        while tm < dur:
            L = ns(0.004)
            k = ns(tm)
            if k + L < n:
                cr[k:k + L] += hp(r.standard_normal(L), 1800) * np.exp(-np.arange(L) / (0.0008 * SR)) * r.uniform(0.3, 1.0)
            tm += r.exponential(1 / 22)
        out[ch] = roar + cr * 1.2
    return out


def metal_clank(r, heavy=1.0, modes=None, dur=1.0):
    modes = modes or [(220, 1.0, 0.12), (530, 0.8, 0.09), (1110, 0.6, 0.07), (1870, 0.4, 0.05), (2950, 0.25, 0.03)]
    t = _t(dur)
    y = modal(dur, [(f * r.uniform(0.97, 1.03), a, tau * heavy) for f, a, tau in modes], r)
    nz = r.standard_normal(len(t))
    y += bp(nz, 800, 9000, 1) * np.exp(-t / 0.004) * 0.9
    y += lp(nz, 350, 2) * np.exp(-t / 0.02) * 1.2 * heavy
    return fades(y, 0.0, 0.15)


def plink(r, f0=None):
    """drop of liquid into a glass flask: rising bubble plink + glass ring"""
    f0 = f0 or r.uniform(1150, 1450)
    dur = 0.7
    t = _t(dur)
    y = np.exp(-t / 0.03) * np.sin(phase(f0 * (1 + 5 * t))) * (1 - np.exp(-t / 0.001))
    y += modal(dur, [(f0 * 2.3, 0.18, 0.28), (f0 * 3.4, 0.1, 0.18), (f0 * 5.1, 0.05, 0.1)], r)
    y += hp(r.standard_normal(len(t)), 4000) * np.exp(-t / 0.002) * 0.15
    return fades(y, 0.0, 0.08)


def chime_burst(r, notes=(89, 93, 96, 98, 101, 105), dur=1.6):
    """sparkle burst: fast rising chime arpeggio (F major pentatonic) + twinkle cloud + shimmer"""
    out = np.zeros((2, ns(dur)))
    for k, m in enumerate(notes):
        f = I.m2f(m)
        c = modal(1.2, [(f, 1.0, 0.5), (f * 2.76, 0.25, 0.12), (f * 5.4, 0.08, 0.04)], r)
        place(out, pan(c * (0.75 + 0.05 * k), -0.6 + 1.2 * k / (len(notes) - 1)), 0.035 * k)
    sp = sparkle(dur, r, 30, 3500, 9000, lambda T: np.exp(-T / 0.45), 0.9, 0.0, 0.06) * 0.5
    return out + sp


def bell_gliss(r, notes=(77, 79, 81, 82, 84, 86, 88, 89), step=0.07, dur=2.8):
    """warm handbell glissando up an F major scale"""
    out = np.zeros((2, ns(dur)))
    for k, m in enumerate(notes):
        b = I.bell(I.m2f(m), 0.6 + 0.04 * k, r, dur=dur - step * k - 0.05, bright=0.5, minor=False)
        place(out, pan(b, -0.5 + k / len(notes)), step * k)
    return lp(out, 7000, 1)


def conveyor(dur, r, rate=6.5):
    """factory conveyor: roller clatter, chain rattle, belt rumble, motor hum (stereo)"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        rl = np.zeros(n)
        tm = r.uniform(0, 1 / rate)
        while tm < dur:
            c = modal(0.12, [(r.uniform(600, 800), 1, 0.02), (r.uniform(1500, 1900), 0.5, 0.012), (r.uniform(2800, 3400), 0.25, 0.006)], r)
            _place_mono(rl, c * r.uniform(0.5, 1.0), tm)
            tm += (1 / rate) * r.uniform(0.85, 1.15)
        ch_r = rattle(dur, r, 18, heavy=True) * 0.5
        belt = bp(colored(n, r, 1.0), 90, 600, 1) * 0.6
        hum = (np.sin(TAU * 100 * t) + 0.4 * np.sin(TAU * 200 * t) + 0.2 * np.sin(TAU * 300 * t)) * 0.08
        out[ch] = rl + ch_r + belt * np.std(rl) / (np.std(belt) + 1e-9) + hum * np.std(rl) / 0.06
    return out


def sack_thump(r):
    """heavy sack dropped: thud + grain rustle"""
    dur = 0.5
    t = _t(dur)
    nz = r.standard_normal(len(t))
    y = lp(nz, 260, 2) * np.exp(-t / 0.045) * 2.2 + np.exp(-t / 0.06) * np.sin(TAU * r.uniform(62, 76) * t) * 1.2
    y += bp(nz, 1000, 6000, 1) * np.clip(t / 0.005, 0, 1) * np.exp(-t / 0.1) * 0.25
    y += bubbles(dur, r, 120 * np.exp(-t / 0.08) + 1, 2500, 7000, (0.001, 0.004), np.exp(-t / 0.12)) * 0.15
    return fades(y, 0.0, 0.06)


def shell_clank(r):
    """heavy steel shell clank: long ringing casing modes + impact thump + clang transient"""
    modes = [(178, 1.0, 0.7), (405, 0.9, 0.55), (688, 0.7, 0.45), (1043, 0.6, 0.32), (1526, 0.45, 0.25), (2208, 0.3, 0.15), (3301, 0.2, 0.08)]
    y = metal_clank(r, 1.0, modes, 2.2)
    t = _t(2.2)
    y += np.exp(-t / 0.08) * np.sin(TAU * 58 * t) * 1.5
    return y


def steam_whistle(r, dur=1.7, freqs=(147.0, 175.0, 220.0)):
    """warship steam whistle: 3 chambers, breathy, scooping onset, unstable pitch"""
    t = _t(dur)
    n = len(t)
    env = np.clip(t / 0.09, 0, 1) ** 1.5 * np.clip((dur - t) / 0.3, 0, 1)
    y = np.zeros(n)
    for k, f in enumerate(freqs):
        cents = -90 * np.exp(-t / 0.08) + 8 * smooth_noise(n, r, 4.0)
        ph = phase(f * 2 ** (cents / 1200))
        y += (np.sin(ph) + 0.35 * np.sin(2 * ph + 0.4) + 0.12 * np.sin(3 * ph)) * (1.0 - 0.15 * k)
        y += reson(r.standard_normal(n), f * 2, 8) * 0.6
    y += bp(r.standard_normal(n), 800, 5000, 1) * 0.15
    return fades(y * env, 0.005, 0.1)


def chug(r, strong=True):
    """one steam-engine exhaust chuff"""
    dur = 0.3
    t = _t(dur)
    nz = r.standard_normal(len(t))
    y = bp(nz, 300, 3500, 1) * np.clip(t / 0.008, 0, 1) * np.exp(-t / 0.075) * (1.0 if strong else 0.6)
    y += lp(nz, 200, 2) * np.exp(-t / 0.03) * (0.9 if strong else 0.4)
    return fades(y, 0.0, 0.04)


def steam_stop(r, dur=2.2):
    """engine stops: release hiss (bright, long), a last clunk"""
    t = _t(dur)
    nz = colored(len(t), r, 0.2)
    y = bp(nz, 1800, 10000, 2) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.7) * 1.0
    y += metal_clank(r, 0.6, [(140, 1.0, 0.1), (350, 0.7, 0.07), (800, 0.4, 0.05)], dur) * 0.5
    return y


def field_gun(r, dur=3.4):
    """big field gun: cannon + ground shake (long sub rumble) + dirt rain (stereo, anchor = 0)"""
    y = cannon(r, dur, r.uniform(36, 42), 1.3)
    t = _t(dur)
    shake = lp(colored(len(t), r, 2.0), 70, 3) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.8)
    shake *= np.std(y[: ns(0.5)]) / (np.std(shake[: ns(0.5)]) + 1e-9) * 0.45
    out = widen(y + shake, r, 14, 0.9)
    dirt = np.zeros(len(t))
    tm = 0.3
    while tm < 2.2:
        k = modal(0.06, [(r.uniform(300, 900), 1, 0.01)], r) + lp(r.standard_normal(ns(0.06)), 2500) * np.exp(-_t(0.06) / 0.006)
        _place_mono(dirt, k * r.uniform(0.2, 1.0) * np.exp(-(tm - 0.3) / 0.8), tm)
        tm += r.exponential(1 / 28)
    dirt += bp(colored(len(t), r, 0.5), 1500, 7000, 1) * np.clip((t - 0.3) / 0.2, 0, 1) * np.exp(-np.maximum(t - 0.5, 0) / 0.6) * 0.15
    out += widen(dirt * np.std(y) * 0.5 / (np.std(dirt) + 1e-9), r, 9, 1.0)
    return out


def watch_ticks(dur, r, rate=5.0):
    """pocket-watch: tick-tock at `rate` Hz, tiny and bright"""
    y = np.zeros(ns(dur))
    k = 0
    tm = 0.0
    while tm < dur - 0.02:
        f = 3400 if k % 2 == 0 else 3000
        c = modal(0.03, [(f, 1.0, 0.004), (f * 1.6, 0.6, 0.003), (f * 2.4, 0.3, 0.002)], r)
        c += hp(r.standard_normal(ns(0.03)), 4000) * np.exp(-_t(0.03) / 0.0005) * 0.4
        _place_mono(y, c * (1.0 if k % 2 == 0 else 0.75), tm + r.normal(0, 0.0015))
        tm += 1 / rate
        k += 1
    return y


def clock_ticks(dur, r, rate=1.0):
    """wall clock: soft wooden tick-tock"""
    y = np.zeros(ns(dur))
    k = 0
    tm = 0.0
    while tm < dur - 0.05:
        f = 1750 if k % 2 == 0 else 1550
        c = modal(0.08, [(f, 1.0, 0.012), (f * 1.7, 0.5, 0.007), (420, 0.6, 0.02)], r)
        _place_mono(y, c * (1.0 if k % 2 == 0 else 0.8), tm)
        tm += 1 / rate
        k += 1
    return y


def valves_open(r, n_valves=11, dur=1.8):
    """many gas-cylinder valves opening: metal squeak-clunks, each starting its own hiss (stereo)"""
    out = np.zeros((2, ns(dur + 1.5)))
    for k in range(n_valves):
        tm = 0.03 + k * 0.13 + r.uniform(-0.04, 0.04)
        sq = creak(0.12, r, 280, 520, SMALLMETAL, [(0, 0), (0.3, 1), (1, 0)], rough=0.08, noise=0.02)
        cl = metal_clank(r, 0.35, [(900, 1.0, 0.02), (1900, 0.6, 0.012), (3300, 0.3, 0.008)], 0.15) * 0.5
        hl = ns(dur + 1.5 - tm)
        hs = bp(colored(hl, r, 0.3), 2000, 10000, 2) * np.clip(np.arange(hl) / SR / 0.08, 0, 1) * 0.25
        x = np.zeros(hl)
        _place_mono(x, sq * 0.6, 0.0)
        _place_mono(x, cl, 0.08)
        x += hs
        place(out, pan(x, r.uniform(-0.85, 0.85)), tm)
    return fades(out, 0.0, 0.3)


def gas_cloud(dur, r, t_swell=1.2):
    """the chlorine cloud: hiss swelling, then a rolling low rumble that grows (stereo)"""
    n = ns(dur)
    t = np.arange(n) / SR
    hs = hiss(dur, r, 1800, 9000, 0.3, 1.0)
    hs *= (np.clip(t / t_swell, 0, 1) ** 1.5 * (1 - 0.35 * np.clip((t - t_swell) / 2, 0, 1)))[None, :]
    roll = np.zeros((2, n))
    for ch in range(2):
        z = lp(hp(colored(n, r, 2.0), 25, 2), 220, 2)
        z *= 0.65 + 0.35 * np.sin(TAU * 0.35 * t + r.uniform(0, TAU)) * (0.6 + 0.4 * smooth_noise(n, r, 0.4))
        roll[ch] = z / np.std(z)
    roll *= (np.clip((t - 0.6) / 2.2, 0, 1) ** 1.3)[None, :]
    hs = hs / (np.std(hs) + 1e-9)
    return hs * 0.8 + roll * 1.1


def alarm_whistle(r, blasts=((0.0, 0.14), (0.22, 0.14), (0.44, 0.42))):
    """pea-whistle alarm blasts (trilled tone), not a voice"""
    out = np.zeros(ns(1.2))
    for tm, d in blasts:
        t = _t(d)
        trill = 0.5 + 0.5 * np.sin(TAU * r.uniform(26, 32) * t)
        f = r.uniform(2750, 2950) * (1 + 0.035 * trill)
        y = np.sin(phase(f)) + 0.15 * np.sin(2 * phase(f))
        y *= (0.55 + 0.45 * trill) * np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.02, 0, 1)
        y += bp(r.standard_normal(len(t)), 2000, 6000, 1) * 0.12 * np.clip(t / 0.01, 0, 1)
        _place_mono(out, y, tm)
    return out


def mud_step(r, wood=False):
    dur = 0.25
    t = _t(dur)
    nz = r.standard_normal(len(t))
    y = lp(nz, 500, 2) * np.exp(-t / 0.03) * 1.6 + np.exp(-t / 0.04) * np.sin(TAU * r.uniform(80, 110) * t) * 0.6
    y += bp(nz, 300, 1800, 1) * np.clip((t - 0.02) / 0.02, 0, 1) * np.exp(-t / 0.06) * 0.4
    if wood:
        y += modal(dur, [(r.uniform(200, 300), 0.5, 0.03), (r.uniform(500, 700), 0.35, 0.015)], r)
    return fades(y, 0.0005, 0.03)


def running_boots(dur, r, runners=6, rate=3.3):
    """several men running through a trench (mud + duckboards), stereo"""
    out = np.zeros((2, ns(dur)))
    for k in range(runners):
        p = r.uniform(-0.8, 0.8)
        g = r.uniform(0.4, 1.0)
        rt = rate * r.uniform(0.9, 1.12)
        tm = r.uniform(0, 1 / rt)
        while tm < dur:
            place(out, pan(mud_step(r, r.uniform() < 0.4) * g * r.uniform(0.7, 1.0), p), tm)
            tm += (1 / rt) * r.uniform(0.92, 1.08)
    out += widen(rattle(dur, r, 20, heavy=True), r, 9, 0.8) * 0.15
    return out


def gravel_step(r, weight=1.0):
    """slow footstep on a garden path: heel, sole, gravel crunch"""
    dur = 0.4
    t = _t(dur)
    nz = r.standard_normal(len(t))
    y = lp(nz, 600, 2) * np.exp(-t / 0.025) * 1.2 * weight
    y += bubbles(dur, r, 260 * np.exp(-t / 0.06) + 2, 1500, 6000, (0.0008, 0.003), np.exp(-t / 0.09), rise=(0, 1)) * 0.5
    y += bp(nz, 800, 5000, 1) * np.clip((t - 0.06) / 0.02, 0, 1) * np.exp(-np.maximum(t - 0.06, 0) / 0.05) * 0.3
    return fades(y, 0.0005, 0.05)


LEATHER = [(160, 3, 1.0), (330, 4, 0.8), (620, 5, 0.5), (1100, 5, 0.3)]


def suitcase_creak(r, dur=0.4):
    c = creak(dur, r, 55, 110, LEATHER, [(0, 0), (0.3, 1), (0.7, 0.8), (1, 0)], rough=0.25, noise=0.08)
    _place_mono(c, clink(r, r.uniform(2200, 2800), 0.08) * 0.3, dur * 0.6)
    return c


def cowbells(dur, r, bells=3):
    """distant cowbells across the valley (stereo)"""
    out = np.zeros((2, ns(dur)))
    for b in range(bells):
        base = r.uniform(480, 700)
        modes = [(base, 1.0, 0.25), (base * 1.51, 0.7, 0.18), (base * 2.45, 0.45, 0.1), (base * 3.7, 0.25, 0.06)]
        p = r.uniform(-0.8, 0.8)
        tm = r.uniform(0, 1.2)
        while tm < dur - 0.3:
            for j in range(r.integers(1, 3)):
                c = modal(0.6, modes, r) * r.uniform(0.4, 1.0)
                place(out, pan(c, p), tm + j * r.uniform(0.12, 0.22))
            tm += r.uniform(0.8, 2.0)
    return lp(out, 3200, 1)


def poof(r):
    """magic 'poof' puff (beard appears)"""
    dur = 0.55
    t = _t(dur)
    nz = colored(len(t), r, 0.5)
    y = bp(nz, 180, 2500, 1) * np.clip(t / 0.008, 0, 1) * np.exp(-t / 0.13) * 1.4
    y += lp(nz, 250, 2) * np.exp(-t / 0.05) * 0.8
    out = widen(y, r, 10, 0.9)
    out += sparkle(dur, r, 25, 4000, 8000, lambda T: np.exp(-T / 0.2), 0.6, 0.0, 0.0) * 0.25
    return out


def medal_ding(r):
    return I.bell(I.m2f(94), 0.9, r, dur=2.5, bright=0.6, minor=False) + 0.5 * ping(r, I.m2f(106), 0.6, 0.2, 2.5)


def confetti_pop(r, dur=1.6):
    """party-popper pop + paper confetti flutter (stereo)"""
    t = _t(dur)
    n = len(t)
    nz = r.standard_normal(n)
    pop = bp(nz, 500, 9000, 2) * np.exp(-t / 0.0025) * 2.2 + np.exp(-t / 0.015) * np.sin(TAU * 130 * t) * 0.8
    pop += bp(nz, 1500, 6000, 1) * np.exp(-t / 0.05) * 0.25
    out = pan(pop, 0.1)
    fl = np.zeros(n)
    tm = 0.05
    while tm < dur - 0.05:
        L = ns(0.01)
        k = ns(tm)
        if k + L < n:
            fl[k:k + L] += hp(r.standard_normal(L), 2500) * np.hanning(L) * np.exp(-(tm - 0.05) / 0.6)
        tm += r.exponential(1 / 90)
    out += widen(fl * 0.35, r, 7, 1.0)
    return out


def spray(r, dur=0.2):
    """aerosol 'psst': nozzle click + bright hiss"""
    t = _t(dur + 0.06)
    nz = colored(len(t), r, 0.1)
    y = bp(nz, 3000, 13000, 2) * np.clip(t / 0.008, 0, 1) * np.clip((dur - t) / 0.05, 0, 1) ** 1.5
    c = modal(0.02, [(2600, 1.0, 0.002), (4100, 0.5, 0.0015)], r)
    _place_mono(y, c * 0.5, 0.0)
    return y


def bug_thud(r):
    dur = 0.12
    t = _t(dur)
    y = lp(r.standard_normal(len(t)), 600, 2) * np.exp(-t / 0.007) + np.exp(-t / 0.02) * np.sin(TAU * r.uniform(200, 260) * t) * 0.4
    return fades(y, 0.0, 0.02)


def ominous_hit(r, dur=3.2, pre=0.45):
    """reverse swell into a low hit + dark gong resonance; anchor = hit"""
    t = _t(dur)
    n = len(t)
    sw = whoosh(pre + 0.05, r, pre, 120, 900, 1.0, 0.03, 0.05)
    u = np.maximum(t - pre, 0)
    on = (t >= pre).astype(float)
    sub = on * np.exp(-u / 0.9) * np.sin(TAU * 41 * u * (1 + 0.5 * np.exp(-u / 0.04))) * 2.0
    gong = on * modal(dur, [(55, 1.0, 1.6), (83, 0.6, 1.2), (131, 0.4, 0.9), (197, 0.25, 0.6), (311, 0.12, 0.4)], r)
    thump = on * lp(r.standard_normal(n), 220, 2) * np.exp(-u / 0.04) * 1.4
    y = sub + gong + thump
    y[: len(sw)] += sw * 0.6
    return widen(fades(y, 0.02, 0.3), r, 12, 0.6), pre


def searchlight_hum(dur, r):
    n = ns(dur)
    t = np.arange(n) / SR
    s = np.sin(TAU * 50 * t)
    buzz = np.tanh(3 * s) + 0.3 * np.sin(TAU * 100 * t)
    buzz = lp(buzz, 900, 2) * (1 + 0.06 * smooth_noise(n, r, 3.0))
    return widen(buzz + 0.05 * bp(r.standard_normal(n), 2000, 6000, 1), r, 8, 0.6)


def candle(dur, r):
    """soft candle flicker: tiny flame flutter + rare wick crackles (stereo)"""
    n = ns(dur)
    fl = lp(colored(n, r, 1.0), 380, 2) * (0.5 + 0.5 * np.abs(smooth_noise(n, r, 5.0)))
    fl /= np.std(fl)
    cr = np.zeros(n)
    tm = r.uniform(0.2, 0.6)
    while tm < dur - 0.05:
        L = ns(0.005)
        k = ns(tm)
        cr[k:k + L] += hp(r.standard_normal(L), 2000) * np.exp(-np.arange(L) / (0.001 * SR)) * 3
        tm += r.exponential(0.7)
    return widen(fl + cr, r, 9, 0.6)


def low_boom(r, dur=1.5, f=33.0):
    t = _t(dur)
    y = np.exp(-t / 0.7) * np.sin(phase(f * (1 + 0.8 * np.exp(-t / 0.05)))) * 2.0
    y += lp(colored(len(t), r, 2.0), 120, 2) * np.exp(-t / 0.6) * (1 - np.exp(-t / 0.02)) * 0.6
    y += lp(r.standard_normal(len(t)), 300, 2) * np.exp(-t / 0.03) * 0.9
    return fades(y, 0.0, 0.25)


def whoosh_rise(dur, r, peak=0.3, f_lo=400, f_hi=5000, width=0.8, tail=0.4, air=0.3):
    """whoosh whose band keeps rising for its whole length ('up toward the sky'); loudest at `peak`"""
    n = ns(dur)
    t = np.arange(n) / SR
    nz = colored(n, r, 0.6)
    env = np.where(t < peak, (t / peak) ** 1.6, np.exp(-(t - peak) / tail))
    fc = lambda T: f_lo * (f_hi / f_lo) ** np.clip(T / dur, 0, 1)
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / width) ** 2), 1024, 256)
    y = y * env + air * hp(nz, 4000) * env ** 2
    return fades(y, 0.005, 0.05)
