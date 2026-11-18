# Original score for "The Woman Who Never Stopped" (Henrietta Lacks), composed and synthesized here (instruments.py).
# One piece on one motif: the hook's chime-bell + piano figure (pickup A) F-E-D-A | G-F-E-C# -> D (D minor) over a soft
# heartbeat pulse. It comes back in G major as the 1951 Americana tune (B-A-G-D), and in D major at the end, where it
# resolves on 'name'. Every section sits on its own beat grid so the picture's key events are beats:
#   0-4.9       hook, D minor, quarter 0.425 s: bars 0.17 / 1.87 (microscope) / 3.57 (space); cut into the 4.90 flash
#   5.03-14.7   1951 Americana, G major, 98.6 bpm (bars 5.03, 7.46, 9.90, 12.33 = hospital swell): guitar, piano tune
#   14.7-19.43  exam room: hushed G pedal (Cm/G -> Abmaj7/G), piano semitone sighs, thin high string; thins out 18.5
#   19.43-22.87 Gey's lab, 100 bpm: curious pizzicato + marimba; dying cells: chromatic bass G-F#-F-E
#   22.87-24.43 'Hers don't', 93.75 bpm, D major: bright marimba / glock / pizz; stop-time for the 24.43 sting
#   25.11-29.35 wonder: celesta arpeggios, vibes, strings Gmaj7 - A/G - F#m7 - Bm7 - Em9 - A7sus4
#   29.45-31.3  near silence: one soft low D minor chord (piano + low strings)
#   31.4-42.2   montage, 150 bpm, D major (bars 32.2 ... 38.6 = ignition): steady pulse, rising; brass peak 38.6-40.2
#   42.3-44.25  warm D major swell; 44.27 single low piano D, very quiet
#   46.0-51.2   sober D minor: slow piano chords, lone violin F-E-D-C#
#   51.2-54.7   relief Bb - C - D (52.83 'they finally settle'), violin D-E-F#
#   54.7-60.2   the motif returns in D major over the heartbeat; final D(add9) chord blooms on 'name' (59.23)
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, make_ir, convolve_st, integrated, hp, dbg
import instruments as I
import timeline as T

N = ns(T.DUR)
F = I.m2f

HQ = 0.425                                 # hook + ending quarter (bar 1.70 s)
AQ = 7.30 / 12                             # Americana quarter 0.6083 s


def H(bar, beat=0.0):
    return 0.17 + 1.70 * bar + HQ * beat   # 0.17, 1.87, 3.57


def A(bar, beat=0.0):
    return 5.03 + 4 * AQ * bar + AQ * beat  # 5.03, 7.463, 9.897, 12.33


def S1(beat):
    return 20.47 + 0.6 * beat              # lab 1: beats 19.87, 20.47, 21.07, 21.67, 22.27, (22.87)


def S2(beat):
    return 22.87 + 0.64 * beat             # lab 2: 22.87, 23.51, 24.15, 24.79, 25.43, ... 28.63 (shatter)


def M(bar, beat=0.0):
    return 32.2 + 1.6 * bar + 0.4 * beat   # montage bars 32.2, 33.8, 35.4, 37.0, 38.6, 40.2, 41.8


def E(bar, beat=0.0):
    return 55.83 + 1.70 * bar + HQ * beat  # ending bars 55.83, 57.53, 59.23 ('name')


SECTIONS = [("hook", 0.0, 4.9), ("americana", 4.9, 14.7), ("exam", 14.7, 19.43), ("lab", 19.43, 25.13),
            ("explain", 25.13, 29.4), ("death", 29.4, 31.4), ("montage", 31.4, 38.6), ("rocket", 38.6, 40.2),
            ("papers", 40.2, 42.3), ("swell", 42.3, 44.27), ("lownote", 44.27, 46.0), ("sober", 46.0, 51.2),
            ("relief", 51.2, 54.7), ("ending", 54.7, T.DUR)]
HARD = [4.9, 29.4, 44.27]                  # section switches where the music is cut / silent (level may jump there)

# motif (beat, beats, midi) relative to a bar downbeat; pickup A4 0.17 s before it
MOTIF_MINOR = [(0, 1.5, 77), (1.5, .5, 76), (2, 1, 74), (3, 1, 69), (4, 1.5, 79), (5.5, .5, 77), (6, 1, 76), (7, 1, 73)]
MOTIF_MAJOR = [(0, 1.5, 78), (1.5, .5, 76), (2, 1, 74), (3, 1, 69), (4, 1.5, 79), (5.5, .5, 78), (6, 1, 76), (7, 1, 73)]


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


R = rng(1951)


def _r():
    return rng(int(R.integers(1 << 30)))


def strings(b, t, dur, ms, vel, track="strings", **kw):
    b.add(track, I.strings([F(m) for m in ms], dur, vel, _r(), **kw), t)


def piano_chord(b, t, ms, vel, dur=3.0, roll=0.012, p0=-0.2, damp=None):
    for k, m in enumerate(ms):
        b.add("piano", I.piano(F(m), vel * R.uniform(0.93, 1.03), _r(), dur, damp=damp), t + roll * k, p0 + 0.4 * k / max(1, len(ms) - 1))


def brass_chord(b, t, dur, ms, vel, kind="horn", env=None, scoop=-12):
    for k, m in enumerate(ms):
        x = I.brass(F(m), dur, vel, _r(), kind, scoop=scoop)
        if env is not None:
            x = x * env(np.arange(len(x)) / SR)
        b.add("brass", x, t + 0.006 * k, (m - 62) / 40)


def pulse(b, times, root_at, vel=0.5, cut0=280, cut1=700, frac=0.7, step=HQ):
    """soft synth pulse bass: one note per time, root from root_at(t), filter opening over the span"""
    t0, t1 = times[0], times[-1] + 1e-6
    for t in times:
        u = (t - t0) / max(t1 - t0, 1e-6)
        x = I.synth_bass(F(root_at(t)), step * frac, vel * R.uniform(0.94, 1.04), _r(), cutoff=cut0 + (cut1 - cut0) * u, env_amt=1.5)
        b.add("pulse", x, t, 0.0)


def heart(b, t, vel=0.6):
    """lub-dub"""
    b.add("heart", I.heartbeat(vel, _r()), t)
    b.add("heart", I.heartbeat(vel * 0.6, _r(), 58.0, 0.7), t + 0.19)


def timp_roll(b, t0, t1, m, v0, v1, rate=14.0):
    t, i = t0, 0
    while t < t1:
        u = (t - t0) / max(t1 - t0, 1e-6)
        b.add("timpani", I.timpani(F(m), (v0 + (v1 - v0) * u ** 1.3) * (0.9 + 0.2 * (i % 2)), _r(), dur=0.9), t, -0.1)
        t += 1 / rate
        i += 1


def cut_all(b, t0, t1, keep=()):
    """fade every track to zero over t0..t1 and keep it silent until the next cue writes into it (done in order)"""
    c = np.ones(N)
    a, z = ns(t0), ns(t1)
    c[a:z] = np.linspace(1, 0, z - a) ** 1.5
    c[z:] = 0
    for k in b.tr:
        if k not in keep:
            b.tr[k] *= c[None, :]


def fade_tracks(b, t0, t1, tracks):
    """fade `tracks` to zero over t0..t1 and keep them silent afterwards (later cues are added after this call)"""
    c = np.ones(N)
    a, z = ns(t0), ns(t1)
    c[a:z] = np.linspace(1, 0, z - a) ** 1.5
    c[z:] = 0
    for k in tracks:
        if k in b.tr:
            b.tr[k] *= c[None, :]


def gate(b, t0, t1, tracks):
    """silence `tracks` between t0 and t1 (short fades at both ends)"""
    c = np.ones(N)
    a, z = ns(t0), ns(t1)
    f = ns(0.03)
    c[a:z] = 0
    c[a - f:a] = np.linspace(1, 0, f)
    c[z:z + f] = np.linspace(0, 1, f)
    for k in tracks:
        if k in b.tr:
            b.tr[k] *= c[None, :]


def build():
    b = Band()
    for name, send in [("bell", 0.3), ("piano", 0.24), ("guitar", 0.12), ("strings", 0.26), ("violin", 0.28), ("pulse", 0.04),
                       ("heart", 0.04), ("marimba", 0.15), ("celesta", 0.26), ("glock", 0.24), ("vibes", 0.22), ("pizz", 0.15),
                       ("brass", 0.2), ("timpani", 0.18), ("cymbal", 0.2), ("hit", 0.12), ("brush", 0.1)]:
        b.track(name, send)
    hook(b)
    americana(b)
    exam(b)
    lab(b)
    explain(b)
    death(b)
    montage(b)
    swell_and_low(b)
    sober_relief(b)
    ending(b)
    # global tail fade (last 0.3 s)
    env = np.ones(N)
    a = ns(T.DUR - 0.3)
    env[a:] = np.linspace(1, 0, N - a) ** 1.5
    for k in b.tr:
        b.tr[k] *= env[None, :]
    return b


# ============================================================== HOOK 0 - 4.9 (D minor)
def hook(b):
    # frame 0: pickup A4 on chime bell + piano with a soft low bloom (felt sub hit, low piano D1/D2) - grabs at once
    b.add("bell", I.chime_bell(F(69), 0.72, _r(), 2.6), 0.0, 0.1)
    b.add("piano", I.piano(F(69), 0.45, _r(), 1.2, damp=0.3), 0.0, 0.05)
    b.add("hit", I.cine_hit(0.5, _r(), F(26), 3.2, 0.12, 1.5), 0.0)
    piano_chord(b, 0.0, [26, 38], 0.42, 3.4, 0.0, -0.25)
    for (bt, d, m) in MOTIF_MINOR + [(8, 2, 74)]:
        v = 0.68 if bt in (0, 4, 8) else 0.56
        b.add("bell", I.chime_bell(F(m), v, _r(), 2.6), H(0, bt), (m - 74) / 16)
        b.add("piano", I.piano(F(m), v * 0.62, _r(), 1.8, damp=d * HQ + 0.25), H(0, bt), 0.05)
    # 'space' (3.57): the figure floats up A5 - D6 - E6
    for bt, m, v in [(1, 81, 0.24), (2, 86, 0.17), (2.5, 88, 0.14)]:
        b.add("bell", I.chime_bell(F(m), v, _r(), 2.0, bright=0.5), H(2, bt), 0.3)
    b.add("celesta", I.celesta(F(93), 0.22, _r(), 1.4), H(2, 1), -0.3)
    # low strings: Dm | Bb - A | Dm(add9); a middle voice joins at the 1.87 lift, high shimmer at 3.57
    strings(b, 0.0, 1.92, [38, 45, 53], 0.34, att=0.8, rel=0.25, bright=1400, vib=4,
            swell=lambda t: np.interp(t, [0, 1.9], [0.7, 1.0]))
    strings(b, H(1), 0.88, [34, 41, 50, 53, 62, 65], 0.36, att=0.08, rel=0.15, bright=1600, vib=5)
    strings(b, H(1, 2), 0.9, [33, 40, 49, 52, 61, 64], 0.37, att=0.08, rel=0.15, bright=1600, vib=5)
    strings(b, H(2), 1.33, [38, 45, 52, 53, 62], 0.35, att=0.12, rel=0.05, bright=1500, vib=4)
    strings(b, H(2), 1.33, [81, 86, 88], 0.07, att=0.45, rel=0.05, bright=6000, vib=0, trem=0.5, trem_rate=14)
    # soft pulse (quarters) + heartbeat lub-dub on beats 1 and 3
    roots = lambda t: 38 if t < H(1) - 1e-3 else (34 if t < H(1, 2) - 1e-3 else (33 if t < H(2) - 1e-3 else 38))
    pulse(b, [H(0, k) for k in range(11)], roots, 0.5, 260, 650)
    for k in range(6):
        heart(b, H(0, 2 * k), 0.62 if k % 2 == 0 else 0.5)
    # the two lifts: short reversed-cymbal breaths into the cuts, a soft timpani note and cymbal touch on them
    for tc, m in [(T.CUT_MICRO, 34), (T.CUT_SPACE, 38)]:
        b.add("cymbal", I.rev_cymbal(0.85, 0.26, _r()), tc - 0.85, 0.0)
        b.add("cymbal", I.cymbal(0.1, _r(), dur=1.6, bright=0.5), tc, 0.0)
        b.add("timpani", I.timpani(F(m), 0.38, _r(), dur=1.8), tc, -0.1)
    b.add("cymbal", I.rev_cymbal(1.1, 0.22, _r()), 4.9 - 1.1, 0.0)
    timp_roll(b, 4.25, 4.86, 38, 0.08, 0.2)
    cut_all(b, 4.85, 4.9)
    b.cues.append((0.0, "HOOK (D minor): pickup A4 on chime bell + piano with a soft low bloom (felt sub hit, low piano D) on frame 0; "
                        "motif F-E-D-A | G-F-E-C# -> D over soft pulse + heartbeat lub-dub, low strings Dm"))
    b.cues.append((T.CUT_MICRO, "lift 1 (microscope): reversed-cymbal breath into the cut, Bb - A strings open up, timpani touch"))
    b.cues.append((T.CUT_SPACE, "lift 2 (space): Dm(add9), high string shimmer, the figure floats up A5-D6-E6 (bell, celesta A6)"))
    b.cues.append((4.25, "reversed cymbal + timpani roll into the white flash; music out at 4.88 (the flash whoosh owns 4.90)"))


# ============================================================== AMERICANA 5.03 - 14.7 (G major)
GCH = {  # guitar voicings: (root bass, alternate bass, treble low -> high)
    "G": (43, 50, [59, 62, 67]), "C": (48, 43, [60, 64, 67]), "Em": (40, 47, [59, 64, 67]), "D": (50, 45, [57, 62, 66]),
}
AM_HARM = {0: ["G", "G", "G", "G"], 1: ["C", "C", "G", "G"], 2: ["Em", "Em", "C", "D"], 3: ["G", "G", "C", "C"]}
AM_MEL = {0: [(0, 1.5, 83), (1.5, .5, 81), (2, 1, 79), (3, 1, 74)],
          1: [(0, 1, 76), (1, .5, 79), (1.5, .5, 81), (2, 2, 83)],
          2: [(0, 1.5, 79), (1.5, .5, 78), (2, 1, 76), (3, 1, 81)],
          3: [(0, 1.5, 83), (1.5, .5, 81), (2, 1, 79), (3, 0.8, 76)]}


def americana(b):
    for bar in range(4):
        for beat in range(4):
            t = A(bar, beat)
            if t > 14.68:
                break
            ch = GCH[AM_HARM[bar][beat]]
            bass = ch[0] if beat % 2 == 0 else ch[1]
            if beat > 0 and AM_HARM[bar][beat] != AM_HARM[bar][beat - 1]:
                bass = ch[0]
            b.add("guitar", I.guitar(F(bass), 0.5 * R.uniform(0.93, 1.05), _r(), 1.0, 0.45), t + R.normal(0, 0.004), -0.15)
            if beat == 0:  # pinch: top note with the bass on the downbeat
                b.add("guitar", I.guitar(F(ch[2][2]), 0.3, _r(), 1.6, 0.6), t + 0.008, 0.2)
            tre = ch[2][[1, 2, 0, 2][beat]]
            te = t + AQ / 2 + R.normal(0, 0.004)
            if te < 14.68:
                b.add("guitar", I.guitar(F(tre), 0.33 * R.uniform(0.9, 1.05), _r(), 1.6, 0.6), te, 0.2 + 0.05 * (beat % 2))
        for (bt, d, m) in AM_MEL[bar]:
            v = (0.4 if bar < 3 else 0.42) * (1.0 if bt == 0 else 0.9)
            b.add("piano", I.piano(F(m), v, _r(), 2.2, damp=min(d * AQ + 0.35, 14.7 - A(bar, bt))), A(bar, bt), 0.12)
    # soft brushes on the backbeat (bars 1-3), a swish on 1 and 3
    for bar in range(1, 4):
        for beat in range(4):
            t = A(bar, beat)
            if t > 14.6:
                break
            if beat % 2:
                b.add("brush", I.brush(0.4, _r()), t, 0.25)
            else:
                b.add("brush", I.brush(0.22, _r(), dur=AQ * 0.9, swish=True), t, -0.2)
    # swell into 12.33 (hospital): strings crescendo C - D -> G, piano G chord, timpani, reversed cymbal, glock
    strings(b, A(2, 2), AQ + 0.05, [48, 55, 64, 67], 0.2, att=0.35, rel=0.1, bright=1800, vib=6)
    strings(b, A(2, 3), AQ + 0.05, [50, 57, 62, 66], 0.24, att=0.1, rel=0.1, bright=2000, vib=6)
    strings(b, T.HOSPITAL, 2 * AQ + 0.05, [43, 50, 59, 62, 67, 71], 0.3, att=0.12, rel=0.25, bright=2400, vib=7,
            swell=lambda t: np.interp(t, [0, 0.5, 1.3], [1.0, 1.08, 0.85]))
    strings(b, A(3, 2), 14.7 - A(3, 2), [48, 55, 64, 67], 0.22, att=0.1, rel=0.15, bright=1900, vib=6,
            swell=lambda t: np.interp(t, [0, 1.15], [1.0, 0.5]))
    piano_chord(b, T.HOSPITAL, [31, 43, 50, 55, 59], 0.28, 2.6, 0.02, -0.3, damp=2.3)
    b.add("pizz", I.pizz(F(31), 0.6, _r(), 1.2), T.HOSPITAL, -0.15)
    b.add("timpani", I.timpani(F(43), 0.3, _r(), dur=2.0), T.HOSPITAL, -0.1)
    b.add("cymbal", I.rev_cymbal(1.2, 0.2, _r()), T.HOSPITAL - 1.2, 0.0)
    b.add("cymbal", I.cymbal(0.08, _r(), dur=2.0, bright=0.5), T.HOSPITAL, 0.0)
    for k, m in enumerate([91, 95, 98]):
        b.add("glock", I.glock(F(m), 0.25, _r(), dur=1.4), T.HOSPITAL + 0.06 * k, 0.3 - 0.2 * k)
    b.cues.append((5.03, "1951 AMERICANA (G major, 98.6 bpm): fingerpicked steel-string guitar G | C G | Em C D | G C, piano tune "
                         "B-A-G-D (the motif in major), soft brushes"))
    b.cues.append((A(2, 2), "strings rise C - D into the hospital"))
    b.cues.append((T.HOSPITAL, "SWELL 12.33 (hospital revealed): strings G major, piano chord, timpani, cymbal breath, glock"))


# ============================================================== EXAM ROOM 14.7 - 19.43
def exam(b):
    strings(b, T.EXAM, 1.65, [43, 48, 51], 0.28, att=0.5, rel=0.3, bright=1200, vib=3)               # Cm/G
    strings(b, 16.3, 2.3, [43, 44, 48, 51], 0.28, att=0.4, rel=0.4, bright=1200, vib=3)               # Abmaj7/G (G-Ab rub)
    strings(b, 15.0, 1.4, [79], 0.1, att=0.8, rel=0.3, bright=5000, vib=0, voices=2)                  # thin high G5
    strings(b, 16.3, 2.15, [80], 0.1, att=0.3, rel=0.4, bright=5000, vib=0, voices=2)                 # -> Ab5
    for t, m1, m2 in [(15.25, 75, 74), (16.55, 68, 67), (17.95, 72, 71)]:                             # semitone sighs
        b.add("piano", I.piano(F(m1), 0.26, _r(), 1.4, damp=0.45), t, 0.15)
        b.add("piano", I.piano(F(m2), 0.21, _r(), 1.8), t + 0.36, 0.15)
    b.add("piano", I.piano(F(31), 0.22, _r(), 3.5), T.EXAM, -0.2)                                     # low G
    # 18.5 'without asking her': thins out to a single high D6 + a faint low G
    fade_tracks(b, 18.3, 18.62, ["strings", "piano"])
    strings(b, 18.45, 0.95, [86], 0.075, att=0.25, rel=0.1, bright=5500, vib=0, voices=2)
    strings(b, 18.45, 0.95, [43], 0.12, att=0.2, rel=0.1, bright=600, vib=0, voices=2)
    b.cues.append((T.EXAM, "EXAM ROOM (hushed): low strings Cm/G over a G pedal, thin high G5, piano semitone sighs Eb-D, Ab-G, C-B"))
    b.cues.append((16.3, "harmony slips to Abmaj7/G (G against Ab), high string G5 -> Ab5"))
    b.cues.append((T.WITHOUT_ASKING, "thins out on 'without asking her': only a faint high D6 and a low G remain"))


# ============================================================== GEY'S LAB 19.43 - 25.13
def lab(b):
    # curious pickup: pizz D4 G4 B4 (rising 'hmm?') on the 8ths before the bar
    for t, m in [(S1(-1.5), 62), (S1(-1), 67), (S1(-0.5), 71)]:
        b.add("pizz", I.pizz(F(m), 0.46, _r(), 0.5), t, 0.2)
        b.add("marimba", I.marimba(F(m + 12), 0.3, _r(), 0.6), t, -0.25)
    # dying: G - D/F# - Gm/F - A7/E, marimba dyads under a held D5, bass walking down chromatically on the beats
    for bt, (bass, dy) in enumerate([(43, (71, 74)), (42, (69, 74)), (41, (70, 74)), (40, (67, 73))]):
        t = S1(bt)
        b.add("pizz", I.pizz(F(bass), 0.62, _r(), 0.9), t, -0.15)
        for k, m in enumerate(dy):
            b.add("marimba", I.marimba(F(m), 0.44 - 0.04 * bt, _r(), 0.9), t + 0.01 * k, -0.2 + 0.4 * k)
    b.add("marimba", I.marimba(F(79), 0.28, _r(), 0.6), S1(0.5), 0.3)                  # one playful offbeat before the pops
    strings(b, S1(0), 2.4, [74], 0.12, att=0.3, rel=0.15, bright=3000, vib=4, voices=2)            # held D5
    for bt, m in enumerate([43, 42, 41, 40]):                                                        # cellos follow the bass
        strings(b, S1(bt), 0.6, [m + 12], 0.16, att=0.06, rel=0.08, bright=1200, vib=3, voices=2)
    b.cues.append((T.LAB, "GEY'S LAB (100 bpm): curious pizzicato + marimba pickup D-G-B"))
    b.cues.append((S1(0), "dying cells: G - D/F# - Gm/F - A7/E (bass walks down G-F#-F-E on the beats, pops sit on the 8ths)"))

    # 22.87 'Hers don't': bright D major, rising with the bloops (bloops on the 8ths, music on the beats)
    for bt, (bass, dy) in enumerate([(50, (74, 78)), (45, (78, 81)), (50, (81, 86))]):
        t = S2(bt)
        b.add("pizz", I.pizz(F(bass), 0.6, _r(), 0.8), t, -0.15)
        for k, m in enumerate(dy):
            b.add("marimba", I.marimba(F(m), 0.46, _r(), 0.9, mallet=0.7), t + 0.008 * k, -0.25 + 0.5 * k)
        b.add("glock", I.glock(F(dy[1] + 12), 0.2 + 0.04 * bt, _r(), 1.0), t, 0.3)
    strings(b, S2(0), 1.55, [50, 57, 66, 69], 0.22, att=0.05, rel=0.05, bright=2600, vib=6,
            swell=lambda t: np.interp(t, [0, 1.5], [0.8, 1.1]))
    gate(b, T.SURPRISE - 0.03, S2(3.5) - 0.02, ["marimba", "pizz", "glock", "strings"])            # stop-time for the sting
    b.cues.append((T.DIVIDING, "BRIGHTENS on 'Hers don't' (D major, 93.75 bpm): marimba + glock + pizz climb with the rising bloops"))
    b.cues.append((T.SURPRISE, "stop-time 24.40-25.09 for the surprised sting"))


def explain(b):
    # 25.11 wonder: celesta arpeggio 8ths, vibes, strings, pizz; ticks of the countdown are SFX on the same 8ths
    prog = [(4, 2, [43, 50, 54, 59], [74, 78, 83, 78], 43),   # Gmaj7
            (6, 2, [43, 52, 57, 61], [73, 76, 81, 76], 43),   # A/G
            (8, 1, [42, 52, 57, 61], [73, 78], 42),           # F#m7
            (9, 1, [35, 54, 57, 62], [74, 78], 35),           # Bm7 -> 28.63 shatter
            (10, 1, [40, 54, 55, 59, 66], [], 40),                # Em9 (held through the shatter)
            (10.5, 0.75, [33, 50, 52, 55], [], 33)]           # A7sus4 (into the death chord)
    b.add("celesta", I.celesta(F(69), 0.4, _r(), 1.0), S2(3.5), 0.2)          # pickup A5
    for i, (bt, d, ch, arp, bass) in enumerate(prog):
        t = S2(bt)
        dur = d * 0.64
        strings(b, t, dur + 0.04, ch, 0.24 if i < 4 else 0.2, att=0.25 if i == 0 else 0.1, rel=0.3, bright=2200, vib=6)
        b.add("pizz", I.pizz(F(bass), 0.5, _r(), 1.0), t, -0.15)
        if i < 4:
            b.add("vibes", I.vibes(F(ch[-1] + 12), 0.36, _r(), 1.8, damp=dur + 0.2), t, -0.3)
        for k, m in enumerate(arp):
            b.add("celesta", I.celesta(F(m), 0.42 if k == 0 else 0.34, _r(), 1.2), t + 0.32 * k, 0.25 - 0.15 * (k % 2))
    # after the shatter (the SFX sparkle owns it) everything ebbs out before her death
    cut_all(b, 29.18, 29.38)
    b.cues.append((S2(3.5), "WONDER (explanation): celesta arpeggios + vibes + strings, Gmaj7 - A/G - F#m7 - Bm7 (the tick bed shares the 8th grid)"))
    b.cues.append((T.SHATTER, "Em9 held through the hourglass shatter, A7sus4 ebbs out by 29.38"))


def death(b):
    piano_chord(b, 29.45, [38, 45, 50, 53], 0.27, 2.4, 0.03, -0.25)
    strings(b, 29.5, 1.35, [38, 45, 53], 0.13, att=0.6, rel=0.5, bright=900, vib=2, voices=2)
    b.cues.append((29.45, "NEAR SILENCE (her death): one soft low D minor chord, piano + faint low strings, gone by 31.3"))


# ============================================================== MONTAGE 31.4 - 42.3 (150 bpm, D major)
def montage(b):
    roots = [(31.4, 33), (M(0), 38), (M(1), 35), (M(2), 31), (M(3), 33), (M(4), 38), (M(5), 31), (M(6), 33)]
    root_at = lambda t: [r_[1] for r_ in roots if r_[0] <= t + 1e-6][-1]
    qs = [31.4 + 0.4 * k for k in range(27)]                       # quarters 31.4 ... 41.8
    pulse(b, [t for t in qs if t < M(4) - 1e-3], root_at, 0.5, 260, 520, step=0.4)
    pulse(b, [M(4) + 0.2 * k for k in range(8)], root_at, 0.55, 520, 800, frac=0.65, step=0.2)    # 8ths at the peak
    pulse(b, [t for t in qs if t >= M(5) - 1e-3], root_at, 0.48, 500, 400, step=0.4)
    for k in range(13):
        heart(b, M(0) + 0.8 * k, 0.5 + 0.015 * k)
    chords = [(31.4, 0.4, [45, 52, 62, 64], 0.2), (31.8, 0.42, [45, 52, 61, 64], 0.22),
              (M(0), 1.62, [38, 50, 57, 62, 66], 0.24), (M(1), 1.62, [35, 47, 54, 62, 66], 0.27),
              (M(2), 1.62, [31, 43, 55, 62, 67, 71], 0.3), (M(3), 1.62, [33, 45, 57, 64, 69, 73], 0.33),
              (M(4), 1.62, [26, 38, 50, 57, 62, 66, 69, 74, 78], 0.42), (M(5), 1.62, [31, 43, 55, 62, 67, 71], 0.3),
              (M(6), 0.52, [33, 45, 57, 61, 64, 69], 0.24)]
    for t, d, ms, v in chords:
        kw = dict(trem=0.6, trem_rate=13, swell=lambda tt_: np.interp(tt_, [0, 1.6], [0.7, 1.1])) if t == M(3) else {}
        strings(b, t, d, ms, v, att=0.08, rel=0.12, bright=2300 if t < M(4) else 2800, vib=6, **kw)
    # piano 8th ostinato from bar 1, rising in register
    osti = {0: [62, 69, 74, 69], 1: [62, 66, 71, 66], 2: [62, 67, 71, 67], 3: [64, 69, 73, 69], 4: [69, 74, 78, 74],
            5: [67, 71, 74, 71], 6: [64, 69]}
    for bar in range(1, 7):
        for k in range(8 if bar < 6 else 2):
            m = osti[bar][k % len(osti[bar])]
            b.add("piano", I.piano(F(m), (0.15 + 0.015 * bar) * (1.1 if k % 2 == 0 else 0.9), _r(), 0.8, damp=0.25), M(bar) + 0.2 * k, 0.2)
    # rising melody (violins), glock doubling from bar 2
    mel = [(1, 0, 3, 74), (1, 3, 1, 73), (2, 0, 2, 71), (2, 2, 1, 74), (2, 3, 1, 76), (3, 0, 2, 76), (3, 2, 1, 78), (3, 3, .5, 79),
           (3, 3.5, .5, 80), (4, 0, 1.5, 81), (4, 1.5, .5, 78), (4, 2, 2, 86), (5, 0, 2, 83), (5, 2, 1, 81), (5, 3, 1, 79), (6, 0, 1, 76)]
    for bar, bt, d, m in mel:
        t = M(bar, bt)
        b.add("violin", I.strings([F(m)], d * 0.4 * 0.95, 0.3 + 0.03 * bar, _r(), att=0.05, rel=0.2, bright=3800, voices=4, vib=9, spread=0.5), t)
        if bar >= 2 and d >= 1:
            b.add("glock", I.glock(F(m + 12), 0.16 + 0.02 * (bar == 4), _r(), 1.0), t, 0.3)
    for bar in (1, 2, 3, 5):                                         # pizz on the offbeats
        for bt in (1, 3):
            b.add("pizz", I.pizz(F(root_at(M(bar)) + 19), 0.4, _r(), 0.5), M(bar, bt), 0.25)
    # build into the ignition: timpani roll, reversed cymbal; PEAK 38.6: brass, timpani, cymbal, low hit
    timp_roll(b, M(3, 2), M(4) - 0.02, 33, 0.1, 0.5)
    b.add("cymbal", I.rev_cymbal(1.5, 0.24, _r()), M(4) - 1.5, 0.0)
    brass_chord(b, M(4), 1.6, [50, 57, 62, 66], 0.62, "horn", env=lambda t: np.interp(t, [0, 0.4, 1.6, 2.0], [0.85, 1.0, 0.95, 0.9]))
    for bt, d, m in [(0, 1.5, 81), (1.5, .5, 78), (2, 2, 86)]:
        brass_chord(b, M(4, bt), d * 0.4 * 0.94, [m - 12, m], 0.45, "trumpet", scoop=-8)
    brass_chord(b, M(4), 1.5, [26, 38], 0.6, "tuba")
    b.add("timpani", I.timpani(F(38), 0.85, _r()), M(4), -0.1)
    b.add("timpani", I.timpani(F(38), 0.6, _r()), M(4, 1), -0.1)
    b.add("cymbal", I.cymbal(0.26, _r(), dur=2.4), M(4), 0.0)
    b.add("hit", I.cine_hit(0.42, _r(), F(26), 2.0, 0.4, 0.8), M(4))
    brass_chord(b, M(5), 1.5, [55, 59, 62], 0.38, "horn", env=lambda t: np.interp(t, [0, 1.5, 2], [0.9, 0.55, 0.4]))
    # paper tower: marimba 8ths, then a celesta/glock cascade down with the 41.2 avalanche
    for k in range(4):
        b.add("marimba", I.marimba(F([79, 74, 71, 74][k]), 0.32, _r(), 0.6), M(5) + 0.2 * k, -0.3)
    for k, m in enumerate([98, 95, 91, 86, 83, 79, 74]):
        b.add("celesta", I.celesta(F(m), 0.3 - 0.02 * k, _r(), 1.0), T.AVALANCHE + 0.07 * k, 0.4 - 0.12 * k)
    fade_tracks(b, 42.12, 42.27, ["pulse", "piano", "pizz", "violin", "glock", "marimba"])
    b.cues.append((31.4, "MONTAGE (150 bpm, D major): pulse starts on 'Her cells keep going' (Asus4 - A pickup), heartbeat every half bar"))
    b.cues.append((M(1), "piano 8th ostinato + violin line rising D | Bm | G | A, chords climbing in register"))
    b.cues.append((M(3), "build: string tremolo crescendo, timpani roll, reversed cymbal into the ignition"))
    b.cues.append((M(4), "PEAK 38.6 (ignition): horns + trumpets A-F#-D6 (on the 39.0 liftoff), tuba, timpani, cymbal, low hit, pulse in 8ths"))
    b.cues.append((M(5), "40.2 paper tower: G, marimba, horns ease; celesta cascade down with the 41.2 paper avalanche"))


def swell_and_low(b):
    t0 = T.PROTECTED
    sw = lambda t: np.interp(t, [0, 1.0, 1.6, 1.95], [0.65, 1.0, 0.8, 0.0])
    strings(b, t0, 1.95, [38, 45, 50, 54, 57, 62, 66], 0.34, att=0.25, rel=0.05, bright=2200, vib=7, swell=sw)
    brass_chord(b, t0 + 0.1, 1.85, [57, 62, 66], 0.34, "soft", env=lambda t: sw(t + 0.1))
    piano_chord(b, t0, [38, 45, 50, 54, 57], 0.3, 2.0, 0.025, -0.3, damp=1.85)
    for t, d, m in [(t0, 0.85, 78), (t0 + 0.9, 0.4, 79), (t0 + 1.3, 0.65, 81)]:
        b.add("violin", I.strings([F(m)], d, 0.32, _r(), att=0.12, rel=0.15, bright=3800, voices=4, vib=9, spread=0.5) *
              sw(t - t0 + np.arange(ns(d + 0.15)) / SR)[None, :], t)
    b.add("celesta", I.celesta(F(90), 0.3, _r(), 1.2), t0 + 0.02, 0.3)
    cut_all(b, 44.05, 44.25)
    b.add("piano", I.piano(F(38), 0.36, _r(), 2.8), T.UNLUCKILY, -0.1)        # the single low note (D2)
    b.cues.append((t0, "WARM SWELL (millions protected): D major strings + soft horns + piano, violin F#-G-A; gone by 44.25"))
    b.cues.append((T.UNLUCKILY, "44.27 'Unluckily': a single low piano D2, very quiet, nothing else until 46.0"))


def sober_relief(b):
    chords = [(46.0, [38, 50, 53, 57], [38, 45]), (47.3, [38, 50, 53, 58], [38, 46]), (48.6, [38, 50, 55, 58], [38, 43]),
              (49.9, [37, 49, 52, 57], [37, 45])]
    for i, (t, ms, low) in enumerate(chords):
        piano_chord(b, t, ms, 0.25, 2.2, 0.03, -0.25, damp=1.6)
        strings(b, t, 1.32, low, 0.17, att=0.35, rel=0.3, bright=1000, vib=3, voices=2)
    for t, m in [(46.05, 77), (47.3, 76), (48.6, 74), (49.9, 73)]:          # lone violin F - E - D - C#
        b.add("violin", I.strings([F(m)], 1.25, 0.2, _r(), att=0.3, rel=0.35, bright=3500, voices=2, vib=11, spread=0.2), t)
    b.cues.append((46.0, "SOBER (D minor, slow): piano Dm - Bb/D - Gm/D - A/C#, low strings, lone violin F-E-D-C#"))
    # relief: Bb - C - D (52.83 'they finally settle')
    rel_ch = [(51.3, 0.7, [34, 46, 53, 58, 62], 74, 0.2), (52.0, 0.83, [36, 48, 55, 60, 64], 76, 0.22),
              (T.SETTLE, 1.05, [38, 50, 57, 62, 66], 78, 0.26), (53.88, 0.85, [38, 50, 55, 59, 62], 78, 0.22)]
    for i, (t, d, ms, top, v) in enumerate(rel_ch):
        strings(b, t, d + 0.03, ms, v, att=0.4 if i == 0 else 0.15, rel=0.35, bright=2000, vib=6)
        piano_chord(b, t, ms[1:], 0.22, 1.8, 0.03, -0.25, damp=d + 0.2)
        b.add("violin", I.strings([F(top)], d, 0.2, _r(), att=0.2, rel=0.3, bright=3600, voices=2, vib=11, spread=0.2), t)
    brass_chord(b, T.SETTLE + 0.05, 1.0, [57, 62, 66], 0.26, "soft")
    for k, m in enumerate([86, 90, 93]):
        b.add("celesta", I.celesta(F(m), 0.3, _r(), 1.4), T.SETTLE + 0.12 * k, 0.2 - 0.2 * k)
    b.cues.append((51.2, "RELIEF: Bb - C - D, violin D-E-F# (minor turns major)"))
    b.cues.append((T.SETTLE, "soft hopeful D major chord on 'settle' 52.83: strings, piano, soft horns, celesta D-F#-A; G/D 53.88"))


def ending(b):
    # 54.7: Dsus2 pad, the pulse + heartbeat return; motif in D major from the 55.66 pickup; final chord on 'name'
    strings(b, T.MODERN, 1.15, [50, 57, 62, 64], 0.22, att=0.6, rel=0.2, bright=1800, vib=5)
    qs = [E(0, k) for k in range(-2, 8)]
    roots = lambda t: 38 if t < E(0, 2) - 1e-3 else (35 if t < E(1) - 1e-3 else (31 if t < E(1, 2) - 1e-3 else 33))
    pulse(b, qs, roots, 0.46, 260, 600)
    for t in [E(0, -2), E(0), E(0, 2), E(1), E(1, 2)]:
        heart(b, t, 0.5)
    b.add("bell", I.chime_bell(F(69), 0.62, _r(), 2.6), E(0) - 0.17, 0.1)
    b.add("piano", I.piano(F(69), 0.38, _r(), 1.2, damp=0.3), E(0) - 0.17, 0.05)
    for (bt, d, m) in MOTIF_MAJOR:
        v = 0.62 if bt in (0, 4) else 0.52
        b.add("bell", I.chime_bell(F(m), v, _r(), 2.6, bright=0.6), E(0, bt), (m - 74) / 16)
        b.add("piano", I.piano(F(m), v * 0.6, _r(), 1.8, damp=d * HQ + 0.25), E(0, bt), 0.05)
        b.add("piano", I.piano(F(m - 12), v * 0.35, _r(), 1.8, damp=d * HQ + 0.25), E(0, bt), -0.05)
    harm = [(E(0), 2, [38, 50, 57, 62, 66]), (E(0, 2), 2, [35, 47, 54, 57, 62]), (E(1), 2, [31, 43, 55, 59, 62, 67]),
            (E(1, 2), 2, [33, 45, 52, 55, 61, 64])]
    for i, (t, d, ms) in enumerate(harm):
        strings(b, t, d * HQ + 0.04, ms, 0.27 + 0.02 * i, att=0.12, rel=0.12, bright=2200, vib=7)
        b.add("celesta", I.celesta(F(ms[-1] + 12), 0.26, _r(), 1.2), t, 0.35)
    # the final chord blooms on 'name' (59.23): D(add9) strings swelling, rolled piano, bell D5/A5, horns, celesta arpeggio
    tN = T.NAME
    strings(b, tN, T.DUR - tN, [38, 45, 50, 54, 57, 62, 64, 66, 69, 74], 0.26, att=0.3, rel=0.05, bright=2200, vib=7,
            swell=lambda t: np.interp(t, [0, 0.45, 0.65, 0.97], [0.45, 0.55, 1.0, 1.05]))
    piano_chord(b, tN, [26, 38, 45, 50, 54, 57, 64], 0.2, 2.0, 0.035, -0.35)
    b.add("bell", I.chime_bell(F(74), 0.4, _r(), 2.0), tN, 0.0)
    b.add("bell", I.chime_bell(F(81), 0.24, _r(), 2.0, bright=0.5), tN + 0.03, 0.25)
    brass_chord(b, tN + 0.05, T.DUR - tN, [50, 57, 62, 66], 0.26, "soft", env=lambda t: np.interp(t, [0, 0.5, 0.9], [0.5, 0.8, 1.0]))
    b.add("cymbal", I.cymbal(0.07, _r(), dur=1.0, bright=0.5), tN, 0.0)
    heart(b, tN, 0.45)
    b.add("pulse", I.synth_bass(F(26), 0.9, 0.42, _r(), cutoff=300, env_amt=1.0), tN)
    for k, m in enumerate([86, 90, 93, 98]):
        b.add("celesta", I.celesta(F(m), 0.3 - 0.03 * k, _r(), 1.0), tN + 0.12 + 0.11 * k, -0.3 + 0.2 * k)
    b.cues.append((T.MODERN, "RETURN: Dsus2 pad, soft pulse + heartbeat back (modern lab)"))
    b.cues.append((E(0) - 0.17, "the hook motif in D major, chime bell + piano: (A) F#-E-D-A | G-F#-E-C#, D - Bm7 - G - A7"))
    b.cues.append((tN, "FINAL CHORD on 'name' 59.23: D(add9) strings swell, rolled piano, bell D5/A5, soft horns, celesta up; "
                       "tail to 60.2, faded over the last 0.3 s"))


TARGET = {  # relative balance inside the band (LU vs ref, each track's own integrated loudness while it plays)
    "bell": -4.0, "piano": -5.5, "guitar": -4.5, "strings": -5.0, "violin": -7.5, "pulse": -8.0, "heart": -11.0, "marimba": -7.0,
    "celesta": -11.0, "glock": -14.0, "vibes": -12.0, "pizz": -8.5, "brass": -6.0, "timpani": -10.0, "cymbal": -15.0, "hit": -7.0,
    "brush": -19.0,
}
GAINS = {}   # optional frozen per-track gains (dB); empty = computed from TARGET


def render(b, ref=-20.0):
    hall = make_ir(1.8, 11, pre=0.02, hf=1.4)
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(GAINS[k]) if k in GAINS else dbg(ref + TARGET.get(k, -8) - L)
        levels[k] = (round(L, 1), round(20 * np.log10(g), 2))
        x = x * g
        b.tr[k] = x
        dry += x
        wet += b.send[k] * x
    out = dry + 0.75 * convolve_st(wet, hall)
    out = hp(out, 30, 2)
    a = ns(T.DUR - 0.3)
    out[:, a:] *= np.linspace(1, 0, N - a)[None, :] ** 1.5
    return out, levels
