# Procedural underscore for the ocean shorts: a quirky documentary groove that changes mode per section.
# Modes: mystery (pad + low pizz ostinato + ticks, minor), tension (8th-note pizz + timpani), chase (driving snare
# + bass), quirky (bouncy pizz + glock, major), triumph (brass stabs + cymbal), calm (pad + music box), stop (silence).
import numpy as np
from dsp import SR, ns, rng, lp, hp, bp, fades, make_ir, convolve_st, st, pan
import instruments as I

m2f = I.m2f


def kick(vel=0.8):
    t = np.arange(ns(0.35)) / SR
    y = np.sin(2 * np.pi * np.cumsum(50 * (1 + 2.5 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.12)
    return y * vel


def shaker(r, vel=0.3):
    t = np.arange(ns(0.08)) / SR
    return hp(r.standard_normal(len(t)), 5000) * np.exp(-t / 0.018) * vel


CHORDS = {
    "minor": [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],      # Am F G E
    "major": [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]],      # C F G C
    "sneaky": [[57, 60, 64], [57, 60, 64], [58, 62, 65], [56, 59, 64]],     # Am Am Bb E (chromatic creep)
}


def render(duration, sections, bpm=104, seed=7, key_shift=0):
    """sections: list of (t_start, mode, chord_set). Returns stereo (2, n) at SR."""
    r = rng(seed)
    n = ns(duration + 2.0)
    out = np.zeros((2, n))
    beat = 60.0 / bpm

    def add(x, t, p=0.0, g=1.0):
        a = ns(t)
        if a >= n:
            return
        s = pan(x, p) if x.ndim == 1 else x
        b = min(n, a + s.shape[1])
        out[:, a:b] += s[:, :b - a] * g

    def mode_at(t):
        cur = sections[0]
        for s in sections:
            if t >= s[0]:
                cur = s
        return cur

    nb = int(duration / beat) + 2
    for b in range(nb):
        t0 = b * beat
        if t0 > duration:
            break
        _, mode, cs = mode_at(t0)
        if mode == "stop":
            continue
        bar, pos = divmod(b, 4)
        chord = [m + key_shift for m in CHORDS[cs][bar % 4]]
        root = chord[0] - 12
        if mode == "mystery":
            if pos == 0:
                add(I.pad([m2f(m) for m in chord], beat * 4, 0.35, r, att=0.8, rel=1.0, warm=700), t0, 0, 0.5)
            for k in range(2):
                add(I.pluck(m2f(root - 12 + (7 if (b + k) % 3 == 2 else 0)), 0.55, r, 0.6, 0.3), t0 + k * beat / 2, -0.2, 0.7)
            add(shaker(r, 0.15), t0 + beat / 2, 0.4)
            if pos == 3 and bar % 2:
                add(I.vibes(m2f(chord[2] + 12), 0.35, r, 1.2), t0 + beat / 2, 0.3, 0.5)
        elif mode == "tension":
            for k in range(2):
                add(I.pluck(m2f(root - 12 + (1 if k else 0)), 0.65, r, 0.4, 0.4), t0 + k * beat / 2, -0.2, 0.8)
            add(I.pluck(m2f(chord[1]), 0.4, r, 0.3, 0.5), t0 + beat / 2, 0.3, 0.5)
            if pos == 0:
                add(I.timpani(m2f(root - 12), 0.6, r, 1.5), t0, 0, 0.7)
            add(shaker(r, 0.2), t0 + beat / 4, 0.4); add(shaker(r, 0.25), t0 + 3 * beat / 4, -0.4)
        elif mode == "chase":
            add(kick(0.8), t0, 0, 0.9)
            if pos in (1, 3):
                add(I.snare(0.6, r, 0.25), t0, 0.1, 0.55)
            for k in range(2):
                add(I.pluck(m2f(root - 12 + (12 if k else 0)), 0.7, r, 0.3, 0.5), t0 + k * beat / 2, -0.15, 0.85)
            add(I.brass(m2f(chord[2]), beat * 0.4, 0.5, r, "stab"), t0 + beat / 2, 0.25, 0.25)
            add(shaker(r, 0.25), t0 + beat / 4, 0.4); add(shaker(r, 0.3), t0 + 3 * beat / 4, -0.4)
        elif mode == "quirky":
            add(I.pluck(m2f(root - 12 if pos % 2 == 0 else root - 5), 0.7, r, 0.45, 0.35), t0, -0.25, 0.85)
            add(I.pluck(m2f(chord[1]), 0.45, r, 0.25, 0.55), t0 + beat / 2, 0.2, 0.45)
            add(I.pluck(m2f(chord[2]), 0.45, r, 0.25, 0.55), t0 + beat / 2, 0.3, 0.4)
            if pos == 0 or pos == 2:
                add(kick(0.5), t0, 0, 0.6)
            add(shaker(r, 0.18), t0 + beat / 2, 0.4)
            mel = [0, 2, 4, 7, 4, 2, 0, -1][(b + bar) % 8]
            if (b % 2 == 0) and r.random() < 0.8:
                add(I.glock(m2f(chord[0] + 12 + mel), 0.4, r, 1.0), t0, 0.35, 0.35)
        elif mode == "triumph":
            add(kick(0.8), t0, 0, 0.9)
            if pos == 0:
                add(I.cymbal(0.5, r, 2.0), t0, 0.3, 0.3)
            for m in chord:
                add(I.brass(m2f(m), beat * 0.8, 0.55, r, "horn"), t0, 0.1 * (m % 3 - 1), 0.25)
            add(I.brass(m2f(root - 12), beat * 0.9, 0.6, r, "tuba"), t0, -0.1, 0.5)
            add(I.glock(m2f(chord[2] + 24), 0.4, r, 1.0), t0 + beat / 2, 0.4, 0.3)
        elif mode == "calm":
            if pos == 0:
                add(I.pad([m2f(m) for m in chord], beat * 4, 0.3, r, att=0.6, rel=1.0, warm=900), t0, 0, 0.5)
            add(I.musicbox(m2f(chord[pos % 3] + 12), 0.4, r, 1.2), t0, 0.3 * (pos % 2 * 2 - 1), 0.4)
    ir = make_ir(1.4, seed, hf=0.7)
    wet = convolve_st(out, ir)[:, :n]
    y = out * 0.85 + wet * 0.25
    return y[:, :ns(duration)]
