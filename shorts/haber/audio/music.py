# Original score for "Bread and Bombs from Thin Air" (Fritz Haber), composed and synthesized here (instruments.py).
# One piece built on one motif - the hook's bell figure D-A-G-F-E | D-A-Bb-A-C# (D minor). It returns as a major
# clarinet tune in the invention music, as low horns in the war, and as the bittersweet ending.
#   0-4.8      hook, 100 bpm: low hit on frame 0, synth pulse (3+3+2), bell motif, ticking, low strings, riser to the flash
#   4.87-24.67 invention, 150 bpm (bar 12 = 24.67 'Fertilizer'): pizzicato + clarinet, woodblock/shaker, lab build-up
#   24.67-27.87 brighter: strings/clarinet tune, small triumphant brass lift on 25.47, warm turn to A7
#   27.87-42.5 war, D minor, 150 bpm: military snare + returning pulse, low horns motif, hits on the guns (35.13 / 35.50),
#              Ypres hush, gas 38.67-42.5: low brass cluster swell, falling string cluster, panic tremolo + stabs
#   42.5-46.23 somber: low piano + soft strings, near silence 45.2-46.2
#   46.23-49.93 hesitant morning clarinet; 49.93-52.33 sneaky pizzicato (grid 49.93 + k*0.4: 50.33, 51.13, 52.33, 53.13)
#   52.33-54.4 snare roll into an ironic little fanfare on 53.13 that droops at the end
#   54.4-62.7  dark drones, no beats (D + Eb dissonance, cold high strings, one far bell)
#   62.7-68.37 bittersweet return of the hook motif (bell + piano + warm strings + soft pulse), final low hit on 67.3
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp, st, curve
import instruments as I
import timeline as T

N = ns(T.DUR)
F = I.m2f
HB = 0.6                                   # hook + ending beat (100 bpm)
B = 0.4                                    # invention + war beat (150 bpm)


def D(m, beat=0.0):
    """bar m downbeat of the 150 bpm grid (bar 12 = 24.67, the word 'Fertilizer')"""
    return 5.47 + 1.6 * m + beat * B


S0, SB = 49.93, 0.4                        # sneaky grid: 50.33 poof, 51.13 tiptoe, 52.33 steps, 53.13 fanfare

SECTIONS = [("hook", 0.0, 4.87), ("invent", 4.87, 24.67), ("bright", 24.67, 27.87), ("war", 27.87, 38.67),
            ("gas", 38.67, 42.5), ("somber", 42.5, 46.23), ("morning", 46.23, 49.93), ("sneaky", 49.93, 52.33),
            ("fanfare", 52.33, 54.4), ("dark", 54.4, 62.7), ("return", 62.7, T.DUR)]
HARD = [4.84, 42.5, 54.4]                  # section switches where the music is cut / silent (level may jump there)

# hook motif (beat, beats, midi) at 100 bpm
MOTIF = [(0, 1, 74), (1, 1, 81), (2, .5, 79), (2.5, .5, 77), (3, 1, 76),
         (4, 1, 74), (5, 1, 81), (6, .5, 82), (6.5, .5, 81), (7, 1, 73)]

CH = {  # pizzicato accompaniment: bass (beat 1, beat 3) + chord (beats 2, 4)
    "F": dict(b=(41, 48), c=[57, 60, 65]), "Bb": dict(b=(46, 41), c=[58, 62, 65]), "C": dict(b=(48, 43), c=[55, 60, 64]),
    "C7": dict(b=(48, 43), c=[58, 60, 64]), "Dm": dict(b=(50, 45), c=[57, 62, 65]), "Gm": dict(b=(43, 50), c=[58, 62, 67]),
    "Bbm": dict(b=(46, 41), c=[58, 61, 65]), "A7": dict(b=(45, 52), c=[55, 61, 64]), "Gm7": dict(b=(43, 50), c=[58, 62, 65]),
}


class Band:
    def __init__(self):
        self.tr = {}
        self.send = {}
        self.cues = []

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0):
        buf = self.track(name, 0.15)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(1915)


def _r():
    return rng(int(R.integers(1 << 30)))


def bars(m, notes):
    """bar-relative notes (beat, beats, midi) -> absolute (t, dur, midi) on the 150 bpm grid"""
    return [(D(m, bt), d * B, mm) for (bt, d, mm) in notes]


def clar(b, notes, vel, p=-0.12, stacc=0.6, vib=0.0, bend=None):
    for (t, d, m) in notes:
        dd = d * stacc if d <= B * 0.55 else d * 0.92
        b.add("clarinet", I.clarinet(F(m), dd, vel * R.uniform(0.92, 1.05), _r(), att=0.018 if dd < 0.16 else 0.035, vib=vib), t, p)


def oompah(b, m, chords, vel=0.55, cvel=0.38, beats=(0, 1, 2, 3)):
    for beat in beats:
        c = CH[chords[beat // 2] if len(chords) == 2 else chords[beat]]
        t = D(m, beat)
        if beat % 2 == 0:
            b.add("pizz", I.pizz(F(c["b"][0 if beat == 0 else 1]), vel * R.uniform(0.95, 1.05), _r(), 0.8), t, -0.15)
        else:
            for k, mm in enumerate(c["c"]):
                b.add("pizz", I.pizz(F(mm), cvel * R.uniform(0.9, 1.05), _r(), 0.45), t + 0.006 * k, 0.15 + 0.12 * k)


SN = {"light": [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 1],
      "march": [3, 0, 1, 1, 2, 0, 1, 0, 3, 0, 1, 1, 2, 0, 1, 0],
      "drive": [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1]}


def snare_bar(b, t_bar, pat, vel, steps=range(16), cres=0.0, step=B / 4):
    for s in steps:
        v = SN[pat][s]
        if not v:
            continue
        t = t_bar + s * step
        vv = vel * (1 + cres * s / 16) * {1: 0.5, 2: 0.9, 3: 0.95}[v] * R.uniform(0.93, 1.05)
        if v == 3:
            b.add("snare", I.snare(vv * 0.4, _r()), t - 0.024, 0.05)
        b.add("snare", I.snare(vv, _r()), t + R.normal(0, 0.002), 0.05)


def roll(b, t0, t1, v0, v1, accent=None, track="snare", rate=28.0):
    for t, v in I.snare_roll(t0, t1, v0, v1, _r(), rate):
        b.add(track, I.snare(v, _r(), dur=0.14, buzz=True), t, 0.05)
    if accent:
        b.add(track, I.snare(accent, _r()), t1, 0.05)


def timp_roll(b, t0, t1, m, v0, v1, rate=14.0):
    t, i = t0, 0
    while t < t1:
        u = (t - t0) / max(t1 - t0, 1e-6)
        b.add("timpani", I.timpani(F(m), (v0 + (v1 - v0) * u ** 1.3) * (0.9 + 0.2 * (i % 2)), _r(), dur=0.9), t, -0.1)
        t += 1 / rate
        i += 1


def pulse(b, t0, t1, step, roots, vel=0.6, accents=(0, 3, 6), cut0=350, cut1=900, period=8, track="pulse"):
    """synth pulse: roots = [(time, midi)] (latest root before each step is used), 3+3+2 accents"""
    k = 0
    t = t0
    while t < t1 - 1e-6:
        m = [r_[1] for r_ in roots if r_[0] <= t + 1e-6][-1]
        acc = (k % period) in accents
        u = (t - t0) / max(t1 - t0, 1e-6)
        x = I.synth_bass(F(m), step * 0.72, vel * (1.0 if acc else 0.62), _r(), cutoff=cut0 + (cut1 - cut0) * u)
        b.add(track, x, t, 0.0)
        k += 1
        t = t0 + k * step


def chord_strings(b, t, dur, ms, vel, **kw):
    b.add("strings", I.strings([F(m) for m in ms], dur, vel, _r(), **kw), t)


def brass_chord(b, t, dur, ms, vel, kind="horn", track="lowbrass", env=None, fall=0.0, scoop=-15):
    for k, m in enumerate(ms):
        x = I.brass(F(m), dur, vel, _r(), kind, scoop=scoop, fall=fall)
        if env is not None:
            x = x * env(np.arange(len(x)) / SR)
        b.add(track, x, t + 0.004 * k, (m - 55) / 40)


def build():
    b = Band()
    for name, send in [("bell", 0.32), ("glock", 0.25), ("clarinet", 0.18), ("pizz", 0.16), ("strings", 0.26), ("lowbrass", 0.2),
                       ("brass", 0.18), ("snare", 0.12), ("bassdrum", 0.15), ("timpani", 0.2), ("cymbal", 0.2), ("perc", 0.12),
                       ("pulse", 0.05), ("hit", 0.14), ("piano", 0.26), ("drone", 0.22), ("tick", 0.08)]:
        b.track(name, send)

    # ============================================================== HOOK 0 - 4.8 (100 bpm, D minor)
    b.add("hit", I.cine_hit(1.0, _r(), F(26), 3.5), 0.0)
    fp = lambda t: np.interp(t, [0, 0.12, 0.6, 5], [1.0, 0.75, 0.32, 0.32])
    brass_chord(b, 0.0, 1.6, [38, 45, 50], 0.85, "tuba", env=fp, scoop=-25)
    brass_chord(b, 0.0, 1.4, [57, 62], 0.55, "horn", env=fp, scoop=-20)
    b.add("timpani", I.timpani(F(38), 0.9, _r(), dur=2.5), 0.0, -0.1)
    b.add("cymbal", I.cymbal(0.3, _r(), dur=2.0, bright=0.7), 0.0, 0.0)
    for (bt, d, m) in MOTIF:      # Bb bell with a major tierce (D), so it rubs but does not sour the D pedal
        b.add("bell", I.bell(F(m), 0.78 if bt == 0 else 0.62, _r(), dur=3.6, minor=m != 82), bt * HB, (m - 77) / 20)
        b.add("glock", I.glock(F(m + 12), 0.3, _r(), dur=1.0), bt * HB, -0.3)
    pulse(b, 0.0, 4.8, HB / 2, [(0.0, 38)], 0.75, cut0=300, cut1=1100)
    for k in range(16):
        b.add("tick", I.woodblock(2300 if k % 2 == 0 else 1900, 0.45 if k % 4 == 0 else 0.28, _r(), 0.1), k * HB / 2, 0.35 if k % 2 else -0.35)
    chord_strings(b, 0.0, 4.75, [38, 45, 50, 53], 0.38, att=1.2, rel=0.05, bright=1600, vib=5,
                  swell=lambda t: np.interp(t, [0, 1.0, 4.75], [0.5, 0.7, 1.15]))
    chord_strings(b, 2.4, 2.35, [81, 86], 0.16, att=1.0, rel=0.05, bright=6000, vib=0, trem=0.7, trem_rate=14)
    b.add("cymbal", I.rev_cymbal(1.2, 0.32, _r()), 4.8 - 1.2, 0.0)
    timp_roll(b, 3.9, 4.78, 38, 0.15, 0.45)
    b.cues.append((0.0, "HOOK: low hit + low brass fp + timpani + dark cymbal on frame 0; bell motif D-A-G-F-E | D-A-Bb-A-C# (100 bpm), 3+3+2 synth pulse, tick, low strings"))
    b.cues.append((2.4, "high string tremolo A5/D6 enters (tension)"))
    b.cues.append((3.6, "reverse-cymbal swell + timpani roll into the white flash; music cut at 4.80 (the SFX flash impact owns 4.80-4.93)"))
    cut = np.ones(N)
    a, z = ns(4.79), ns(4.805)
    cut[a:z] = np.linspace(1, 0, z - a)
    cut[z:] = 0
    for k in b.tr:
        b.tr[k] *= cut[None, :]

    # ============================================================== INVENTION 4.87 - 24.67 (150 bpm, F major)
    clar(b, [(D(-1, 2.5), .5 * B, 60), (D(-1, 3), .5 * B, 62), (D(-1, 3.5), .5 * B, 64)], 0.55)
    b.cues.append((4.87, "invention: clarinet pickup C-D-E into the playful F major tune (pizzicato oom-pah, woodblock)"))
    MEL = {
        0: [(0, .5, 65), (.5, .5, 72), (1, .5, 70), (1.5, .5, 69), (3.5, .5, 64)],
        1: [(0, .5, 65), (.5, .5, 70), (1, .5, 69), (1.5, .5, 67), (2, 1, 72), (3, .5, 70), (3.5, .5, 67)],
        2: [(0, 1, 69), (1, .5, 72), (1.5, .5, 77), (2, .5, 76), (2.5, .5, 74), (3, 1, 69)],
        3: [(0, .25, 72), (.25, .25, 72), (.5, .5, 72), (1, .5, 77), (1.5, .5, 72), (2, .5, 70)],
        4: [(0, .5, 69), (.5, .5, 70), (1, .5, 71), (1.5, .5, 72), (2, 1, 74)],
        5: [(2, 1.5, 77), (3.5, .5, 76)],
        6: [(0, .5, 74), (.5, .5, 73), (1, .5, 72), (1.5, .5, 71), (2, .5, 70)],
        7: [(0, .5, 53), (.5, .5, 60), (1, .5, 58), (1.5, .5, 57), (2, 1, 55), (3, .5, 56), (3.5, .5, 57)],
        8: [(0, .5, 65), (.5, .5, 69), (1, .5, 72), (1.5, .5, 77), (2, .5, 76), (2.5, .5, 72), (3, 1, 69)],
        9: [(0, .5, 67), (.5, .5, 70), (1, .5, 74), (1.5, .5, 79), (2, .5, 76), (2.5, .5, 72), (3, 1, 70)],
        10: [(0, .5, 69), (.5, .5, 74), (1, .5, 77), (1.5, .5, 81), (2, 1, 79), (3, 1, 77)],
        11: [(0, .5, 76), (1, .5, 72), (2, .25, 67), (2.25, .25, 69), (2.5, .25, 70), (2.75, .25, 72), (3, .25, 74), (3.25, .25, 76),
             (3.5, .25, 77), (3.75, .25, 79)],
    }
    HARM = {0: ["F", "F"], 1: ["Bb", "C"], 2: ["F", "Dm"], 3: ["C7", "C7"], 4: ["Dm", "Bb"], 5: ["F", "C"], 6: ["Bb", "Bbm"],
            7: ["F", "C"], 8: ["F", "C"], 9: ["Gm", "C7"], 10: ["Dm", "Bb"], 11: ["C", "C7"]}
    PIZZ_BEATS = {0: (0, 1, 3), 3: (0, 1), 6: (0, 1, 2)}
    for m in range(12):
        vel = 0.55 + (0.12 if m >= 8 else 0.0)
        clar(b, bars(m, MEL[m]), vel)
        oompah(b, m, HARM[m], 0.55 + 0.06 * (m >= 8), 0.36 + 0.05 * (m >= 8), PIZZ_BEATS.get(m, (0, 1, 2, 3)))
        stop = {0: (2, 3.5), 3: (2.5, 4), 6: (2.5, 4)}.get(m)
        for k in range(8):                                  # woodblock on the offbeats, shaker 8ths in the lab
            bt = k * 0.5
            if stop and stop[0] <= bt < stop[1]:
                continue
            if k % 2 == 1:
                b.add("perc", I.woodblock(1250 if k % 4 == 1 else 1050, 0.4, _r()), D(m, bt), 0.4)
            if m >= 8:
                b.add("perc", I.shaker(0.36 if k % 2 else 0.5, _r()), D(m, bt), -0.4)
    # little gags inside the tune
    b.add("pizz", I.pizz(F(36), 0.6, _r(), 0.9), D(0, 2), -0.1)                 # bottom drops out before the 6.53 shock
    for k, tm in enumerate([D(3, 0), D(3, 0.25), D(3, 0.5), D(3, 1.0), D(3, 1.5), D(3, 2.0)]):   # mock military over 'war'
        b.add("snare", I.snare(0.3 if k not in (2, 5) else 0.45, _r()), tm, 0.05)
    b.add("clarinet", I.clarinet(F(60), 1.2, 0.5, _r(), att=0.04, bend=17), D(4, 3), -0.12)   # gliss up with the inhale (13.07)
    clar(b, [(D(5, 2) - 0.01, 1.5 * B, 77)], 0.55, vib=12)
    b.add("pizz", I.pizz(F(58), 0.45, _r(), 0.6), D(6, 3), 0.1)                   # 'can't crack it'
    b.add("pizz", I.pizz(F(57), 0.4, _r(), 0.6), D(6, 3.5), 0.1)
    for m in range(7, 12):                                                        # stubborn lab: tick-tock on the beats
        for bt in range(4):
            b.add("perc", I.woodblock(800 if bt % 2 == 0 else 950, 0.35, _r()), D(m, bt), 0.3)
    for m in range(8, 12):                                                        # staccato string ostinato (pump on the beats)
        root = {8: 41, 9: 43, 10: 38, 11: 36}[m]
        for k in range(8):
            mm = root + (12 if k % 2 else 0)
            b.add("strings", I.strings([F(mm)], 0.12, 0.3 + 0.03 * (m - 8), _r(), att=0.01, rel=0.06, voices=2, vib=0, bright=2200), D(m, k * 0.5))
    brass_chord(b, D(10), 3.2, [38, 45, 50], 0.45, "soft",
                env=lambda t: np.interp(t, [0, 1.6, 3.2], [0.4, 0.8, 1.0]))            # furnace heat
    timp_roll(b, D(10, 2), D(11), 38, 0.08, 0.22)
    for bt, m in [(0, 96), (1, 93), (2, 98)]:
        b.add("glock", I.glock(F(m), 0.3, _r(), dur=1.0), D(11, bt), -0.3)
    roll(b, D(11, 2.5), D(12) - 0.02, 0.1, 0.4)
    b.add("cymbal", I.rev_cymbal(1.0, 0.3, _r()), D(12) - 1.0, 0.0)
    b.cues.append((D(0, 2), "stop-time 6.27-6.87: room for the 6.53 shock sting"))
    b.cues.append((D(3), "mock-military clarinet + snare on 'war over it', stop at 11.27 for the 11.4 cannon"))
    b.cues.append((D(4, 3), "clarinet glissando up with the 13.07 inhale, lands on a held F5"))
    b.cues.append((D(6), "'can't crack it open': chromatic slide down, Bb -> Bb minor, stop at 16.07 for the boing"))
    b.cues.append((D(7), "lab: tune drops to low clarinet, woodblock tick-tock (stubborn)"))
    b.cues.append((D(8), "squeeze: tune climbs in sequence, staccato strings + shaker, pump strokes land on the beats (18.67 + k*0.4)"))
    b.cues.append((D(10), "'cooks it': soft low brass swell + timpani roll"))
    b.cues.append((D(11, 2.5), "clarinet run + snare roll + reverse cymbal into 'Fertilizer'"))

    # ============================================================== BRIGHT 24.67 - 27.87
    theme_hi = [(0, .5, 77), (.5, .5, 84), (1, .5, 82), (1.5, .5, 81), (2, 2, 81)]
    clar(b, bars(12, theme_hi), 0.7, vib=10)
    for (t, d, m) in bars(12, theme_hi):
        b.add("strings", I.strings([F(m)], d * 0.95, 0.42, _r(), att=0.03, rel=0.25, voices=3, vib=10, bright=4200), t)
    chord_strings(b, D(12), 1.6, [41, 53, 57, 60, 65], 0.5, att=0.06, rel=0.35, bright=2400)
    oompah(b, 12, ["F", "F"], 0.65, 0.42)
    brass_chord(b, D(12, 1.75), 0.08, [72, 77], 0.6, "trumpet", track="brass")
    brass_chord(b, D(12, 2), 0.75, [72, 77, 81], 0.6, "trumpet", track="brass", scoop=-10)
    brass_chord(b, D(12, 2), 0.85, [53, 57, 60, 65], 0.5, "horn", track="brass")
    b.add("timpani", I.timpani(F(41), 0.75, _r()), D(12, 2), -0.1)
    b.add("cymbal", I.cymbal(0.32, _r(), dur=2.0), D(12, 2), 0.0)
    for k, m in enumerate([89, 93, 96, 101]):
        b.add("glock", I.glock(F(m), 0.4, _r(), dur=1.4), D(12, 2) + 0.05 * k, -0.3 + 0.2 * k)
    b.cues.append((D(12), "BRIGHT on 'Fertilizer': tune high on clarinet + violins, full F major"))
    b.cues.append((D(12, 2), "small triumphant lift 25.47: trumpets 'ta-daa' (C-F-A), horns, timpani, soft cymbal, glock run"))
    # 26.27 warm turn: Bb6 - F/A - Gm6 - A7 under G-F-E-C#
    for bt, (ms, top) in enumerate([([46, 53, 62, 65], 79), ([45, 53, 60, 65], 77), ([43, 50, 58, 64], 76), ([45, 52, 55, 61], 73)]):
        chord_strings(b, D(13, bt), B * 1.02, ms + [top], 0.46, att=0.08, rel=0.3 if bt < 3 else 0.5, bright=2600)
        b.add("clarinet", I.clarinet(F(top - 12), B * 0.95, 0.42, _r(), att=0.05, vib=8), D(13, bt), -0.12)
        b.add("pizz", I.pizz(F(ms[0]), 0.6, _r(), 0.8), D(13, bt), -0.15)
        b.add("glock", I.glock(F(top + 12), 0.22, _r(), dur=1.2), D(13, bt), -0.3)
    brass_chord(b, D(13), 1.5, [53, 58, 62], 0.4, "horn", track="brass")
    b.cues.append((D(13), "warm 'feeds half the people on Earth': Bb6 - F/A - Gm6 - A7 (melody G-F-E-C#), turning to D minor"))

    # ============================================================== WAR 27.87 - 42.5 (D minor, 150 bpm)
    roots = [(D(14), 38), (D(15), 46), (D(16), 38), (D(16, 2), 43), (D(16, 3), 45), (D(17), 38), (D(17, 2), 46), (D(17, 3), 45),
             (D(18), 38), (D(18, 2), 46), (D(18, 3), 45), (D(19), 38)]
    pulse(b, D(14), D(19), B / 2, roots, 0.45, accents=(0, 3, 6), cut0=300, cut1=800)
    snare_bar(b, D(14), "light", 0.56)
    snare_bar(b, D(15), "march", 0.63)
    snare_bar(b, D(16), "march", 0.7)
    snare_bar(b, D(17), "march", 0.76)
    snare_bar(b, D(18), "drive", 0.66, cres=0.3)
    for m in range(14, 19):
        for bt in (0, 2):
            b.add("bassdrum", I.bass_drum(0.5 + 0.06 * (m - 14), _r()), D(m, bt), 0.0)
    b.add("timpani", I.timpani(F(38), 0.7, _r()), D(14), -0.1)
    chord_strings(b, D(14), 3.2, [38, 45], 0.35, att=0.4, rel=0.2, bright=1200, vib=4)
    chord_strings(b, D(15), 1.6, [46, 53, 58], 0.38, att=0.1, rel=0.2, bright=1400, vib=4)
    # 30.27 'explosives' + the shell clank (30.2)
    brass_chord(b, D(15, 2), 0.5, [34, 46, 53], 0.85, "stab", fall=-0.5)
    b.add("timpani", I.timpani(F(34), 0.9, _r()), D(15, 2), -0.1)
    b.add("bassdrum", I.bass_drum(0.85, _r()), D(15, 2), 0.0)
    # low horns: the motif in the war
    horn1 = [(0, 1, 50), (1, 1, 57), (2, .5, 55), (2.5, .5, 53), (3, 1, 52)]
    horn2 = [(0, 1, 50), (1, 1, 57), (2, .5, 58), (2.5, .5, 57), (3, 1, 49)]
    for (t, d, m) in bars(16, horn1) + bars(17, horn2):
        brass_chord(b, t, d * 0.92, [m, m - 12], 0.78, "horn", scoop=-18)
    chord_strings(b, D(16), 1.6, [50, 53, 57], 0.36, att=0.2, rel=0.2, bright=1600, vib=6)
    chord_strings(b, D(17), 0.8, [50, 53, 57], 0.38, att=0.1, rel=0.1, bright=1600, vib=6)
    chord_strings(b, D(17, 2), 0.4, [46, 50, 53], 0.38, att=0.05, rel=0.05, bright=1600, vib=6)
    chord_strings(b, D(17, 3), 0.4, [45, 49, 52, 55], 0.4, att=0.05, rel=0.1, bright=1700, vib=6)
    # trench: tutti + hits exactly on the field guns
    chord_strings(b, D(18), 1.6, [50, 53, 57, 62], 0.38, att=0.05, rel=0.2, bright=2200, trem=0.8)
    brass_chord(b, D(18), 1.5, [38, 45, 50], 0.45, "tuba")
    for tg in T.GUNS:
        brass_chord(b, tg, 0.3, [38, 50, 53, 57], 0.6, "stab", track="brass")
        b.add("timpani", I.timpani(F(38), 0.8, _r()), tg, -0.1)
        b.add("hit", I.cine_hit(0.4, _r(), F(26), 2.0, 0.6, 0.6), tg)
    b.add("cymbal", I.cymbal(0.28, _r(), dur=2.2), T.GUNS[1], 0.0)
    b.cues.append((D(14), "WAR (D minor): the hook's pulse returns as machinery, military snare enters light, bass drum"))
    b.cues.append((D(15, 2), "low brass stab + timpani on 'explosives' / shell clank (30.27)"))
    b.cues.append((D(16), "low horns play the motif (D-A-G-F-E | D-A-Bb-A-C#), snare march"))
    b.cues.append((T.GUNS[0], "trench tutti: string tremolo, snare drive; brass stabs + timpani + low hits exactly on 35.13 and 35.50"))
    # Ypres hush 35.87 - 38.67
    roll(b, D(19), D(19, 2), 0.25, 0.05)
    for m, bts in [(19, (0, 2)), (20, (0, 2))]:
        for bt in bts:
            b.add("bassdrum", I.bass_drum(0.42, _r(), 46), D(m, bt), 0.0)
    chord_strings(b, D(19), 1.65, [38, 55, 58, 63], 0.34, att=0.4, rel=0.1, bright=1500, trem=0.6, trem_rate=12)
    chord_strings(b, D(20), 1.25, [38, 49, 55, 58], 0.36, att=0.1, rel=0.1, bright=1600, trem=0.7, trem_rate=12,
                  swell=lambda t: np.interp(t, [0, 1.2], [0.7, 1.2]))
    timp_roll(b, D(20, 1.5), T.GAS, 38, 0.12, 0.5)
    b.cues.append((D(19), "Ypres hush: snare dies away, heartbeat bass drum, tremolo Eb/D -> dim7/D; leaves room for the pocket watch"))
    # GAS 38.67 - 42.5
    sw = lambda t: np.interp(t, [0, 2.5, 3.8], [0.35, 1.0, 1.1])
    for m in [26, 27, 33, 34]:
        x = I.brass(F(m + 12), 3.8, 0.75, _r(), "tuba", scoop=-30)
        b.add("lowbrass", x * sw(np.arange(len(x)) / SR), T.GAS, -0.1)
    for m in [50, 51, 57, 58]:
        x = I.brass(F(m), 3.75, 0.6, _r(), "horn", scoop=-20)
        b.add("lowbrass", x * sw(np.arange(len(x)) / SR), T.GAS + 0.03, (m - 54) / 12)
    chord_strings(b, T.GAS, 3.75, [62, 63, 64, 65], 0.42, att=0.8, rel=0.1, bright=2500, gliss=-2.0, trem=0.0, vib=4,
                  swell=lambda t: np.interp(t, [0, 2.5, 3.8], [0.5, 1.0, 1.15]))
    pulse(b, D(21), D(23), B / 2, [(D(21), 38)], 0.55, accents=(0, 3, 6), cut0=300, cut1=1000)
    snare_bar(b, D(21), "march", 0.62)
    snare_bar(b, D(22), "drive", 0.72, cres=0.3)
    for m in (21, 22):
        for bt in (0, 1, 2, 3):
            b.add("bassdrum", I.bass_drum(0.55 if bt % 2 == 0 else 0.4, _r()), D(m, bt), 0.0)
    b.add("cymbal", I.rev_cymbal(1.6, 0.35, _r()), D(22) - 1.6, 0.0)
    chord_strings(b, T.PANIC, 1.27, [81, 82, 83], 0.24, att=0.05, rel=0.05, bright=6000, trem=0.9, trem_rate=15, vib=0)
    for tm in [T.PANIC, D(22, 2), D(22, 3), D(23)]:
        brass_chord(b, tm, 0.18, [38, 51, 57, 62], 0.62 if tm != D(23) else 0.72, "stab", track="brass")
    b.add("hit", I.cine_hit(0.5, _r(), F(26), 1.5, 0.8, 0.5), D(23))
    b.add("timpani", I.timpani(F(38), 1.0, _r()), D(23), -0.1)
    b.cues.append((T.GAS, "GAS: low brass cluster D-Eb-A-Bb swells, string cluster D-Eb-E-F slides down 2 semitones"))
    b.cues.append((D(21), "march + pulse return under the gas, snare drive from 40.67"))
    b.cues.append((T.PANIC, "panic: high string tremolo cluster + brass stabs 41.2 / 41.47 / 41.87 / 42.27, final low hit 42.27, cut 42.47"))
    war_cut = np.ones(N)
    a, z = ns(42.44), ns(42.48)
    war_cut[a:z] = np.linspace(1, 0, z - a)
    war_cut[z:] = 0
    for k in b.tr:
        b.tr[k] *= war_cut[None, :]

    # ============================================================== SOMBER 42.5 - 46.23
    for m in [38, 45, 50]:
        b.add("piano", I.piano(F(m), 0.42, _r(), dur=4.0), 42.55, (m - 50) / 30)
    for tm, m, v in [(43.35, 65, 0.3), (43.95, 64, 0.27), (44.55, 62, 0.25)]:
        b.add("piano", I.piano(F(m), v, _r(), dur=3.0), tm, 0.1)
    b.add("piano", I.piano(F(34), 0.3, _r(), dur=3.0), 44.55, -0.2)
    chord_strings(b, 42.55, 2.0, [50, 53, 57], 0.28, att=1.0, rel=0.6, bright=1300, vib=5)
    chord_strings(b, 44.55, 0.5, [46, 50, 53], 0.24, att=0.4, rel=0.6, bright=1200, vib=5)
    b.cues.append((42.55, "SOMBER: low piano D (octave + fifth), motif fragment F-E-D, soft low strings Dm -> Bb"))
    b.cues.append((45.2, "near silence 45.2-46.2 (everything faded to -26 dB): no music for her death"))

    # ============================================================== MORNING 46.23 - 49.93
    chord_strings(b, 46.3, 1.8, [46, 53, 62], 0.22, att=0.9, rel=0.4, bright=1500, vib=6)
    chord_strings(b, 48.13, 1.8, [43, 50, 58], 0.22, att=0.5, rel=0.3, bright=1400, vib=5)
    for tm, d, m, v in [(46.5, 0.55, 65, 0.42), (47.2, 0.28, 67, 0.36), (47.5, 0.9, 70, 0.42), (48.5, 0.3, 70, 0.36), (48.85, 0.3, 69, 0.34)]:
        b.add("clarinet", I.clarinet(F(m), d, v, _r(), att=0.06, vib=8), tm, -0.12)
    b.add("clarinet", I.clarinet(F(67), 0.55, 0.36, _r(), att=0.05, bend=-0.6), 49.2, -0.12)
    for tm, m in [(48.33, 43), (48.93, 50), (49.53, 43)]:
        b.add("pizz", I.pizz(F(m), 0.45, _r(), 0.8), tm, -0.15)
    b.cues.append((46.3, "hesitant morning: soft strings Bb, solo clarinet F..G-Bb (gaps between phrases)"))
    b.cues.append((48.13, "Alps / 'wanted': G minor strings, clarinet droops (49.2), hesitant low pizz"))

    # ============================================================== SNEAKY 49.93 - 52.33 (grid 49.93 + k * 0.4)
    walk = [43, 46, 50, 51, 50, 45]
    for k, m in enumerate(walk):
        b.add("pizz", I.pizz(F(m), 0.62 if k % 2 == 0 else 0.5, _r(), 0.55), S0 + k * SB, -0.1)
    for bt, m in [(0.5, 55), (1.5, 58), (2.5, 62), (3.0, 63), (3.5, 62), (4.5, 61), (5.0, 62)]:
        b.add("clarinet", I.clarinet(F(m), 0.085, 0.5, _r(), att=0.012), S0 + bt * SB, 0.15)
    for k in range(6):
        b.add("perc", I.woodblock(1500, 0.18, _r(), 0.08), S0 + (k + 0.5) * SB, 0.35)
    b.add("glock", I.glock(F(98), 0.25, _r(), dur=1.0), S0 + 1 * SB, 0.3)
    b.cues.append((S0, "sneaky tiptoe pizzicato (G minor), staccato clarinet on the offbeats; grid hits 50.33 (poof) and 51.13 (tiptoe)"))

    # ============================================================== FANFARE 52.33 - 54.4 (Bb major, ironic)
    roll(b, 52.33, T.MEDAL - 0.02, 0.08, 0.55)
    timp_roll(b, 52.73, T.MEDAL - 0.02, 41, 0.15, 0.5)
    for tm, d, ms in [(52.93, 0.07, [65]), (53.03, 0.07, [65])]:
        brass_chord(b, tm, d, ms, 0.6, "trumpet", track="brass")
    brass_chord(b, T.MEDAL, 0.3, [62, 65, 70], 0.8, "trumpet", track="brass", scoop=-10)
    brass_chord(b, 53.48, 0.1, [65, 70, 74], 0.7, "trumpet", track="brass")
    brass_chord(b, 53.63, 0.1, [65, 70, 74], 0.7, "trumpet", track="brass")
    brass_chord(b, 53.78, 0.5, [70, 74, 77], 0.82, "trumpet", track="brass", fall=-1.5)
    brass_chord(b, T.MEDAL, 1.15, [46, 53, 58, 62], 0.55, "horn", track="brass", fall=-1.0)
    b.add("timpani", I.timpani(F(46), 0.85, _r()), T.MEDAL, -0.1)
    b.add("timpani", I.timpani(F(41), 0.7, _r()), 53.78, -0.1)
    b.add("cymbal", I.cymbal(0.3, _r(), dur=1.3), T.MEDAL, 0.0)
    b.add("glock", I.glock(F(94), 0.35, _r(), dur=1.2), T.MEDAL, -0.3)
    b.cues.append((52.33, "snare + timpani roll under the footsteps"))
    b.cues.append((T.MEDAL, "ironic little fanfare 53.13: trumpets ta-ta-TAA ta-ta-TAAA (Bb), horns, timpani, cymbal; the last chord droops 1.5 semitones and dies by 54.35"))
    fan_cut = np.ones(N)
    a, z = ns(54.2), ns(54.38)
    fan_cut[a:z] = np.linspace(1, 0, z - a) ** 2
    fan_cut[z:] = 0
    for k in ("brass", "timpani", "cymbal", "snare", "glock"):
        b.tr[k] *= fan_cut[None, :]

    # ============================================================== DARK 54.4 - 62.7 (drones, no beats)
    b.add("drone", I.drone(F(38), 7.6, 0.55, _r(), att=1.4, rel=1.6, bright=650), 54.4)
    chord_strings(b, 54.7, 3.35, [50, 57], 0.14, att=1.5, rel=1.2, bright=1800, vib=0, voices=2)   # audible on phones
    b.add("drone", I.drone(F(26), 7.4, 0.35, _r(), att=2.0, rel=1.6, bright=200, noise=0.1), 54.6)
    b.add("drone", I.drone(F(51), 3.6, 0.3, _r(), att=1.2, rel=1.4, bright=700), T.OMINOUS)
    chord_strings(b, 58.1, 2.4, [81, 82], 0.11, att=1.2, rel=1.0, bright=6000, vib=0, voices=2)
    b.add("bell", I.bell(F(62), 0.25, _r(), dur=4.5, bright=0.4), 58.15, -0.4)
    b.add("piano", I.piano(F(62), 0.16, _r(), dur=2.5), 61.45, 0.1)
    b.cues.append((54.4, "DARK: D drones + a faint D/A string fifth (no beats), Eb drone enters with the poison can (56.77) - minor-ninth beating"))
    b.cues.append((58.1, "camp: cold high strings A/Bb, one far low bell"))
    b.cues.append((60.73, "candle: drones fade toward silence; one soft piano D (61.45)"))

    # ============================================================== RETURN 62.7 - 68.37 (100 bpm, bittersweet)
    R0 = 62.7
    for (bt, d, m) in MOTIF:
        b.add("bell", I.bell(F(m), 0.64, _r(), dur=3.6, bright=0.8, minor=m not in (77, 82)), R0 + bt * HB, (m - 77) / 20)
        b.add("piano", I.piano(F(m - 12), 0.3, _r(), dur=2.0), R0 + bt * HB, 0.15)
    prog = [(62.7, 63.9, [50, 57, 64, 65]), (63.9, 64.5, [46, 53, 57, 62]), (64.5, 65.1, [45, 52, 57, 61]),
            (65.1, 66.3, [48, 53, 57, 64]), (66.3, 66.9, [43, 50, 58, 64]), (66.9, 67.3, [45, 52, 55, 61])]
    for i, (ta, tb, ms) in enumerate(prog):
        chord_strings(b, ta, tb - ta + 0.05, ms, 0.3 + 0.025 * i, att=0.5 if i == 0 else 0.12, rel=0.25, bright=2200, vib=7)
        b.add("piano", I.piano(F(ms[0] - 12), 0.28, _r(), dur=1.8), ta, -0.15)
    pulse(b, R0, 67.2, HB / 2, [(62.7, 38), (63.9, 34), (64.5, 33), (65.1, 36), (66.3, 31), (66.9, 33)], 0.36, cut0=250, cut1=600)
    # final low hit on 'warfare' (67.29)
    tF = T.FINAL_BOOM
    b.add("hit", I.cine_hit(0.85, _r(), F(26), 1.1, 0.9, 0.7), tF)
    brass_chord(b, tF, 1.0, [38, 45, 50], 0.6, "tuba", env=lambda t: np.interp(t, [0, 0.12, 0.6, 2], [1.0, 0.7, 0.4, 0.4]))
    b.add("timpani", I.timpani(F(38), 0.95, _r(), dur=1.1), tF, -0.1)
    b.add("bell", I.bell(F(74), 0.55, _r(), dur=1.1), tF, -0.15)
    chord_strings(b, tF, 1.07, [38, 45, 50, 53, 57, 62], 0.38, att=0.03, rel=0.02, bright=2000, vib=6)
    b.add("cymbal", I.cymbal(0.2, _r(), dur=1.1, bright=0.6), tF, 0.0)
    b.cues.append((62.7, "RETURN: the hook's bell motif, soft, over piano + warm strings Dm9 - Bbmaj7 - A - Fmaj7/C - Gm6 - A7, soft pulse"))
    b.cues.append((tF, "final low hit on 'warfare' 67.30: sub hit, low brass, timpani, bell D, D minor strings; tail to 68.37, fade from 68.07"))

    # ============================================================== global envelopes
    env = np.ones(N)
    t = np.arange(N) / SR
    env *= np.interp(t, [0, 44.9, 45.3, 46.15, 46.4, T.DUR], [1, 1, 0.05, 0.05, 1, 1])            # near silence 45.2-46.2
    env *= np.interp(t, [0, 60.6, 61.3, 62.65, 62.7, T.DUR], [1, 1, 0.45, 0.45, 1, 1])            # candle: drones recede
    a = ns(T.DUR - 0.3)
    env[a:] *= np.linspace(1, 0, N - a) ** 1.5
    for k in b.tr:
        b.tr[k] *= env[None, :]
    return b


TARGET = {  # relative balance inside the band (LU vs ref, measured on each track's own integrated loudness)
    "bell": -3.0, "glock": -11.0, "clarinet": -2.5, "pizz": -5.0, "strings": -3.5, "lowbrass": -4.5, "brass": -3.5, "snare": -7.0,
    "bassdrum": -8.0, "timpani": -7.0, "cymbal": -13.0, "perc": -14.0, "pulse": -4.0, "hit": -2.0, "piano": -5.0, "drone": -6.0,
    "tick": -15.0,
}


# per-track gains (dB) frozen from the first balanced pass (= ref + TARGET - track loudness at that time), so later
# velocity edits stay local instead of renormalizing a whole track
GAINS = {"bell": -18.38, "glock": -21.55, "clarinet": -14.45, "pizz": -13.15, "strings": -13.45, "lowbrass": -26.32, "brass": -27.97,
         "snare": -14.05, "bassdrum": -15.89, "timpani": -21.01, "cymbal": -19.19, "perc": -14.47, "pulse": -17.13, "hit": -12.24,
         "piano": -7.58, "drone": -13.9, "tick": -12.61}


def render(b, ref=-20.0):
    hall = make_ir(2.0, 7, pre=0.02, hf=1.4)
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(GAINS[k]) if k in GAINS else dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g
        b.tr[k] = x
        dry += x
        wet += b.send[k] * x
    out = dry + 0.75 * convolve_st(wet, hall)
    out = hp(out, 28, 2)
    a = ns(T.DUR - 0.3)
    out[:, a:] *= np.linspace(1, 0, N - a)[None, :] ** 1.5
    return out, levels
