# Sound for "The Birthday Bet" (v3): original score + synthesized SFX + the voice, all from numpy (dsp.py / instruments.py /
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
line_end = lambda li: max(w["e"] for w in WORDS if w["line"] == li)

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

def slap(r):
    """a bill slapped flat on the lens: paper smack + body thump + crackle"""
    t = tt(0.35)
    y = lp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.012)
    y += np.sin(phase(70 + 120 * np.exp(-t / 0.02))) * np.exp(-t / 0.07) * 0.9
    y += bp(r.standard_normal(len(t)), 2500, 8000, 1) * np.exp(-t / 0.03) * 0.35
    return fades(y, 0.0003, 0.03)

def flick(r, vel=1.0):
    """one banknote flicked"""
    t = tt(0.08)
    return bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.015) * vel

def tick(r, f=1800.0):
    """counter tick: a dry woodblock click"""
    return fades(modal(0.07, [(f, 1.0, 0.02), (f * 1.78, 0.5, 0.012)], r), 0.0003, 0.01)

# ================================================================ SFX stem
sfx = np.zeros((2, N))
def S(x, t, gain_db=0.0, p=0.0, what=None):
    if x.ndim == 1:
        x = pan(x, p)
    place(sfx, x, t, dbg(gain_db))
    if what:
        cue(t, what)

shot = {s["id"]: s for s in TL["shots"]}
T = lambda i: fr(shot[i]["a"])
# 1 hook: number tags count 1..23 (rising pentatonic blips)
PENTA = [0, 2, 4, 7, 9]
for i, f in enumerate(TL["tags"]):
    m = 72 + 12 * (i // 5) + PENTA[i % 5]
    S(blip(I.m2f(min(m, 100)), 0.55, R), fr(f), -22, p=0.6 * np.sin(i * 0.9), what="tag %d" % (i + 1) if i in (0, 22) else None)
# 2 the $100 bill slaps the lens
t_slap = fr(TL["slap"])
S(G.whoosh(0.3, R, peak=0.25, f_lo=600, f_hi=3500, tail=0.05), t_slap - 0.24, -17)
S(slap(R), t_slap, -9, what="bill slap")
S(kick(0.7), t_slap, -15)
# 3 laughter, the 365 page and the calendar flutter
t_l = T(3) + 0.05  # under "You'd take that bet, right?", gone before "Three sixty-five"
lau = np.zeros((2, ns(1.5)))
for i in range(13):
    base = R.uniform(105, 150) if i % 3 else R.uniform(190, 250)
    place(lau, pan(laugh(R, base, R.uniform(0.75, 1.05)), R.uniform(-0.8, 0.8)), R.uniform(0, 0.15), 1 / 13 ** 0.5)
S(lau, t_l, -22, what="crowd laugh")
S(pop(R, 700, 0.1, 0.9), fr(TL["cues"]["cal365"]), -16, what="365 pop")
flut = np.zeros(ns(0.9))
for i in range(60):
    k = ns(R.uniform(0, 0.7))
    flut[k:k + 400] += bp(R.standard_normal(400), 1200, 5000, 1) * np.exp(-np.arange(400) / 90) * R.uniform(0.3, 1)
S(widen(flut, R, 9, 1.0), fr(TL["cues"]["calBurst"]), -18, what="calendar flutter")
# 4 "Gary did. So did the whole party.": a bill flicked up per guest, round the ring
for i, f in enumerate(TL["cash"]):
    S(flick(R, 0.9 if i == 0 else 0.6), fr(f), -16 if i == 0 else -21, p=R.uniform(-0.7, 0.7), what="cash up (Gary)" if i == 0 else None)
cue(fr(TL["cash"][1]), "cash wave round the ring")
# 5 the stakes pill: low "uh-oh" sting
t_st = fr(TL["stakes"][0])
S(pop(R, 520, 0.12, 0.9), t_st, -17, what="stakes pill")
S(I.timpani(73.4, 0.9, R, 1.6), t_st, -15)
# bubbles: pops (+ a short murmur syllable for the roll call)
for b in TL["bubbles"]:
    hot = b.get("hot", False)
    S(pop(R, 1100 if hot else 850, 0.09, 0.9), fr(b["a"]), -15 if hot else -19, p=R.uniform(-0.4, 0.4), what="bubble %s" % b["text"] if b["shot"] != 8 else None)
    if b["shot"] == 8:
        S(G.babble(0.4, R, R.uniform(110, 210), R.uniform(0.95, 1.1), rate=6, active=1.0), fr(b["a"]) - 0.05, -25, p=R.uniform(-0.5, 0.5))
# 7 silence: crickets (and no music)
cr = G.crickets(T(8) - T(7) + 0.5, R, 3)
S(widen(cr * np.interp(np.arange(len(cr)), [0, ns(0.05), len(cr) - ns(0.3), len(cr)], [0, 1, 1, 0]), R, 9, 1.0), T(7) - 0.05, -18, what="crickets")
# 8 roll call: a counter tick per guest checked
for k, f in enumerate(TL["roll"]):
    S(tick(R, 1700 + 40 * k), fr(f), -19, p=0.25, what="counter ticks 1..16" if k == 0 else None)
S(tick(R, 2400), fr(TL["sep17"]), -18)
# 9 Gary counts his money: a riffle of bills
t9 = T(9) + 0.15
for k in range(int((T(10) - t9 - 0.1) * 13)):
    S(flick(R, R.uniform(0.4, 0.8)), t9 + k / 13 + R.uniform(0, 0.01), -21, p=0.3)
cue(t9, "Gary's money riffle")
# 10 the record scratch: freeze-frame + flash
t_fz = fr(TL["FREEZE"][0])
S(scratch(R), t_fz - 0.03, -11, what="record scratch (freeze)")
S(G.whoosh(0.4, R, peak=0.1, f_lo=800, f_hi=4000, tail=0.3), t_fz, -22)
# 11 the hand goes up: a riser; the match: impact + ding-ding + crowd "ooh"
r0, r1 = fr(TL["raise"][0]), fr(TL["match"])
S(riser(R, r1 - r0 + 0.05, 220, 880), r0, -18, what="hand-raise riser")
t_m = fr(TL["match"])
S(kick(1.0), t_m, -16, what="match impact")
S(I.cymbal(0.6, R, 2.0), t_m, -21)
t_me = line_end(8)
for k, dt in enumerate((0.0, 0.12)):
    S(ding(1760, 0.9, R), t_me + dt, -17, p=(-0.3, 0.3)[k])
ooh = np.zeros((2, ns(0.8)))
for i in range(9):
    place(ooh, pan(G.whoa(R, R.uniform(100, 220)), R.uniform(-0.8, 0.8)), R.uniform(0.05, 0.2), 1 / 3)
S(ooh, t_me + 0.02, -21, what="crowd ooh")
# 12 Dave wins: ka-ching on "won", popper + cheers + applause on the sum
S(popper(R), fr(TL["confetti"][0]), -17, what="party popper (wide)")
S(popper(R), fr(TL["confetti"][1]), -20, p=-0.5)
S(popper(R), fr(TL["confetti"][1]) + 0.03, -20, p=0.5)
S(cash_register(R), fr(TL["confetti"][1]) - 0.05, -18, what="ka-ching (Dave CU)")
S(popper(R), fr(TL["confetti"][2]), -15, p=-0.5, what="confetti cannons (end)")
S(popper(R), fr(TL["confetti"][2]) + 0.03, -15, p=0.5)
for t0, n_people in ((fr(TL["confetti"][0]) + 0.1, 10), (fr(TL["confetti"][2]) + 0.1, 8)):
    ch = np.zeros((2, ns(1.4)))
    for i in range(n_people):
        place(ch, pan(G.hurrah(R, R.uniform(110, 230), R.uniform(0.95, 1.1)), R.uniform(-0.8, 0.8)), R.uniform(0, 0.3), 1 / n_people ** 0.5)
    S(ch, t0, -20 if n_people == 10 else -15, what="cheer")
apl = G.applause(2.2, R, 30, env=np.interp(np.arange(ns(2.2)), [0, ns(0.2), ns(1.5), ns(2.2)], [0, 1, 0.7, 0]))
S(apl, fr(TL["confetti"][0]) + 0.3, -25, what="applause")
# 13 "Here's what Gary missed": question-mark pops, a thud on "Your brain"
for k in range(3):
    S(pop(R, 600 + 150 * k, 0.08, 0.7), fr(TL["cues"]["missed"] + 3 * k), -20, p=(-0.3, 0.3, 0)[k])
S(kick(0.55), fr(TL["cues"]["your"]), -17, what="'your brain' thud")
# golden-hour transition
S(G.whoosh(0.8, R, peak=0.4, f_lo=250, f_hi=1500, tail=0.4), T(14) - 0.4, -19, what="golden whoosh")
# 14 Gary's 22 lines: quick rising zips
g0, g1 = TL["garyLines"]
for i in range(22):
    S(zip_(R, 380 + 25 * i, 1300 + 40 * i, 0.07, 0.5), fr(g0 + i * (g1 - g0) / 21), -22, p=0.6 * np.sin(i * 1.3))
cue(fr(g0), "Gary's 22 zips")
# 15 "any two people": pings; the web of 253 pairs: shimmer + riser + ding
for a_, b_, f in TL["samplePairs"]:
    S(blip(I.m2f(84 + (a_ % 5)), 0.6, R), fr(f), -17)
w0, w1 = TL["webBuild"]
dw = fr(w1 - w0)
sh = np.zeros((2, ns(dw + 0.8)))
for i in range(160):
    u = (i / 160) ** 0.8
    place(sh, pan(sparkle(R, 0.25 + 0.3 * u), R.uniform(-0.9, 0.9)), u * dw, 0.5)
S(sh, fr(w0), -21, what="web shimmer")
S(riser(R, dw + 0.15), fr(w0) - 0.15, -19, what="web riser")
S(ding(2093, 0.9, R), fr(w1), -18, what="web complete ding")
# 16 the coin: whoosh up, spinning ticks, a ring on landing
for c in TL["coins"]:
    t0, t1 = fr(c["f0"]), fr(c["f1"])
    S(G.whoosh(t1 - t0 + 0.4, R, peak=0.35, f_lo=300, f_hi=2600, tail=0.35), t0 - 0.05, -15, what="coin whoosh")
    S(spin_ticks(R, t1 - t0), t0, -21)
    S(coin_ring(R), t1, -18, what="coin ring")
# 17 stadium: crowd roar bed, referee whistle, link zip, cheer on the shared birthday
d17 = T(18) - T(17) + 0.5
roar = widen(bp(colored(ns(d17), R, 1.0), 250, 3200, 1), R, 13, 1.0)
roar = roar / (np.std(roar) + 1e-9) * (0.8 + 0.2 * smooth_noise(ns(d17), R, 0.6))[None, :]
roar += G.applause(d17, R, 40) * 1.5
env17 = np.interp(np.arange(ns(d17)), [0, ns(0.4), ns(d17 - 0.6), ns(d17)], [0, 1, 1, 0])
S(roar * env17[None, :], T(17) - 0.25, -27, what="stadium roar")
S(whistle_ref(R), T(17) + 0.35, -21, p=0.3, what="referee whistle")
S(zip_(R, 400, 1600, 0.25, 0.6), fr(TL["cupLink"][0]), -19)
S(ding(1568, 0.8, R), fr(TL["cupCake"]), -15, what="cup match ding")
ch = np.zeros((2, ns(1.5)))
for i in range(12):
    place(ch, pan(G.hurrah(R, R.uniform(100, 200), R.uniform(0.95, 1.1)), R.uniform(-0.9, 0.9)), R.uniform(0, 0.4), 1 / 12 ** 0.5)
S(ch, fr(TL["cupCake"]) + 0.1, -18, what="stadium cheer")
# 18 the twist: crowd murmur bed, the crane whoosh, the 253 card pops, a hit on "Same number"
d18 = T(19) - T(18) + 0.4
mur = np.zeros((2, ns(d18)))
for i in range(7):
    place(mur, pan(G.babble(d18, R, R.uniform(100, 230), R.uniform(0.95, 1.12), rate=3.8, active=0.6), R.uniform(-0.9, 0.9)), 0, 1 / 7 ** 0.5)
mur = lp(mur, 2500, 1) * np.interp(np.arange(ns(d18)), [0, ns(0.4), ns(d18 - 0.4), ns(d18)], [0, 1, 1, 0])[None, :]
S(mur, T(18) - 0.2, -27, what="crowd murmur")
S(G.whoosh(1.9, R, peak=0.9, f_lo=200, f_hi=1800, tail=0.6), fr(TL["cues"]["need"]) - 0.6, -16, what="crane whoosh")
c0, c1, _ = TL["card253"]
S(pop(R, 760, 0.1, 0.9), fr(c0), -16, what="card: 253 people")
S(pop(R, 980, 0.1, 0.9), fr(c1), -15, what="card: = 253 pairs")
S(I.timpani(87.3, 1.0, R, 1.8), fr(TL["cues"]["same"]), -17, what="'same number' hit")
# 19 the end: party murmur, the call-to-action pop, the wink, popper on "twin"
d19 = DUR - T(19) + 0.1
mur2 = np.zeros((2, ns(d19)))
for i in range(5):
    place(mur2, pan(G.babble(d19, R, R.uniform(100, 230), R.uniform(0.95, 1.12), rate=4.0, active=0.6), R.uniform(-0.9, 0.9)), 0, 1 / 5 ** 0.5)
S(lp(mur2, 2500, 1), T(19) - 0.1, -30, what="party murmur")
S(pop(R, 900, 0.1, 0.9), fr(TL["cta"]), -15, what="call-to-action pop")
S(I.glock(2637, 0.6, R, 0.8), fr(TL["cues"]["twin"]) - 0.2, -21, what="wink")
# camera glides: soft whooshes on fast moves (cuts are excluded: single-frame spikes)
spd = np.array([s_ for _, s_ in TL["camSpeed"]]); frs = np.array([f for f, _ in TL["camSpeed"]])
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

def stab(t, notes, g=-13, dur=0.6, kind="stab", vel=0.8):
    for m in notes:
        M(I.brass(I.m2f(m), dur, vel, R, kind=kind), t, g)

# hook: groove from 0, stop-hit on the slap; a soft pad under the rest of Dave's line
groove(0.0, t_slap, layers=("bass", "drums", "mel"), mel_gain=-8)
stab(t_slap - 0.02, (53, 65, 69, 72, 77), -15)
M(I.cymbal(0.7, R, 2.2), t_slap - 0.02, -17)
M(I.pad([I.m2f(m) for m in (53, 60, 65, 69)], T(3) - t_slap + 0.3, 0.35, R, att=0.25, rel=0.4, warm=1100), t_slap + 0.1, -17)
cue(t_slap, "music: hook stop-hit on the slap")
# the setup groove from the laugh to Gary's question; a low "dun-dun" under the stakes
groove(T(3), T(7), mel_gain=-7)
cue(T(3), "music: setup groove")
t_ste = line_end(3) + 0.03
for k, m in enumerate((38, 38, 37)):
    stab(t_ste + 0.2 * k, (m, m + 12), -12, dur=0.18 if k < 2 else 0.5, kind="soft")
# crickets: no music. roll call -> Gary's money -> guest 17: a ticking tension pulse in D minor that builds to the scratch
p0 = T(8)
nb = int((t_fz - p0) / (Q / 2))
for k in range(nb):
    t = p0 + k * Q / 2
    u = k / max(1, nb - 1)
    if k % 2 == 0:
        M(kick(0.55 + 0.35 * u), t, -10)
        M(I.pluck(I.m2f(38 if (k // 8) % 2 == 0 else 37), 0.8, R, dur=0.4, bright=0.3), t, -6)
    M(hat(R, 0.15 + 0.15 * u), t, -18 + 3 * u, p=-0.3)
    if k % 4 == 2:
        M(I.pluck(I.m2f([62, 65, 69, 65][(k // 4) % 4]), 0.5, R, dur=0.3, bright=0.6), t, -14, p=0.3)
cue(p0, "music: tension pulse (roll call)")
# the scratch kills it; the hand goes up over a held tremolo chord; the match: the hit
M(I.pad([I.m2f(m) for m in (50, 57, 62, 64)], r1 - r0 + 0.1, 0.4, R, att=0.6, rel=0.05, warm=1500), r0, -14)
stab(t_me, (41, 53, 65, 69, 72, 77), -12, dur=0.6)
M(I.cymbal(0.9, R, 2.4), t_me, -17)
M(I.timpani(87.3, 1.0, R, 1.6), t_me, -15)
cue(t_m, "music: match hit")
# celebration groove from the match into Dave's win, brass stabs on the off-beats
groove(t_m + 0.25, T(13), mel_gain=-7, energy=1.15)
for k in range(int((T(13) - t_m - 0.25) / (2 * Q))):
    stab(t_m + 0.25 + k * 2 * Q + Q, (65 + (0 if k % 2 == 0 else 2), 69 + (0 if k % 2 == 0 else 1), 72), -17, 0.25, vel=0.6)
cue(t_m + 0.25, "music: celebration")
# "Here's what Gary missed": the groove drops to a hanging pad
M(I.pad([I.m2f(m) for m in (50, 57, 62, 65)], T(14) - T(13) + 0.4, 0.4, R, att=0.15, rel=0.6, warm=1000), T(13), -12)
cue(T(13), "music: drop (pad)")
# the explanation: golden pad + half-time plucks until the web is built, horn swell on the last pair
e0, e1 = T(14), fr(TL["webBuild"][1])
pt, pc = e0, 0
while pt < e1 - 0.1:
    root, tri = CHORD[["Dm", "Bb", "F", "C"][pc % 4]]
    seg = min(2.0, e1 - pt)
    M(I.pad([I.m2f(m) for m in tri] + [I.m2f(root + 12)], seg, 0.5, R, att=0.4, rel=0.6, warm=1200), pt, -9)
    for k in range(int(seg / (2 * Q))):
        M(I.pluck(I.m2f(root + 12), 0.5, R, dur=0.7, bright=0.3), pt + k * 2 * Q, -9)
        M(I.musicbox(I.m2f(tri[(k + pc) % 3] + 12), 0.4, R, dur=1.0), pt + k * 2 * Q + Q, -13, p=0.3)
    pt += seg
    pc += 1
cue(e0, "music: explanation pad")
stab(e1, (53, 60, 65, 69, 72, 77), -15, dur=0.7, kind="horn", vel=0.6)
# the coin: snare roll up to the landing, a hit on "flip"
cf0, cf1 = fr(TL["coins"][0]["f0"]) - 0.6, fr(TL["coins"][0]["f1"])
for k in range(int((cf1 - cf0) / 0.0625)):
    u = k / max(1, int((cf1 - cf0) / 0.0625) - 1)
    M(I.snare(0.12 + 0.5 * u ** 2, R, 0.12, buzz=True), cf0 + k * 0.0625, -17)
stab(cf1, (41, 53, 60, 65, 69, 72), -11, dur=0.9, kind="horn", vel=0.85)
M(I.cymbal(0.7, R, 2.2), cf1, -17)
cue(cf1, "music: coin-flip hit")
# stadium: anthem chords (brass) on half notes
s17a, s17b = T(17), T(18)
an = ["F", "Bb", "C", "F", "Dm", "Bb", "C", "F"]
q2 = (s17b - s17a) / len(an)
for k, name in enumerate(an):
    root, tri = CHORD[name]
    for m in [root, root + 12] + list(tri):
        M(I.brass(I.m2f(m), q2 * 0.95, 0.6, R, kind="soft" if m < 50 else "horn"), s17a + k * q2, -13)
    M(I.timpani(I.m2f(root), 0.5, R, 1.4), s17a + k * q2, -16)
cue(s17a, "music: stadium anthem")
# the twist: a slow music-box "Happy Birthday" (public-domain melody), a swell under the crane, the hit on "Same"
hb = [(0, .75, 60), (.75, .25, 60), (1, 1, 62), (2, 1, 60), (3, 1, 65), (4, 2, 64)]
s18a, qh = T(18) + 0.2, 0.36
for b_, l_, m in hb:
    M(I.musicbox(I.m2f(m + 12), 0.55, R, dur=1.4), s18a + b_ * qh, -8, p=0.2)
for k, name in enumerate(["F", "C"]):
    root, tri = CHORD[name]
    M(I.pad([I.m2f(x) for x in tri], 3 * qh, 0.35, R, att=0.3, rel=0.5, warm=900), s18a + k * 3 * qh, -16)
tsw = fr(TL["cues"]["need"]) - 0.6
t_same = fr(TL["cues"]["same"])
M(I.pad([I.m2f(m) for m in (53, 60, 65, 69, 72)], t_same - tsw + 0.2, 0.6, R, att=1.2, rel=0.2, warm=1500), tsw, -10)
stab(t_same, (41, 53, 60, 65, 69, 72, 77), -14, dur=0.8, kind="horn", vel=0.9)
M(I.cymbal(0.8, R, 2.4), t_same, -16)
cue(t_same, "music: 'same number' hit")
# the ending: groove reprise from "Good thing", button chord on "twin"
t_end0 = fr(min(w["s"] for w in WORDS if w["line"] == 16)) - 0.05
tb = fr(TL["cues"]["twin"])
groove(t_end0, tb, mel_gain=-7, energy=1.1)
stab(tb, (41, 53, 65, 69, 72, 77, 81), -11, dur=0.85)
M(I.cymbal(0.8, R, 2.0), tb, -16)
cue(t_end0, "music: reprise")
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
duck = dbg(-5.5 * mask)
sfx_duck = dbg(-3.0 * mask)

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
sfx = sfx * dbg(-17.0 - 9.0 - s_l) * sfx_duck[None, :]
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
