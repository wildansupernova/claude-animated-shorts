# Sound for "The Birthday Bet": original score + synthesized SFX + the voice, all from numpy (dsp.py / instruments.py /
# sfx_gen.py from templates/audio). Every event time comes from out/timeline.json (dumped from story.ts) and
# voice/words.json, so the sound lands on the same frames as the picture.
# Writes out/audio/{mix,stem_voice,stem_music,stem_sfx}.wav (48 kHz, exact video length) and out/audio/cues.md.
# Mix: voice untouched; music ducked under speech; master to -14 LUFS integrated, true peak <= -1 dBTP.
import json, os, sys
import numpy as np
from scipy import signal, ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(HERE, "..", "..", "..", "templates", "audio"))  # dsp / instruments / sfx_gen from the skill
from dsp import (SR, TAU, ns, tt, rng, dbg, lp, hp, bp, peq, reson, colored, smooth_noise, fades, pan, st, place, widen, make_ir,
                 convolve_st, integrated, momentary_max, true_peak, read_wav, write_wav, modal, phase, shape)
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
def cue(t, what):
    CUES.append((t, what))
R = rng(2026)

# ================================================================ small synth pieces
def addl(a, b, gb=1.0):
    """sum two mono signals of different lengths"""
    n = max(len(a), len(b)); y = np.zeros(n); y[: len(a)] += a; y[: len(b)] += gb * b
    return y

def pop(r, f=900.0, dur=0.09, vel=0.8):
    """mouth / bubble pop: fast downward sine sweep + click"""
    t = tt(dur)
    f0 = f * (0.35 + 0.65 * np.exp(-t / 0.012))
    y = np.sin(phase(f0)) * np.exp(-t / 0.025) * (1 - np.exp(-t / 0.0015))
    y += hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.002) * 0.25
    return fades(y * vel, 0.0005, 0.01)

def blip(f, vel=0.7, r=None):
    return addl(I.glock(f, vel, r, dur=0.5) * 0.7, pop(r or R, f * 0.6, 0.06, 0.25))

def zip_(r, f0=500.0, f1=1700.0, dur=0.11, vel=0.6):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(phase(f)) * np.sin(np.pi * t / dur) ** 1.5
    y += bp(r.standard_normal(len(t)), 2500, 7000, 1) * np.sin(np.pi * t / dur) * 0.15
    return fades(y * vel, 0.001, 0.01)

def ding(f=1568.0, vel=0.8, r=None):
    return addl(I.glock(f, vel, r, dur=1.4), I.vibes(f / 2, vel * 0.6, r, dur=1.2), 0.5)

def coin_ring(r, dur=1.2):
    t = tt(dur)
    y = modal(dur, [(2380, 1.0, 0.6), (3920, 0.6, 0.35), (5610, 0.35, 0.2), (7230, 0.2, 0.12)], r)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.003) * 0.4
    return fades(y, 0.0005, 0.05)

def spin_ticks(r, dur, rate0=26.0, rate1=9.0):
    """the coin spinning: shimmering metallic ticks slowing down"""
    out = np.zeros(ns(dur))
    tm = 0.0
    while tm < dur:
        u = tm / dur
        rate = rate0 + (rate1 - rate0) * u
        x = modal(0.05, [(3100 + 300 * r.uniform(), 1.0, 0.012), (5200, 0.5, 0.008)], r) * (0.5 + 0.5 * np.sin(np.pi * u))
        k = ns(tm); out[k:k + len(x)] += x[: len(out) - k]
        tm += 1 / rate
    return out

def kick(vel=0.9):
    t = tt(0.32)
    f = 46 + 90 * np.exp(-t / 0.03)
    return fades(np.sin(phase(f)) * np.exp(-t / 0.11) * vel + lp(R.standard_normal(len(t)), 1200) * np.exp(-t / 0.004) * 0.3 * vel, 0.0005, 0.02)

def hat(r, vel=0.3, open_=False):
    t = tt(0.25 if open_ else 0.06)
    return fades(hp(r.standard_normal(len(t)), 7000, 2) * np.exp(-t / (0.06 if open_ else 0.012)) * vel, 0.0003, 0.005)

def popper(r):
    """party popper: crack + paper crackle"""
    t = tt(0.7)
    y = bp(r.standard_normal(len(t)), 600, 6000, 2) * np.exp(-t / 0.012) * 1.2
    y += lp(r.standard_normal(len(t)), 300) * np.exp(-t / 0.03) * 0.8
    for _ in range(40):
        k = ns(0.03 + r.exponential(0.12))
        if k < len(t) - 300:
            y[k:k + 300] += hp(r.standard_normal(300), 3000) * np.exp(-np.arange(300) / 40) * r.uniform(0.05, 0.25)
    return fades(y, 0.0003, 0.05)

def cash_register(r):
    """ka-ching: drawer thunk + bell + coin jingle"""
    t = tt(1.4)
    y = lp(r.standard_normal(len(t)), 700) * np.exp(-t / 0.03) * 0.9
    k = ns(0.09)
    bell = modal(1.2, [(2093, 1.0, 0.7), (4186, 0.5, 0.4), (3136, 0.4, 0.5), (6280, 0.2, 0.2)], r)
    y[k:k + len(bell)] += bell[: len(y) - k] * 0.9
    for i in range(7):
        kk = ns(0.12 + 0.05 * i + r.uniform(0, 0.03))
        c = G.clink(r, r.uniform(3500, 6000), 0.1)
        y[kk:kk + len(c)] += c[: len(y) - kk] * 0.35
    return fades(y, 0.0005, 0.08)

def scratch(r):
    """record scratch: noise through a band that whips down-up-down"""
    d = 0.42
    t = tt(d)
    fc = 900 * np.interp(t, [0, 0.1, 0.2, 0.32, d], [1.6, 0.35, 1.4, 0.3, 0.2])
    nz = r.standard_normal(len(t))
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / np.interp(T, t, fc)[None, :]) / 0.45) ** 2), 512, 64)
    y += 0.5 * np.sin(phase(fc * 0.5)) * np.interp(t, [0, 0.02, d - 0.05, d], [0, 1, 0.6, 0])
    return fades(y * np.interp(t, [0, 0.02, 0.3, d], [0, 1, 0.9, 0]), 0.001, 0.02)

def whistle_ref(r, dur=0.55):
    t = tt(dur)
    trill = 0.65 + 0.35 * np.sin(TAU * 32 * t)
    y = (np.sin(TAU * 2850 * t) + 0.6 * np.sin(TAU * 2950 * t + 1)) * trill
    y += bp(r.standard_normal(len(t)), 2000, 6000, 1) * 0.25
    return fades(y * np.interp(t, [0, 0.02, dur - 0.08, dur], [0, 1, 1, 0]), 0.002, 0.02)

def riser(r, dur, f0=180.0, f1=900.0):
    t = tt(dur)
    u = t / dur
    nz = colored(len(t), r, 0.8)
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (400 * 8 ** (T / dur))[None, :]) / 0.7) ** 2), 1024, 256)
    y = y / (np.std(y) + 1e-9) * u ** 2 * 0.5
    y += np.sin(phase(f0 * (f1 / f0) ** u)) * u ** 2 * 0.25
    return fades(y, 0.05, 0.01)

def laugh(r, base, dur):
    """one person laughing: 'ha-ha-ha' syllables on a falling pitch"""
    n = ns(dur)
    t = np.arange(n) / SR
    rate = r.uniform(4.2, 5.6)
    syl = np.clip(np.sin(np.pi * ((t * rate) % 1.0)) * 1.6, 0, 1) ** 1.5
    amp = syl * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.25, 0, 1) * (1 - 0.35 * t / dur)
    f0 = base * (1.35 - 0.4 * t / dur) * (1 + 0.06 * np.sin(np.pi * ((t * rate) % 1.0)))
    forms = G.vowel_track(n, [(0, "a"), (dur * 0.5, "A"), (dur, "a")])
    return G.vox(f0, forms, amp, r, r.uniform(0.95, 1.12), tilt=1.0, breath=0.55, fmax=4200)

def sparkle(r, vel=0.4):
    return I.glock(float(r.choice([2093, 2349, 2637, 3136, 3520])), vel, r, dur=0.6)

# ================================================================ SFX stem
sfx = np.zeros((2, N))
def S(x, t, gain_db=0.0, p=0.0, what=None):
    if x.ndim == 1:
        x = pan(x, p)
    place(sfx, x, t, dbg(gain_db))
    if what:
        cue(t, what)

# 1 hook: number tags count 1..23 (rising pentatonic blips)
PENTA = [0, 2, 4, 7, 9]
for i, f in enumerate(TL["tags"]):
    m = 72 + 12 * (i // 5) + PENTA[i % 5]
    S(blip(I.m2f(min(m, 100)), 0.55, R), fr(f), -22, p=0.6 * np.sin(i * 0.9), what="tag %d" % (i + 1) if i in (0, 22) else None)
# the coins: whoosh up, spinning ticks, a ring on landing
for c in TL["coins"]:
    t0, t1 = fr(c["f0"]), fr(c["f1"])
    S(G.whoosh(t1 - t0 + 0.4, R, peak=0.35, f_lo=300, f_hi=2600, tail=0.35), t0 - 0.05, -15, what="coin whoosh")
    S(spin_ticks(R, t1 - t0), t0, -21)
    S(coin_ring(R), t1, -15, what="coin ring")
# the match line 9-17 in the hook: zip + ding-ding on "birthday"
hl = TL["hookLink"]
S(zip_(R, 400, 1600, fr(hl[1] - hl[0]) + 0.05, 0.6), fr(hl[0]), -18, what="hook link zip")
for k, dt in enumerate((0.0, 0.13)):
    S(ding(1568, 0.8, R), fr(hl[1]) - 0.05 + dt, -16, p=(-0.3, 0.3)[k], what="match ding" if k == 0 else None)
# flash into the story
S(G.whoosh(0.5, R, peak=0.38, f_lo=500, f_hi=3000, tail=0.2), fr(TL["FLASH_AT"]) - 0.38, -15, what="flash whoosh")
S(kick(0.6), fr(TL["FLASH_AT"]), -14)
# "bets ... ten bucks": paper flick
S(bp(R.standard_normal(ns(0.08)), 1500, 6000, 1) * np.exp(-tt(0.08) / 0.015), fr(TL["cues"]["bets"]), -20, what="cash flick")
# laughter
t_l = fr(TL["cues"]["laugh"]) - 0.25
lau = np.zeros((2, ns(1.9)))
for i in range(13):
    base = R.uniform(105, 150) if i % 3 else R.uniform(190, 250)
    x = laugh(R, base, R.uniform(1.1, 1.6))
    place(lau, pan(x, R.uniform(-0.8, 0.8)), R.uniform(0, 0.25), 1 / 13 ** 0.5)
S(lau, t_l, -17, what="crowd laugh")
# 365: page pop + calendar flutter
S(pop(R, 700, 0.1, 0.9), fr(TL["cues"]["cal365"]), -16, what="365 pop")
flut = np.zeros(ns(0.9))
for i in range(60):
    k = ns(R.uniform(0, 0.7))
    flut[k:k + 400] += bp(R.standard_normal(400), 1200, 5000, 1) * np.exp(-np.arange(400) / 90) * R.uniform(0.3, 1)
S(widen(flut, R, 9, 1.0), fr(TL["cues"]["calBurst"]), -18, what="calendar flutter")
# bubbles: pops (+ a short murmur syllable for the roll call)
for b in TL["bubbles"]:
    hot = b.get("hot", False)
    S(pop(R, 1100 if hot else 850, 0.09, 0.9), fr(b["a"]), -15 if hot else -18, p=R.uniform(-0.4, 0.4), what="bubble %s" % b["text"])
    if b.get("shot") == 7:
        S(G.babble(0.45, R, R.uniform(110, 210), R.uniform(0.95, 1.1), rate=6, active=1.0), fr(b["a"]) - 0.05, -24, p=R.uniform(-0.5, 0.5))
# silence: crickets (and no music)
s5 = next(s for s in TL["shots"] if s["id"] == 5)
cr = G.crickets(fr(s5["b"] - s5["a"]) + 0.6, R, 3)
S(widen(cr * np.interp(np.arange(len(cr)), [0, ns(0.05), len(cr) - ns(0.3), len(cr)], [0, 1, 1, 0]), R, 9, 1.0), fr(s5["a"]), -19, what="crickets")
# seventeen: the match stinger (impact + ding-ding + crowd "ooh")
t17 = fr(TL["cues"]["seventeen"])
S(kick(1.0), t17, -14, what="match impact")
S(I.cymbal(0.6, R, 2.0), t17, -22)
for k, dt in enumerate((0.02, 0.15)):
    S(ding(1760, 0.9, R), t17 + dt, -15, p=(-0.3, 0.3)[k])
ooh = np.zeros((2, ns(0.8)))
for i in range(9):
    place(ooh, pan(G.whoa(R, R.uniform(100, 220)), R.uniform(-0.8, 0.8)), R.uniform(0.05, 0.2), 1 / 3)
S(ooh, t17 + 0.25, -19, what="crowd ooh")
# confetti + cheers
for k, f in enumerate(TL["confetti"]):
    S(popper(R), fr(f), -13, p=(0.0, 0.0, 0.2)[k], what="party popper")
for t0, n_people in ((fr(TL["confetti"][0]) + 0.1, 10), (fr(TL["confetti"][2]) + 0.1, 8)):
    ch = np.zeros((2, ns(1.4)))
    for i in range(n_people):
        place(ch, pan(G.hurrah(R, R.uniform(110, 230), R.uniform(0.95, 1.1)), R.uniform(-0.8, 0.8)), R.uniform(0, 0.3), 1 / n_people ** 0.5)
    S(ch, t0, -15, what="cheer")
apl = G.applause(2.6, R, 30, env=np.interp(np.arange(ns(2.6)), [0, ns(0.2), ns(1.8), ns(2.6)], [0, 1, 0.7, 0]))
S(apl, fr(TL["confetti"][0]) + 0.3, -21, what="applause")
# "Wait, how?": record scratch, question-mark pops
s11 = next(s for s in TL["shots"] if s["id"] == 11)
S(scratch(R), fr(s11["a"]) - 0.08, -15, what="record scratch")
for k in range(3):
    S(pop(R, 600 + 150 * k, 0.08, 0.7), fr(TL["cues"]["waitHow"] + 3 * k), -20, p=(-0.3, 0.3, 0)[k])
# golden-hour transition
S(G.whoosh(0.8, R, peak=0.4, f_lo=250, f_hi=1500, tail=0.4), fr(next(s for s in TL["shots"] if s["id"] == 12)["a"]) - 0.4, -19, what="golden whoosh")
# Gary's 22 lines: quick rising zips
g0, g1 = TL["garyLines"]
for i in range(22):
    t = fr(g0 + i * (g1 - g0) / 21)
    S(zip_(R, 380 + 25 * i, 1300 + 40 * i, 0.07, 0.5), t, -22, p=0.6 * np.sin(i * 1.3))
cue(fr(g0), "Gary's 22 zips")
# "any two people": pings; the web of 253 pairs: shimmer + riser
for a, b, f in TL["samplePairs"]:
    S(blip(I.m2f(84 + (a % 5)), 0.6, R), fr(f), -17)
w0, w1 = TL["webBuild"]
dw = fr(w1 - w0)
sh = np.zeros((2, ns(dw + 0.8)))
for i in range(160):
    u = (i / 160) ** 0.8
    place(sh, pan(sparkle(R, 0.25 + 0.3 * u), R.uniform(-0.9, 0.9)), u * dw, 0.5)
S(sh, fr(w0), -21, what="web shimmer")
S(riser(R, dw + 0.15), fr(w0) - 0.15, -19, what="web riser")
S(ding(2093, 0.9, R), fr(w1), -15, what="web complete ding")
# handshakes: soft pats on each pairing; twinkles on "tiny chance at a match"
sa, sb, se = TL["shake"]
for t0 in (fr(sa), fr(sb)):
    for k in range(11):
        pat = lp(R.standard_normal(ns(0.05)), 1800) * np.exp(-tt(0.05) / 0.01)
        S(pat, t0 + 0.02 * k + R.uniform(0, 0.03), -20, p=R.uniform(-0.8, 0.8))
    S(sparkle(R, 0.5), t0 + 0.05, -20)
cue(fr(sa), "handshake pats")
tc = fr(TL["cues"]["tinyChance"])
for k in range(10):
    S(sparkle(R, 0.35), tc + 0.18 * k, -23, p=R.uniform(-0.8, 0.8))
# 50 / 70 newcomers pop in; "guaranteed": the big hit
for (a, b), n_new in ((TL["grow50"], 27), (TL["grow70"], 20)):
    for j in range(n_new):
        S(pop(R, R.uniform(700, 1300), 0.07, 0.6), fr(a + j * (b - a) / n_new), -21, p=R.uniform(-0.8, 0.8))
    S(riser(R, 0.6, 300, 1200), fr(a) - 0.1, -24)
    cue(fr(a), "newcomers pop (%d)" % n_new)
tfl = fr(TL["flare"])
S(I.timpani(87.3, 1.0, R, 2.0), tfl, -12, what="guaranteed hit")
S(I.cymbal(0.9, R, 2.6), tfl, -18)
# stadium: crowd roar bed, referee whistle, link ping, cheer on the shared birthday
s17 = next(s for s in TL["shots"] if s["id"] == 17)
d17 = fr(s17["b"] - s17["a"]) + 0.5
roar = widen(bp(colored(ns(d17), R, 1.0), 250, 3200, 1), R, 13, 1.0)
roar = roar / (np.std(roar) + 1e-9) * (0.8 + 0.2 * smooth_noise(ns(d17), R, 0.6))[None, :]
roar += G.applause(d17, R, 40) * 1.5
env17 = np.interp(np.arange(ns(d17)), [0, ns(0.4), ns(d17 - 0.6), ns(d17)], [0, 1, 1, 0])
S(roar * env17[None, :], fr(s17["a"]) - 0.25, -27, what="stadium roar")
S(whistle_ref(R), fr(s17["a"]) + 0.35, -21, p=0.3, what="referee whistle")
S(zip_(R, 400, 1600, 0.25, 0.6), fr(TL["cupLink"][0]), -19)
S(ding(1568, 0.8, R), fr(TL["cupCake"]), -15, what="cup match ding")
ch = np.zeros((2, ns(1.5)))
for i in range(12):
    place(ch, pan(G.hurrah(R, R.uniform(100, 200), R.uniform(0.95, 1.1)), R.uniform(-0.9, 0.9)), R.uniform(0, 0.4), 1 / 12 ** 0.5)
S(ch, fr(TL["cupCake"]) + 0.1, -18, what="stadium cheer")
# Gary's crowd: murmur bed + the crane-out whoosh
s18 = next(s for s in TL["shots"] if s["id"] == 18)
d18 = fr(s18["b"] - s18["a"]) + 0.4
mur = np.zeros((2, ns(d18)))
for i in range(7):
    place(mur, pan(G.babble(d18, R, R.uniform(100, 230), R.uniform(0.95, 1.12), rate=3.8, active=0.6), R.uniform(-0.9, 0.9)), 0, 1 / 7 ** 0.5)
mur = lp(mur, 2500, 1) * np.interp(np.arange(ns(d18)), [0, ns(0.4), ns(d18 - 0.4), ns(d18)], [0, 1, 1, 0])[None, :]
S(mur, fr(s18["a"]) - 0.2, -27, what="crowd murmur")
S(G.whoosh(1.9, R, peak=0.9, f_lo=200, f_hi=1800, tail=0.6), fr(TL["cues"]["need"]) - 0.6, -16, what="crane whoosh")
# the end: party murmur, wink ding, ka-ching on "bet"
s19 = next(s for s in TL["shots"] if s["id"] == 19)
d19 = DUR - fr(s19["a"]) + 0.1
mur2 = np.zeros((2, ns(d19)))
for i in range(5):
    place(mur2, pan(G.babble(d19, R, R.uniform(100, 230), R.uniform(0.95, 1.12), rate=4.0, active=0.6), R.uniform(-0.9, 0.9)), 0, 1 / 5 ** 0.5)
S(lp(mur2, 2500, 1), fr(s19["a"]) - 0.1, -30, what="party murmur")
S(I.glock(2637, 0.6, R, 0.8), fr(TL["cues"]["make"]) + 0.15, -21, what="wink")
S(cash_register(R), fr(TL["cues"]["bet"]) - 0.06, -14, what="ka-ching")
# camera glides: soft whooshes on fast moves (cuts are excluded: single-frame spikes)
spd = np.array([s for _, s in TL["camSpeed"]]); frs = np.array([f for f, _ in TL["camSpeed"]])
sm = ndimage.uniform_filter1d(np.minimum(spd, np.median(spd) * 60 + 1e-9), 5)
cut = np.zeros_like(spd, bool)
for i in range(1, len(spd) - 1):
    cut[i] = spd[i] > 6 * max(spd[i - 1], spd[i + 1], 1e-4)
last = -99
for i in range(2, len(sm) - 2):
    if cut[i] or sm[i] < 0.12 or not (sm[i] >= sm[i - 1] and sm[i] >= sm[i + 1]) or frs[i] - last < 18:
        continue
    g = float(np.clip(-27 + 6 * np.log2(sm[i] / 0.12), -27, -18))
    S(G.whoosh(0.9, R, peak=0.45, f_lo=300, f_hi=1800, tail=0.3), fr(frs[i]) - 0.45, g, p=R.uniform(-0.3, 0.3), what="glide whoosh")
    last = frs[i]
room = convolve_st(sfx.mean(0), make_ir(0.5, 7, hf=1.6)) * dbg(-16)
sfx = sfx + room

# ================================================================ music
mus = np.zeros((2, N))
def M(x, t, gain_db=0.0, p=0.0):
    if x.ndim == 1:
        x = pan(x, p)
    place(mus, x, t, dbg(gain_db))

Q = 0.5  # 120 bpm
CHORD = {"F": (41, [65, 69, 72]), "Dm": (38, [62, 65, 69]), "Bb": (34, [62, 65, 70]), "C": (36, [64, 67, 72]), "Gm": (43, [62, 67, 70]),
         "C7": (36, [64, 67, 70]), "Am": (45, [64, 69, 72]), "A": (45, [61, 64, 69])}
PROG = ["F", "Dm", "Bb", "C"]
MEL = [  # (beat, length, midi) over 4 bars, original bouncy tune
    (0, .5, 72), (.5, .5, 77), (1, .5, 76), (1.5, .5, 74), (2, 1, 72), (3, .5, 69), (3.5, .5, 70),
    (4, .5, 72), (4.5, .5, 74), (5, 1, 72), (6, .5, 69), (6.5, .5, 65), (7, 1, 67),
    (8, .5, 74), (8.5, .5, 77), (9, .5, 81), (9.5, .5, 79), (10, 1, 77), (11, 1, 74),
    (12, .5, 72), (12.5, .5, 74), (13, .5, 76), (13.5, .5, 79), (14, 2, 77)]

def groove(t0, t1, layers=("bass", "chords", "drums", "mel"), mel_gain=-6.0, prog=PROG, energy=1.0, mel_inst="glock"):
    """the main groove on a 120 bpm grid from t0 (bar-aligned) until t1"""
    nbeats = int((t1 - t0) / Q + 1e-6)
    for b in range(nbeats):
        t = t0 + b * Q
        bar, beat = divmod(b, 4)
        root, tri = CHORD[prog[bar % len(prog)]]
        if "bass" in layers:
            m = [root, root + 7, root + 12, root + 7][beat]
            M(I.pluck(I.m2f(m), 0.85, R, dur=0.6, bright=0.35), t, -4)
        if "chords" in layers:
            for m in tri:
                M(I.pluck(I.m2f(m), 0.45, R, dur=0.35, bright=0.6), t + Q / 2, -11, p=0.4 * np.sin(m))
        if "drums" in layers:
            if beat in (0, 2):
                M(kick(0.8 * energy), t, -8)
            if beat in (1, 3):
                M(I.snare(0.35 * energy, R, 0.25, snappy=0.7), t, -15, p=0.1)
            for h in (0, 0.5):
                M(hat(R, 0.25 if h else 0.18), t + h * Q, -19, p=-0.3)
    if "mel" in layers:
        for ph in range(int(np.ceil(nbeats / 16))):
            for (mb, ml, mm) in MEL:
                tt0 = t0 + (16 * ph + mb) * Q
                if tt0 < t1 - 0.05:
                    x = I.glock(I.m2f(mm), 0.6, R, dur=0.9) if mel_inst == "glock" else I.musicbox(I.m2f(mm), 0.6, R, dur=1.0)
                    M(x, tt0, mel_gain, p=0.15)

def bars_end(t0, t1):
    """last bar line at or before t1 on a grid starting at t0 (for clean stops)"""
    return t0 + int((t1 - t0) / (4 * Q)) * 4 * Q

shot = {s["id"]: s for s in TL["shots"]}
T = lambda i: fr(shot[i]["a"])
# hook: groove from 0 with a coin build; stop-hit on "birthday"
hook_end = fr(TL["hookLink"][1])
groove(0.0, hook_end, layers=("bass", "drums", "mel"), mel_gain=-8)
for k in range(int((fr(TL["coins"][0]["f1"]) - fr(TL["coins"][0]["f0"])) / 0.0625)):
    M(I.snare(0.15 + 0.03 * k, R, 0.12, buzz=True), fr(TL["coins"][0]["f0"]) + k * 0.0625, -20)
for m in (53, 65, 69, 72, 77):
    M(I.brass(I.m2f(m), 0.5, 0.8, R, kind="stab"), hook_end - 0.02, -15)
M(I.cymbal(0.7, R, 2.2), hook_end - 0.02, -16)
cue(hook_end, "music: hook stop-hit")
# story groove until "Silence", dead stop; restart on "See?"; stop on "Wait"
g1a, g1b = T(2), T(5)
groove(g1a, g1b, mel_gain=-7)
cue(g1a, "music: story groove")
g2a, g2b = T(6), T(11)
groove(g2a, g2b, mel_gain=-7)
cue(g2a, "music: groove resumes")
# celebration stabs from the confetti to "Wait"
tc0 = fr(TL["confetti"][0])
for k in range(int((g2b - tc0) / (2 * Q))):
    for m in (65, 69, 72):
        M(I.brass(I.m2f(m + (0 if k % 2 == 0 else 2)), 0.25, 0.6, R, kind="stab"), tc0 + k * 2 * Q + Q, -17)
# explanation: golden pad, half-time plucks; the web riser; handshake groove; the coin; the build to "guaranteed"
e0, e1 = T(12), fr(TL["webBuild"][1])
PAD = [["Dm", "Bb"], ["F", "C"]]
pt = e0
pc = 0
while pt < e1 - 0.1:
    name = ["Dm", "Bb", "F", "C"][pc % 4]
    root, tri = CHORD[name]
    seg = min(2.0, e1 - pt)
    M(I.pad([I.m2f(m) for m in tri] + [I.m2f(root + 12)], seg, 0.5, R, att=0.4, rel=0.6, warm=1200), pt, -9)
    for k in range(int(seg / (2 * Q))):
        M(I.pluck(I.m2f(root + 12), 0.5, R, dur=0.7, bright=0.3), pt + k * 2 * Q, -9)
        M(I.musicbox(I.m2f(tri[(k + pc) % 3] + 12), 0.4, R, dur=1.0), pt + k * 2 * Q + Q, -13, p=0.3)
    pt += seg
    pc += 1
cue(e0, "music: explanation pad")
for m in (53, 60, 65, 69, 72, 77):
    M(I.brass(I.m2f(m), 0.6, 0.7, R, kind="horn"), e1, -15)
hs0 = T(14)
groove(hs0, T(15) + 1.0, layers=("bass", "chords", "mel"), mel_gain=-9, prog=["F", "Bb", "C", "F"], mel_inst="musicbox")
cue(hs0, "music: handshake pizzicato")
b0, b1 = T(15) + 1.0, tfl
roll_n = int((b1 - b0) / 0.0625)
for k in range(roll_n):
    u = k / max(1, roll_n - 1)
    M(I.snare(0.12 + 0.55 * u ** 2, R, 0.12, buzz=True), b0 + k * 0.0625, -16)
for k in range(int((b1 - b0) / Q)):
    M(I.pluck(I.m2f(41 + [0, 2, 4, 5, 7, 9, 11, 12][min(7, k * 8 // max(1, int((b1 - b0) / Q)))]), 0.8, R, dur=0.5, bright=0.4), b0 + k * Q, -6)
for m in (41, 53, 60, 65, 69, 72, 77):
    M(I.brass(I.m2f(m), 1.2, 0.9, R, kind="horn"), tfl, -10)
cue(b0, "music: build to guaranteed")
# stadium: anthem chords (brass) at 72 bpm-ish half notes
s17a, s17b = T(17), T(18)
an = ["F", "Bb", "C", "F", "Dm", "Bb", "C", "F"]
q2 = (s17b - s17a) / len(an)
for k, name in enumerate(an):
    root, tri = CHORD[name]
    for m in [root, root + 12] + [x for x in tri]:
        M(I.brass(I.m2f(m), q2 * 0.95, 0.6, R, kind="soft" if m < 50 else "horn"), s17a + k * q2, -13)
    M(I.timpani(I.m2f(root), 0.5, R, 1.4), s17a + k * q2, -16)
cue(s17a, "music: stadium anthem")
# Gary alone: a slow music-box "Happy Birthday" (public-domain melody), then a swell under the crane
hb = [(0, .75, 60), (.75, .25, 60), (1, 1, 62), (2, 1, 60), (3, 1, 65), (4, 2, 64),
      (6, .75, 60), (6.75, .25, 60), (7, 1, 62), (8, 1, 60), (9, 1, 67), (10, 2, 65)]
s18a = T(18) + 0.2
qh = 0.36
for b, l, m in hb:
    M(I.musicbox(I.m2f(m + 12), 0.55, R, dur=1.4), s18a + b * qh, -8, p=0.2)
for k, name in enumerate(["F", "C", "C", "F"]):
    root, tri = CHORD[name]
    M(I.pad([I.m2f(x) for x in tri], 3 * qh, 0.35, R, att=0.3, rel=0.5, warm=900), s18a + k * 3 * qh, -16)
tsw = fr(TL["cues"]["need"]) - 0.6
M(I.pad([I.m2f(m) for m in (53, 60, 65, 69, 72)], 2.2, 0.6, R, att=1.6, rel=0.5, warm=1500), tsw, -10)
M(I.cymbal(0.5, R, 2.5), tsw + 1.6, -22)
cue(s18a, "music: music-box Happy Birthday")
# the ending: groove reprise, button chord on "bet"
t19 = T(19)
tb = fr(TL["cues"]["bet"])
groove(t19, tb, mel_gain=-7, energy=1.1)
for m in (41, 53, 65, 69, 72, 77, 81):
    M(I.brass(I.m2f(m), 0.6, 0.85, R, kind="stab"), tb, -11)
M(I.cymbal(0.8, R, 2.0), tb, -16)
cue(t19, "music: reprise")
cue(tb, "music: button")
# room reverb on the music
mus = mus + convolve_st(mus.mean(0), make_ir(1.1, 3, hf=1.3)) * dbg(-13)

# ================================================================ voice + mix
vx, vsr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
v = signal.resample_poly(vx[0], SR, vsr)
voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
voice = peq(hp(voice, 70), 3500, 1.5, 0.8)  # a touch of presence
voice = st(voice)
# speech mask from the word timings (attack 60 ms, release 250 ms) -> music duck
mask = np.zeros(N)
for w in WORDS:
    mask[ns(w["s"]): ns(w["e"] + 0.05)] = 1.0
mask = ndimage.maximum_filter1d(mask, ns(0.18))
mask = ndimage.uniform_filter1d(mask, ns(0.12))
duck = dbg(-4.0 * mask)

def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -70.0

v_l = lufs(voice)
voice_g = dbg(-17.0 - v_l)
voice *= voice_g
m_l = lufs(mus)
mus = mus * dbg(-17.0 - 6.5 - m_l)
mus = mus * duck[None, :]
s_l = lufs(sfx)
sfx = sfx * dbg(-17.0 - 9.0 - s_l)
mix = voice + mus + sfx
# master: loudness to -14 LUFS, then a look-ahead peak limiter to -1 dBTP
def limit(mix, ceil_db=-1.3):
    ceil = dbg(ceil_db)
    look = ns(0.004)
    pk = ndimage.maximum_filter1d(np.abs(mix).max(0), 2 * look + 1)
    gain = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    gain = -ndimage.maximum_filter1d(-gain, ns(0.01))
    a = np.exp(-1 / ns(0.08))
    g = gain.copy()
    for i in range(1, len(g)):
        g[i] = min(gain[i], a * g[i - 1] + (1 - a) * gain[i])
    return mix * g[None, :]
for _ in range(4):
    mix *= dbg(-14.0 - lufs(mix))
    mix = limit(mix)
tp = true_peak(mix)
if tp > -1.0:
    mix *= dbg(-1.0 - tp - 0.05)
mix[:, -ns(0.12):] *= np.linspace(1, 0, ns(0.12))[None, :]

OUT = os.path.join(ROOT, "out", "audio")
os.makedirs(OUT, exist_ok=True)
write_wav(os.path.join(OUT, "mix.wav"), mix)
write_wav(os.path.join(OUT, "stem_voice.wav"), voice)
write_wav(os.path.join(OUT, "stem_music.wav"), mus)
write_wav(os.path.join(OUT, "stem_sfx.wav"), sfx)
rep = [f"# Sound cues: The Birthday Bet ({DUR:.3f} s, {N} samples @ {SR} Hz)",
       f"mix integrated {lufs(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP; stems integrated: voice {lufs(voice):.1f}, music {lufs(mus):.1f}, sfx {lufs(sfx):.1f} LUFS", ""]
rep += [f"- {t:7.3f} s (f{round(t * FPS):4d})  {w}" for t, w in sorted(CUES)]
open(os.path.join(OUT, "cues.md"), "w").write("\n".join(rep) + "\n")
print("\n".join(rep[:2]))
print(len(CUES), "cues")
