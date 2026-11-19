# Sound for "Before You Watch Godzilla Minus Zero": an original synthesized score (our own chords and motif; no film
# themes, no studio roar), picture-locked SFX read from the shot table (audio/timeline.json, written by
# scripts/timeline.mjs) and the final mix under the narration.
# Run with the tts venv (numpy, scipy, soundfile):  python audio/score_gz.py
# Writes audio/out/{music,sfx,voice,mix}.wav (48 kHz stereo) and audio/out/cues.md.
import json
import os
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from dsp import SR, ns, rng, lp, hp, bp, colored, fades, place, st, integrated, true_peak, pan, make_ir, convolve_st  # noqa: E402
import instruments as I  # noqa: E402
import sfx_gen as G  # noqa: E402

TL = json.load(open(os.path.join(HERE, "timeline.json")))
FPS = TL["fps"]
TOTAL = TL["total"]
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
C = TL["cues"]
SH = TL["shots"]
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
WORDS = json.load(open(os.path.join(ROOT, "voice/words.json")))
cues = []


def cue(t, what):
    cues.append((t, what))


def shots_where(pred):
    return [s for s in SH if pred(s)]


# ---------------- music ----------------
BAR = 2.0  # 120 bpm, 4/4
CHORD = {"Dm": (2, "m"), "Bb": (10, ""), "F": (5, ""), "C": (0, ""), "Gm": (7, "m"), "A": (9, ""), "D": (2, ""), "G": (7, ""), "Bm": (11, "m"), "Em": (4, "m"),
         "Eb": (3, ""), "Cm": (0, "m"), "Ab": (8, ""), "Am": (9, "m"), "Fm": (5, "m"), "Db": (1, "")}
PROG = {
    "dark": ["Cm", "Ab", "Fm", "G"], "drone": ["Cm", "Cm", "Db", "Cm"], "epic": ["Cm", "Ab", "Eb", "Bb"], "hero": ["C", "G", "Am", "F"],
    "playful": ["F", "C", "Dm", "Bb"], "tender": ["F", "Dm", "Bb", "C"], "march": ["C", "F", "G", "C"],
}
# (start frame, mood, intensity): each segment runs until the next one
SEG = [
    (0, "drone", 0.22), (C["H1s"], "drone", 0.32), (C["H2b"], "dark", 0.45), (C["H3"] - 2, "epic", 0.5),
    (C["O1"], "drone", 0.3), (C["O2m"] - 30, "dark", 0.6), (C["O2h"] - 20, "playful", 0.4), (C["O3s"] - 10, "playful", 0.5),
    (C["Y1"], "playful", 0.55), (C["Y1f"] - 20, "hero", 0.6), (C["Y2r"] - 120, "march", 0.7),
    (C["M1"], "dark", 0.6), (C["M1m"] + 20, "drone", 0.3), (C["M2m"] - 50, "dark", 0.55), (C["M3f"] - 70, "drone", 0.35), (C["M4h"] - 18, "dark", 0.8),
    (C["M5n"] - 70, "tender", 0.35), (C["M6m"] - 25, "dark", 0.75), (C["M6b"] + 10, "drone", 0.2), (C["M7"], "epic", 0.5), (C["M8"], "hero", 0.8),
    (C["M9e"], "tender", 0.45), (C["M10"], "tender", 0.4), (C["M11"], "drone", 0.3),
    (C["A1b"] - 70, "hero", 0.55), (C["A1b"], "hero", 0.75),
    (C["Z1"], "epic", 0.55), (C["Z2g"] - 25, "dark", 0.85), (C["Z2l"] + 60, "tender", 0.35), (C["Z3"], "hero", 0.6), (C["Z3w"] - 20, "hero", 0.85), (C["END"] - 8, "hero", 1.0),
]


def mood_at(t):
    f = t * FPS
    m, k = SEG[0][1], SEG[0][2]
    for a, mm, kk in SEG:
        if f >= a:
            m, k = mm, kk
    return m, k


def chord_notes(name, octave=3):
    root, q = CHORD[name]
    third = 3 if q == "m" else 4
    base = 12 * (octave + 1) + root
    return [base, base + third, base + 7]


def build_music():
    r = rng(1954)
    mus = np.zeros((2, N + ns(4)))
    nb = int(np.ceil(DUR / BAR))
    for b in range(nb):
        t0 = b * BAR
        mood, k = mood_at(t0 + 0.01)
        if k <= 0.01:
            continue
        ch = PROG[mood][b % 4]
        notes = chord_notes(ch, 3)
        p = I.pad([I.m2f(m) for m in notes + [notes[0] + 12]], BAR, vel=0.28 + 0.25 * k, r=r, att=0.35, rel=0.8, warm=600 + 900 * k)
        place(mus, p, t0)
        if mood in ("drone", "dark", "epic"):  # low cello-ish brass drone
            y = I.brass(I.m2f(notes[0] - 12), BAR * 0.98, vel=0.3 + 0.35 * k, r=r, kind="soft")
            place(mus, st(y) * 0.55, t0)
        if mood == "drone":  # slow heartbeat on the low drum
            for beat in (0, 0.35):
                place(mus, st(I.timpani(I.m2f(notes[0] - 12), vel=0.25 + 0.3 * k, r=r, dur=1.0)) * 0.6, t0 + beat)
            continue
        if k >= 0.3 and mood != "tender":
            pat = [0, 7, 12, 7, 0, 7, 15 if CHORD[ch][1] == "m" else 16, 7]
            for i, iv in enumerate(pat):
                y = I.pluck(I.m2f(notes[0] + 12 + iv), vel=(0.35 + 0.3 * k) * (1.0 if i % 2 == 0 else 0.75), r=r, dur=0.4, bright=0.35 + 0.3 * k)
                place(mus, pan(y, 0.25 if i % 2 else -0.25), t0 + i * BAR / 8)
        if k >= 0.55 or mood == "march":
            for beat in (0, 2):
                place(mus, st(I.timpani(I.m2f(notes[0] - 12), vel=0.45 + 0.4 * k, r=r, dur=1.2)) * 0.8, t0 + beat * BAR / 4)
            for beat in (1, 3):
                place(mus, st(I.snare(vel=0.25 + 0.35 * k, r=r)) * 0.55, t0 + beat * BAR / 4)
            if mood == "march":
                for i in range(8):
                    if i % 2:
                        place(mus, st(I.snare(vel=0.18, r=r, dur=0.2)) * 0.4, t0 + i * BAR / 8)
        if mood in ("tender", "playful"):
            inst = I.musicbox if mood == "tender" else I.glock
            for i, m in enumerate([notes[0] + 24, notes[1] + 24, notes[2] + 24, notes[1] + 24]):
                place(mus, pan(inst(I.m2f(m), vel=0.22 + 0.15 * k, r=r), -0.3 + 0.2 * i), t0 + i * BAR / 4)
        if mood == "hero" and k >= 0.7:
            y = I.brass(I.m2f(notes[0]), BAR * 0.9, vel=0.35 + 0.25 * k, r=r, kind="horn")
            place(mus, pan(y, -0.1), t0)
    # our own horn motif (C - G - Ab - G | Eb - F - C), on the big beats
    MOTIF = [(0, 60, 0.5), (0.5, 67, 0.75), (1.25, 68, 0.25), (1.5, 67, 0.5), (2.0, 63, 0.5), (2.5, 65, 0.5), (3.0, 60, 1.0)]
    for at in [fr(C["H3"] + 30), fr(C["M8"] + 10), fr(C["Z3w"] - 20)]:
        for d, m, Ln in MOTIF:
            place(mus, pan(I.brass(I.m2f(m), Ln * 0.95, vel=0.6, r=r, kind="horn"), -0.15), at + d)
            place(mus, pan(I.brass(I.m2f(m - 12), Ln * 0.95, vel=0.45, r=r, kind="horn"), 0.15), at + d)
        cue(at, "music: horn motif")
    # stingers: the bomb, his birth, Minus One title, Ginza blast, the plane hit, "so is he", the final title
    for f, big in [(C["H2b"], 1.0), (C["H2z"], 1.3), (C["M1m"], 1.1), (C["M6g"], 1.2), (C["M8m"] + 2, 1.0), (C["Z1h"] + 6, 1.1), (C["END"], 1.3)]:
        t = fr(f)
        place(mus, st(I.timpani(I.m2f(36), vel=1.0, r=r, dur=3.0)) * big, t)
        place(mus, st(I.cymbal(vel=0.6, r=r, dur=3.0)) * 0.55 * big, t)
        place(mus, st(I.brass(I.m2f(36), 1.6, vel=0.9, r=r, kind="stab")) * 0.8 * big, t)
        cue(t, "music: stinger")
    seen = set()
    for s in SH:
        if s["ch"] >= 1 and s["ch"] not in seen:
            seen.add(s["ch"])
            place(mus, st(I.cymbal(vel=0.35, r=r, dur=2.0)) * 0.5, fr(s["a"]))
    # final chord: C major swell to the end
    t = fr(C["END"] + 4)
    place(mus, I.pad([I.m2f(m) for m in [48, 52, 55, 60, 64]], DUR - t, vel=0.7, r=r, att=0.3, rel=1.2, warm=2500), t)
    place(mus, st(I.brass(I.m2f(36), DUR - t, vel=0.7, r=r, kind="soft")) * 0.6, t)
    return mus[:, :N]


# ---------------- sfx ----------------
def boom(r, g=1.0, dur=1.6, f0=48):
    n = ns(dur)
    t = np.arange(n) / SR
    low = np.sin(2 * np.pi * (f0 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.35)
    nz = lp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.12) * 0.7
    crack = hp(r.standard_normal(n), 2000) * np.exp(-t / 0.01) * 0.35
    return fades((low + nz + crack) * g, 0.001, 0.2)


def big_blast(r, dur=4.0):
    n = ns(dur)
    t = np.arange(n) / SR
    body = lp(colored(n, r, 1.6), 260, 2) * (1 - np.exp(-t / 0.03)) * np.exp(-t / 1.3) * 4.0
    crack = bp(r.standard_normal(n), 600, 5000, 2) * np.exp(-t / 0.06) * 0.8
    sub = np.sin(2 * np.pi * (34 + 30 * np.exp(-t / 0.2)) * t) * np.exp(-t / 0.9)
    return fades(body + crack + sub, 0.001, 0.6)


def roar(r, dur=2.2, pitch=1.0):
    """our own kaiju roar: a growling low layer under a screeching, formant-swept high layer (no studio sample)"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(np.minimum(t / 0.12, 1) * np.minimum((dur - t) / 0.7, 1), 0, 1)
    f_hi = (330 + 260 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7) * pitch
    vib = 1 + 0.025 * np.sin(2 * np.pi * 6.5 * t) + 0.01 * r.standard_normal(n).cumsum() / np.sqrt(np.arange(1, n + 1))
    ph = 2 * np.pi * np.cumsum(f_hi * vib) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    rough = 1 + 0.6 * lp(r.standard_normal(n), 60, 2)
    screech = bp(saw * rough, 700 * pitch, 3200 * pitch, 2) * 0.9 + bp(saw * rough, 1800 * pitch, 2600 * pitch, 2) * 0.6
    ph2 = 2 * np.pi * np.cumsum(f_hi * 0.25) / SR
    growl = (np.sin(ph2) + 0.5 * np.sin(2 * ph2 + 0.3)) * (0.7 + 0.3 * np.sin(2 * np.pi * 28 * t)) * 0.8
    air = bp(r.standard_normal(n), 400, 4000, 2) * 0.25
    return fades((screech + growl + air) * env, 0.01, 0.3)


def stomp(r, g=1.0):
    return boom(r, g, 1.4, f0=36)


def crackle(dur, r, density=40):
    n = ns(dur)
    out = np.zeros(n)
    for _ in range(int(dur * density)):
        i = r.integers(0, max(1, n - 800))
        L = r.integers(80, 600)
        out[i:i + L] += bp(r.standard_normal(L), 1500, 6000, 2) * np.exp(-np.arange(L) / (L / 4)) * r.uniform(0.2, 1.0)
    return out + lp(colored(n, r, 1.0), 400) * 0.3


def prop_drone(dur, r, f=95):
    n = ns(dur)
    t = np.arange(n) / SR
    ph = 2 * np.pi * f * t
    y = (np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.4) * (0.75 + 0.25 * np.sin(2 * np.pi * 14 * t))
    return fades(lp(y, 1400, 2) + lp(colored(n, r, 1.0), 900) * 0.4, 0.2, 0.3)


def rain_hiss(dur, r):
    n = ns(dur)
    return fades(hp(colored(n, r, 0.4), 1500, 2) * 0.5 + lp(colored(n, r, 1.0), 500) * 0.3, 0.3, 0.3)


def chalk(r, dur=0.35):
    n = ns(dur)
    t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 2500, 7000, 2) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 22 * t)))
    return fades(y * 0.6, 0.01, 0.05)


def projector(dur, r):
    n = ns(dur)
    t = np.arange(n) / SR
    click = np.zeros(n)
    for k in range(int(dur * 24)):
        i = ns(k / 24)
        L = min(240, n - i)
        click[i:i + L] += bp(r.standard_normal(L), 1500, 5000, 2) * np.exp(-np.arange(L) / 40) * 0.5
    hum = np.sin(2 * np.pi * 60 * t) * 0.2 + lp(colored(n, r, 1.0), 300) * 0.3
    return fades(click + hum, 0.2, 0.3)


def build_sfx():
    r = rng(1947)
    sfx = np.zeros((2, N + ns(6)))
    # whooshes on cuts (bigger on chapter changes)
    first = {}
    for s in SH:
        first.setdefault(s["ch"], s["a"])
    chap = set(first.values())
    for s in SH[1:]:
        a = s["a"]
        big = a in chap
        w = G.whoosh(0.7 if big else 0.45, r, peak=0.35 if big else 0.25, f_lo=300, f_hi=2600 if big else 1800, tail=0.2)
        place(sfx, pan(w, 0.0), fr(a) - (0.35 if big else 0.25), gain=0.5 if big else 0.22)
    for f, g in TL["kicks"]:
        place(sfx, st(boom(r, 0.5 + 0.35 * g)), fr(f) - 0.01)
        cue(fr(f), f"impact x{g}")
    for f, n, _ in TL["flashes"]:
        y = hp(r.standard_normal(ns(0.9)), 3000) * np.exp(-np.arange(ns(0.9)) / SR / 0.15) * 0.25
        place(sfx, st(fades(y, 0.002, 0.1)), fr(f))
    for f in TL["lightning"][::2]:
        n = ns(3.0); t = np.arange(n) / SR
        th = bp(r.standard_normal(n), 800, 6000, 2) * np.exp(-t / 0.05) * 0.6 + lp(colored(n, r, 1.2), 220, 2) * (1 - np.exp(-t / 0.15)) * np.exp(-t / 1.1) * 3.0
        place(sfx, st(fades(th, 0.001, 0.4)) * 0.6, fr(f))
        cue(fr(f), "thunder")
    # ambiences per shot place / look
    for s in SH:
        a, b = fr(s["a"]), fr(s["b"])
        d = b - a + 0.4
        if s["place"] == "sea" and s["look"] != "underwater":
            place(sfx, G.water_bed(d, r, close=0.5, slosh_rate=0.5) * 0.35, a)
        if s["look"] in ("stormsea", "stormGold"):
            place(sfx, st(rain_hiss(d, r)) * 0.4, a)
        if s["look"] in ("night54", "islandNight"):
            place(sfx, st(crackle(d, r)) * 0.35, a)
        if s["place"] == "ruins" or s["look"] == "ash":
            place(sfx, G.breeze(d, r, level=0.6) * 0.5, a)
        if s["look"] == "underwater":
            place(sfx, st(G.bubbles(d, r, 6)) * 0.5, a)
            place(sfx, st(lp(colored(ns(d), r, 1.6), 200)) * 0.5, a)
        if s["look"] == "cinema":
            place(sfx, st(projector(d, r)) * 0.3, a)
    cue(0, "ambience beds per place")
    # the bomb, his birth roar, roars on roar beats
    place(sfx, st(big_blast(r)) * 0.55, fr(C["H2b"])); cue(fr(C["H2b"]), "H-bomb blast")
    for f, p, g in [(C["H2z"], 1.0, 1.0), (C["H3"] + 50, 0.95, 0.5), (C["O2m"] - 2, 1.0, 0.7), (C["M1m"] - 2, 0.92, 1.0), (C["M2d"] - 2, 1.0, 0.7), (C["M4h"] - 2, 1.08, 0.7),
                    (C["Z1h"] + 6, 0.95, 0.9)]:
        place(sfx, st(roar(r, 2.2, p)) * 0.45 * g, fr(f)); cue(fr(f), "kaiju roar (synth)")
    # footsteps: Ginza 1954 walk, studio suit stomps, the parade, the dawn walk
    for f0, f1, per, g in [(C["O1"] + 140, C["O2m"] - 4, 34, 0.7), (C["O3s"] + 6, C["Y1"], 24, 0.35), (C["Y2r"] - 120, C["M1"], 30, 0.35), (C["END"] - 40, TOTAL, 40, 0.4)]:
        for f in range(int(f0), int(f1), per):
            place(sfx, st(stomp(r, g)), fr(f))
    cue(fr(C["O3s"]), "stomps")
    # studio: film camera rattle under the suit shots
    place(sfx, st(G.rattle(fr(C["Y1"] - C["O3"]), r, density=24)) * 0.12, fr(C["O3"]))
    # kids cheer, rival punch
    for i in range(5):
        place(sfx, pan(G.hurrah(r, r.uniform(240, 320), 1.3, kid=True), -0.4 + 0.2 * i) * 0.35, fr(C["Y1w"]) + 0.12 * i)
    cue(fr(C["Y1w"]), "kids cheer")
    # the Zero's fake engine cough
    for i in range(3):
        place(sfx, st(boom(r, 0.25, 0.4, f0=70)), fr(C["M3f"]) + 0.18 * i)
    # Ginza: tram bell, heat ray, the blast
    for i in range(2):
        place(sfx, pan(I.glock(I.m2f(84), vel=0.5, r=r, dur=0.8), 0.3), fr(C["M6m"] - 60) + 0.25 * i)
    n = ns(fr(C["M6g"] - C["M6c"]) + 0.3); t = np.arange(n) / SR
    ray = bp(colored(n, r, 0.3), 1200, 6000, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t)) + np.sin(2 * np.pi * (300 + 600 * t) * t) * 0.2
    place(sfx, st(fades(ray, 0.03, 0.1)) * 0.5, fr(C["M6c"])); cue(fr(C["M6c"]), "heat ray")
    place(sfx, st(big_blast(r, 5)) * 0.6, fr(C["M6g"])); cue(fr(C["M6g"]), "Ginza blast")
    place(sfx, G.breeze(1.6, r, level=1.4, gust=0.6, bright=2000) * 0.45, fr(C["M6b"] - 4)); cue(fr(C["M6b"]), "blast wind")
    # planning: chalk strokes
    for f in [C["M7"] + 10, C["M7t"] + 4, C["M7t"] + 16, C["M7t"] + 30, C["M7k"] - 2]:
        place(sfx, st(chalk(r)) * 0.5, fr(f))
    # ring of gas: bubbles
    place(sfx, st(G.bubbles(fr(C["M7t"] - C["M7s"]) + 0.5, r, 30)) * 0.6, fr(C["M7s"])); cue(fr(C["M7s"]), "gas bubbles")
    # the plane: propeller drone, then the hit
    place(sfx, st(prop_drone(fr(C["M8m"] - C["M8"]) + 0.2, r)) * 0.3, fr(C["M8"])); cue(fr(C["M8"]), "propeller")
    place(sfx, st(big_blast(r, 3.5)) * 0.55, fr(C["M8m"] + 2))
    # parachute pop + wind
    n = ns(0.5); t = np.arange(n) / SR
    place(sfx, st(fades(lp(r.standard_normal(n), 1200) * np.exp(-t / 0.08), 0.001, 0.1)) * 0.6, fr(C["M9e"] + 2))
    place(sfx, G.breeze(fr(C["M10"] - C["M9e"]), r, level=0.8) * 0.25, fr(C["M9e"]))
    # Oscar applause
    place(sfx, G.applause(fr(C["Z1"] - C["A1b"]) + 1.0, r, people=40) * 0.35, fr(C["A1b"])); cue(fr(C["A1b"]), "applause")
    # final tail: a last distant roar under the title
    place(sfx, st(roar(r, 2.6, 0.85)) * 0.35, fr(C["END"] + 10))
    return sfx[:, :N]


# ---------------- mix ----------------
def limiter(x, ceil_db=-1.2, look=0.005, rel=0.08):
    from scipy.ndimage import maximum_filter1d
    c = 10 ** (ceil_db / 20)
    a = np.max(np.abs(x), axis=0)
    m = maximum_filter1d(a, size=2 * ns(look) + 1)
    g = np.minimum(1.0, c / np.maximum(m, 1e-9))
    gr = maximum_filter1d(1.0 - g, size=ns(rel))
    kk = np.exp(-1 / (0.4 * rel * SR))
    gr = signal.lfilter([1 - kk], [1, -kk], gr)
    return x * np.minimum(g, 1.0 - gr)[None, :]


def main():
    import soundfile as sf
    v, vsr = sf.read(os.path.join(ROOT, "voice/voice.wav"))
    v = signal.resample_poly(v, 2, 1) if vsr == 24000 else v
    voice = np.zeros((2, N))
    m = min(N, len(v))
    voice[:, :m] = v[:m][None, :]
    print("music...", flush=True)
    mus = build_music()
    print("sfx...", flush=True)
    sfx = build_sfx()
    key = np.zeros(N)
    for w in WORDS:
        key[ns(max(0, w["s"] - 0.08)):ns(w["e"] + 0.15)] = 1
    smk = signal.lfilter([1 - np.exp(-1 / (0.12 * SR))], [1, -np.exp(-1 / (0.12 * SR))], key)
    duck = 10 ** (-6.0 * np.clip(smk, 0, 1) / 20)
    sduck = 10 ** (-8.0 * np.clip(smk, 0, 1) / 20)
    lv, lm, ls = integrated(voice), integrated(mus), integrated(sfx)
    # standard mix of the skill: music bed + 3 dB over the old -9.5 LU, sfx - 6 dB from the old -2 LU
    mus *= 10 ** ((lv - 6.5 - lm) / 20)
    sfx *= 10 ** ((lv - 8.0 - ls) / 20)
    mus *= duck[None, :]
    sfx *= sduck[None, :]
    ir = make_ir(1.1, 5)
    mus = 0.8 * mus + 0.2 * convolve_st(mus, ir)[:, :N]
    mix = voice + mus + sfx
    mix *= 10 ** ((-14.0 - integrated(mix)) / 20)
    mix = limiter(mix, -2.2)
    for name, x in [("music", mus), ("sfx", sfx), ("voice", voice), ("mix", mix)]:
        sf.write(os.path.join(OUT, f"{name}.wav"), x.T.astype(np.float32), SR, subtype="PCM_24")
    rep = f"integrated {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP, length {mix.shape[1] / SR:.3f} s"
    print(rep)
    with open(os.path.join(OUT, "cues.md"), "w") as fh:
        fh.write("# Sound cues\n\n" + rep + "\n\n")
        for t, w in sorted(cues):
            fh.write(f"- {t:7.2f} s  {w}\n")


if __name__ == "__main__":
    main()
