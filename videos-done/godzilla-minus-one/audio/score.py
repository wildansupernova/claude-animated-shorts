# Sound for "The Road to Doomsday": an original synthesized score (our own chords and motif, no film themes),
# picture-locked SFX read from story.ts (kicks, flashes, lightning, cuts) and the final mix under the narration.
# Run with the tts venv (numpy, scipy, soundfile):  python audio/score.py
# Writes audio/out/{music,sfx,voice,mix}.wav (48 kHz stereo) and audio/out/cues.md.
import json
import os
import re
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from dsp import SR, ns, rng, lp, hp, bp, colored, fades, place, st, integrated, true_peak, write_wav, read_wav, pan, make_ir, convolve_st  # noqa: E402
import instruments as I  # noqa: E402
import sfx_gen as G  # noqa: E402

FPS = 30
STORY = open(os.path.join(ROOT, "src/videos/doomsday/story.ts")).read()
TOTAL = int(re.search(r"export const TOTAL = (\d+);", STORY).group(1))
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# ---------------- picture timeline (parsed from story.ts) ----------------
SHOTS = [(int(c), int(a)) for c, a in re.findall(r"^shot\((\d+), (\d+), ", STORY, re.M)]
CH_START = {}
for c, a in SHOTS:
    CH_START.setdefault(c, a)
KICKS = [(int(f), float(g)) for f, g in re.findall(r"\[(\d+), ([\d.]+)\]", re.search(r"const KICKS[^=]*= \[(.*?)\];", STORY, re.S).group(1))]
FLASHES = [int(f) for f, *_ in re.findall(r"\[(\d+), (\d+), \"#", re.search(r"export const FLASHES[^=]*= \[(.*?)\];", STORY, re.S).group(1))]
LIGHTNING = [int(x) for x in re.search(r"export const LIGHTNING = \[(.*?)\];", STORY).group(1).split(",")]
WORDS = json.load(open(os.path.join(ROOT, "voice/words.json")))
cues = []


def cue(t, what):
    cues.append((t, what))


# ---------------- music ----------------
BAR = 2.0  # 120 bpm, 4/4
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
CHORD = {  # root, quality
    "Dm": (2, "m"), "Bb": (10, ""), "F": (5, ""), "C": (0, ""), "Gm": (7, "m"), "A": (9, ""), "D": (2, ""), "G": (7, ""), "Bm": (11, "m"), "Em": (4, "m"),
    "Eb": (3, ""), "Cm": (0, "m"), "Ab": (8, ""),
}
PROG = {
    "epic": ["Dm", "Bb", "F", "C"], "dark": ["Dm", "Gm", "Bb", "A"], "hero": ["D", "G", "Bm", "A"], "mystic": ["Dm", "Eb", "Dm", "C"],
    "playful": ["F", "C", "Dm", "Bb"], "retro": ["C", "Am", "F", "G"], "tender": ["F", "Dm", "Bb", "C"],
}
CHORD["Am"] = (9, "m")

# per chapter: (mood, intensity 0..1). Chapters: 0 hook, 1 X-Men, 2 Iron Man->Avengers, 3 IW, 4 Endgame, 5 Loki, 6 NWH,
# 7 MoM, 8 WF, 9 Quantumania, 10 Marvels, 11 D&W, 12 BNW, 13 Thunderbolts, 14 FF, 15 BND, 16 Doomsday
CH_MOOD = {0: ("dark", 0.45), 1: ("epic", 0.4), 2: ("epic", 0.6), 3: ("dark", 0.7), 4: ("hero", 0.65), 5: ("mystic", 0.45), 6: ("epic", 0.55),
           7: ("dark", 0.6), 8: ("epic", 0.5), 9: ("mystic", 0.55), 10: ("epic", 0.5), 11: ("playful", 0.6), 12: ("hero", 0.6),
           13: ("epic", 0.65), 14: ("retro", 0.5), 15: ("epic", 0.65), 16: ("dark", 0.85)}
# local overrides (start s, end s, mood, intensity)
OVERRIDE = [(fr(0), fr(66), "dark", 0.25), (fr(1203), fr(1236), None, 0.0), (fr(1236), fr(1310), "dark", 0.3),
            (fr(1496), fr(1535), "tender", 0.25), (fr(1535), fr(1661), "tender", 0.35), (fr(2471), fr(2596), "tender", 0.35),
            (fr(4721), fr(4870), "dark", 0.35), (fr(5563), fr(5636), "dark", 0.5), (fr(5636), fr(5710), "hero", 0.7),
            (fr(5710), DUR, "hero", 1.0)]


def chapter_at(t):
    c = 0
    for ch, a in sorted(CH_START.items(), key=lambda x: x[1]):
        if t * FPS >= a:
            c = ch
    return c


def mood_at(t):
    m, k = CH_MOOD[chapter_at(t)]
    for a, b, mm, kk in OVERRIDE:
        if a <= t < b:
            m, k = (mm or m), kk
    return m, k


def chord_notes(name, octave=3):
    root, q = CHORD[name]
    third = 3 if q == "m" else 4
    base = 12 * (octave + 1) + root
    return [base, base + third, base + 7]


def build_music():
    r = rng(2026)
    mus = np.zeros((2, N + ns(4)))
    nb = int(np.ceil(DUR / BAR))
    for b in range(nb):
        t0 = b * BAR
        mood, k = mood_at(t0 + 0.01)
        if k <= 0.01:
            continue
        prog = PROG[mood]
        ch = prog[b % 4]
        notes = chord_notes(ch, 3)
        # strings pad (whole bar, overlapping release)
        p = I.pad([I.m2f(m) for m in notes + [notes[0] + 12]], BAR, vel=0.30 + 0.25 * k, r=r, att=0.35, rel=0.8, warm=700 + 900 * k)
        place(mus, p, t0)
        # low root: soft brass/tuba from intensity 0.45
        if k >= 0.45:
            y = I.brass(I.m2f(notes[0] - 12), BAR * 0.95, vel=0.35 + 0.3 * k, r=r, kind="soft")
            place(mus, st(y) * 0.5, t0)
        # 8th-note ostinato pluck from intensity 0.3 (root-fifth-octave pattern)
        if k >= 0.3:
            pat = [0, 7, 12, 7, 0, 7, 15 if CHORD[ch][1] == "m" else 16, 7]
            for i, iv in enumerate(pat):
                ti = t0 + i * BAR / 8
                y = I.pluck(I.m2f(notes[0] + 12 + iv), vel=(0.35 + 0.3 * k) * (1.0 if i % 2 == 0 else 0.75), r=r, dur=0.4, bright=0.35 + 0.3 * k)
                place(mus, pan(y, 0.25 if i % 2 else -0.25), ti)
        # drums from intensity 0.55: timpani on 1 and 3, snare on 2 and 4, plus 8th hats-ish brush at high intensity
        if k >= 0.55:
            for beat in (0, 2):
                place(mus, st(I.timpani(I.m2f(notes[0] - 12), vel=0.45 + 0.4 * k, r=r, dur=1.2)) * 0.8, t0 + beat * BAR / 4)
            for beat in (1, 3):
                place(mus, st(I.snare(vel=0.25 + 0.35 * k, r=r)) * 0.55, t0 + beat * BAR / 4)
            if k >= 0.8:
                for i in range(8):
                    place(mus, pan(I.brush(vel=0.25, r=r), 0.3), t0 + i * BAR / 8)
        # mystic / retro colour: glock or vibes arpeggio
        if mood in ("mystic", "retro", "tender"):
            inst = I.glock if mood == "mystic" else I.vibes if mood == "retro" else I.musicbox
            for i, m in enumerate([notes[0] + 24, notes[1] + 24, notes[2] + 24, notes[1] + 24]):
                place(mus, pan(inst(I.m2f(m), vel=0.25 + 0.15 * k, r=r), -0.3 + 0.2 * i), t0 + i * BAR / 4)
    # original brass motif (horns): D-A-G-F | E-F-D (our own), placed on hero moments
    MOTIF = [(0, 62, 0.5), (0.5, 69, 0.75), (1.25, 67, 0.25), (1.5, 65, 0.5), (2.0, 64, 0.5), (2.5, 65, 0.5), (3.0, 62, 1.0)]
    for at, tr in [(fr(942), 0), (fr(1410), 0), (fr(3676), 0), (fr(5265), 0), (fr(5711), 0)]:
        for d, m, L in MOTIF:
            y = I.brass(I.m2f(m + tr), L * 0.95, vel=0.6, r=r, kind="horn")
            place(mus, pan(y, -0.15), at + d)
            y2 = I.brass(I.m2f(m + tr - 12), L * 0.95, vel=0.45, r=r, kind="horn")
            place(mus, pan(y2, 0.15), at + d)
        cue(at, "music: horn motif")
    # stingers: hook "villain", chapter hits, the final title
    for t, big in [(fr(76), 1.2), (fr(5726), 1.4)]:
        place(mus, st(I.timpani(I.m2f(38), vel=1.0, r=r, dur=3.0)) * big, t)
        place(mus, st(I.cymbal(vel=0.6, r=r, dur=3.0)) * 0.6 * big, t)
        place(mus, st(I.brass(I.m2f(38), 1.6, vel=0.9, r=r, kind="stab")) * 0.8 * big, t)
        cue(t, "music: stinger hit")
    for c, a in CH_START.items():
        if c >= 1:
            place(mus, st(I.cymbal(vel=0.35, r=r, dur=2.0)) * 0.5, fr(a))
    # final chord: D major swell to the end
    t = fr(5745)
    place(mus, I.pad([I.m2f(m) for m in [50, 54, 57, 62, 66]], DUR - t, vel=0.7, r=r, att=0.3, rel=1.2, warm=2500), t)
    place(mus, st(I.brass(I.m2f(38), DUR - t, vel=0.7, r=r, kind="soft")) * 0.6, t)
    return mus[:, :N]


# ---------------- sfx ----------------
def boom(r, g=1.0, dur=1.6):
    n = ns(dur)
    t = np.arange(n) / SR
    low = np.sin(2 * np.pi * (48 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.35)
    nz = lp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.12) * 0.7
    crack = hp(r.standard_normal(n), 2000) * np.exp(-t / 0.01) * 0.35
    return fades((low + nz + crack) * g, 0.001, 0.2)


def thunder(r, dur=3.0):
    n = ns(dur)
    t = np.arange(n) / SR
    crack = bp(r.standard_normal(n), 800, 6000, 2) * np.exp(-t / 0.05)
    rumble = lp(colored(n, r, 1.2), 220, 2) * (1 - np.exp(-t / 0.15)) * np.exp(-t / 1.1) * 3.0
    return fades(crack * 0.6 + rumble, 0.001, 0.4)


def snapf(r):
    n = ns(0.12)
    t = np.arange(n) / SR
    return fades(bp(r.standard_normal(n), 1800, 5200, 2) * np.exp(-t / 0.008) * 1.4, 0.0005, 0.03)


def shimmer(r, dur, base=72):
    out = np.zeros((2, ns(dur + 2)))
    for i in range(int(dur * 8)):
        m = base + [0, 4, 7, 12, 16, 19][i % 6]
        place(out, pan(I.glock(I.m2f(m), vel=0.3, r=r, dur=1.2), np.sin(i)), i / 8)
    return out


def hum(r, dur, f=55):
    n = ns(dur)
    t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.01 * t)) * 0.5 + lp(colored(n, r, 1.0), 300) * 0.6
    env = np.minimum(1, np.minimum(t / 0.4, (dur - t) / 0.6))
    return fades(y * np.clip(env, 0, 1), 0.01, 0.1)


def build_sfx():
    r = rng(818)
    sfx = np.zeros((2, N + ns(5)))
    # whooshes on cuts (bigger on chapter changes)
    starts = sorted(set(a for _, a in SHOTS))
    chap = set(CH_START.values())
    for a in starts[1:]:
        big = a in chap
        w = G.whoosh(0.7 if big else 0.45, r, peak=0.35 if big else 0.25, f_lo=300, f_hi=2600 if big else 1800, tail=0.2)
        place(sfx, pan(w, 0.0), fr(a) - (0.35 if big else 0.25), gain=0.55 if big else 0.25)
        cue(fr(a), "whoosh" + (" (chapter)" if big else ""))
    for f, g in KICKS:
        place(sfx, st(boom(r, 0.55 + 0.35 * g)), fr(f) - 0.01)
        cue(fr(f), f"impact x{g}")
    for f in FLASHES:
        y = hp(r.standard_normal(ns(0.9)), 3000) * np.exp(-np.arange(ns(0.9)) / SR / 0.15) * 0.25
        place(sfx, st(fades(y, 0.002, 0.1)), fr(f))
        cue(fr(f), "flash shing")
    for f in LIGHTNING[::2]:
        place(sfx, st(thunder(r)) * 0.6, fr(f))
        cue(fr(f), "thunder")
    for f in (1203, 1469):
        place(sfx, st(snapf(r)), fr(f) - 0.03)
        cue(fr(f), "finger snap")
    for a, b, base in [(1150, 1200, 76), (2056, 2140, 69), (2232, 2296, 74), (4064, 4100, 79), (4810, 4830, 62)]:
        place(sfx, shimmer(r, fr(b - a), base) * 0.6, fr(a))
        cue(fr(a), "shimmer")
    for a, b, f0 in [(1058, 1130, 50), (2945, 3034, 62), (4326, 4450, 45), (5093, 5186, 40)]:
        place(sfx, st(hum(r, fr(b - a), f0)) * 0.35, fr(a))
        cue(fr(a), "portal hum")
    place(sfx, st(G.splash_big(r)) * 0.6, fr(2852)); cue(fr(2852), "splash (Namor)")
    for f in (840, 2343, 3376):
        y = bp(r.standard_normal(ns(0.5)), 1500, 7000, 2) * np.exp(-np.arange(ns(0.5)) / SR / 0.09) * 0.5
        place(sfx, st(fades(y, 0.001, 0.05)), fr(f)); cue(fr(f), "crack")
    return sfx[:, :N]


# ---------------- mix ----------------
def resample24to48(v):
    return signal.resample_poly(v, 2, 1)


def limiter(x, ceil_db=-1.2, look=0.005, rel=0.08):
    c = 10 ** (ceil_db / 20)
    a = np.max(np.abs(x), axis=0)
    L = ns(look)
    # sliding max over the look-ahead window, then smoothed gain
    from scipy.ndimage import maximum_filter1d
    m = maximum_filter1d(a, size=2 * L + 1)
    g = np.minimum(1.0, c / np.maximum(m, 1e-9))
    gr = maximum_filter1d(1.0 - g, size=ns(rel))           # hold the reduction for the release window
    kk = np.exp(-1 / (0.4 * rel * SR))
    gr = signal.lfilter([1 - kk], [1, -kk], gr)               # smooth release
    out = np.minimum(g, 1.0 - gr)                              # never less reduction than needed
    return x * out[None, :]


def main():
    vpath = os.path.join(ROOT, "voice/voice.wav")
    import soundfile as sf
    v, vsr = sf.read(vpath)
    v = resample24to48(v) if vsr == 24000 else v
    voice = np.zeros((2, N))
    m = min(N, len(v))
    voice[:, :m] = v[:m][None, :]
    print("music...", flush=True)
    mus = build_music()
    print("sfx...", flush=True)
    sfx = build_sfx()
    # ducking key from the word timings (music -4 dB under speech, 120 ms attack / 300 ms release)
    key = np.zeros(N)
    for w in WORDS:
        key[ns(max(0, w["s"] - 0.08)):ns(w["e"] + 0.15)] = 1
    sm = signal.lfilter([1 - np.exp(-1 / (0.12 * SR))], [1, -np.exp(-1 / (0.12 * SR))], key)
    duck = 10 ** (-4.5 * np.clip(sm, 0, 1) / 20)
    # levels: voice reference; music bed ~ -11 LU under the voice; sfx ~ -8 LU under (peaks above)
    lv = integrated(voice)
    lm = integrated(mus)
    ls = integrated(sfx)
    mus *= 10 ** ((lv - 6.5 - lm) / 20)
    sfx *= 10 ** ((lv - 5.0 - ls) / 20)
    mus *= duck[None, :]
    # a little room on music + sfx
    ir = make_ir(1.1, 5)
    mus = 0.8 * mus + 0.2 * convolve_st(mus, ir)[:, :N]
    mix = voice + mus + sfx
    li = integrated(mix)
    mix *= 10 ** ((-14.0 - li) / 20)
    mix = limiter(mix, -1.6)
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
