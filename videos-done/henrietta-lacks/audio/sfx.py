# Every sound effect + ambience bed of the Henrietta Lacks short as a cue list timed to the picture (timeline.py),
# rendered into one stereo SFX stem. Levels follow the same standard as the Haber mix: each EVENT has a "naive" level
# (LU relative to the voice stem, measured as the event's max momentary loudness) and is placed SFX_DB = -6 dB under it;
# ambience BEDS (integrated loudness) keep their level. No samples and no vocal sounds of any kind (no crowd voices,
# laughter or coughs). Tonal SFX (bloops, pops, chimes, beeps) are tuned to the score's key at that moment.
import zlib
import numpy as np
from dsp import (SR, ns, rng, dbg, lp, hp, peq, pan, st, place, fades, widen, make_ir, convolve_st, momentary_max, integrated)
import sfx_gen as G
import instruments as I
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, space="out",
                 group=None, cut=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send, self.cut, self.space = kind, p, extra, lpf, send, cut, space
        self.group = group or name
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None


def _bed(fn, dur, fin=0.05, fout=0.06, env=None):
    """bed generator: fn(dur, r) -> stereo, faded; optional env(t) automation"""
    def g(r):
        x = st(fn(dur, r))
        if env is not None:
            x = x * env(np.arange(x.shape[1]) / SR)[None, :]
        return fades(x, fin, fout), 0.0
    return g


def _farm(dur, r, birds=0.5, wind_lvl=1.0, bright=800):
    x = G.wind(dur, r, wind_lvl, 0.18, bright)
    x = x / (np.std(x) + 1e-9)
    if birds > 0:
        x += pan(G.bird_chirps(dur + 1.2, r, birds, "sparrow")[: ns(dur)] * 0.35, 0.5)
        x += pan(G.bird_chirps(dur + 1.2, r, birds * 0.6, "blackbird")[: ns(dur)] * 0.22, -0.55)
    return x


def _tuned_twinkle(dur, r, notes, rate=9.0, env=None):
    """gentle twinkle cloud whose pings are tuned to `notes` (midi)"""
    out = np.zeros((2, ns(dur + 0.8)))
    tm = r.uniform(0, 0.05)
    while tm < dur:
        a = 1.0 if env is None else env(tm)
        m = notes[int(r.integers(len(notes)))]
        place(out, pan(G.ping(r, I.m2f(m), r.uniform(0.15, 0.35), 0.25, 0.8) * a * r.uniform(0.4, 1.0), r.uniform(-0.8, 0.8)), tm)
        tm += r.exponential(1 / rate)
    return out


def cues():
    C = []
    add = C.append
    E = lambda t, name, desc, fn, naive, **k: add(Cue(t, name, desc, fn, naive, **k))
    Bd = lambda t, name, desc, fn, naive, **k: add(Cue(t, name, desc, fn, naive, kind="bed", send=k.pop("send", 0.0), **k))

    # ------------------------------------------------ 0 - 4.9 hook: farm -> microscope (1.87) -> space (3.57) -> flash (4.90)
    Bd(0.0, "amb_hook_farm", "farm ambience: soft wind + birds (hook)", _bed(lambda d, r: _farm(d, r, 0.9, 1.0), 1.93, 0.0, 0.08), -20)
    E(T.CUT_MICRO, "micro_whoosh", "soft microscope whoosh into the cell bed",
      lambda r: (G.whoosh(0.95, r, 0.28, 300, 2600, 0.8, 0.22, 0.12), 0.25), -3, send=0.12, space="room")
    Bd(T.CUT_MICRO, "cell_bed", "bubbly cell bed under the microscope (1.87-3.57)", _bed(lambda d, r: G.cell_bed(d, r), 1.74, 0.12, 0.08), -19,
       space="room", send=0.05)
    for k, (tm, f) in enumerate(zip(T.HOOK_BLOOPS, [293.7, 349.2, 440.0])):
        E(tm, "hook_bloop", f"cell division bloop {k + 1}/3 (D4, F4, A4)", (lambda r, f=f: (G.bloop(r, f), 0.0)), -2,
          p=[-0.3, 0.25, 0.0][k], send=0.15, space="room", group="hook_bloops")
    Bd(T.CUT_SPACE - 0.02, "space_hum", "space: deep soft hum + dark air (3.57-4.9)", _bed(lambda d, r: G.space_hum(d, r), 1.36, 0.12, 0.05), -20)
    E(T.CUT_SPACE, "sat_beeps", "gentle satellite beep pattern (D6) until 4.9", lambda r: (fades(G.sat_beeps(1.31, r), 0.0, 0.05), 0.0), -10,
      p=0.35, send=0.3)
    E(T.FLASH[0], "flash", "flash whoosh: short airy swell peaking on the white flash 4.90, shimmer, soft low bloom (speech band carved)",
      lambda r: (lambda y: (peq(y[0], 2000, -6.0, 0.6), y[1]))(G.flash_soft(r)), -8, send=0.15)

    # ------------------------------------------------ 5.03 - 10.93 farm
    Bd(4.98, "amb_farm", "farm: birds, light breeze", _bed(lambda d, r: _farm(d, r, 0.8, 0.9), 5.99, 0.15, 0.08), -18)
    for k, tm in enumerate([6.45, 8.95]):
        E(tm, "porch_creak", "porch creak", (lambda r: (G.porch_creak(r), 0.0)), -7, p=-0.35 + 0.2 * k, send=0.1, group="porch")

    # ------------------------------------------------ 10.93 - 14.7 1951 city street
    Bd(10.9, "street_1951", "1951 city street: distant traffic rumble, a few far cars", _bed(lambda d, r: G.traffic(d, r, 3), 3.83, 0.05, 0.1), -18)
    for k, tm in enumerate([10.95, 11.41, 11.87, 12.28]):
        E(tm, "cobble_step", "footsteps on cobbles (10.93-12.3)", (lambda r, k=k: (G.cobble_step(r, 1.0 if k % 2 else 0.85), 0.0)), -6,
          p=0.15 + 0.1 * (k % 2), send=0.15, group="cobbles")

    # ------------------------------------------------ 14.7 - 19.43 exam room
    Bd(14.68, "exam_tone", "exam room: quiet room tone (60 Hz hum, air)", _bed(lambda d, r: G.room_tone(d, r, 60, 0.05, 2000), 4.77, 0.05, 0.06),
       -27, space="room")
    Bd(15.0, "clock_tick", "wall-clock tick (1 per second)", _bed(lambda d, r: G.clock_ticks(d, r, 1.0), 4.4, 0.0, 0.05), -23, p=-0.35,
       space="room", send=0.2)
    E(T.SAMPLE, "metal_clink", "tiny metal instrument clink (sample taken)", lambda r: (G.clink(r, 5200, 0.2), 0.0), -6, p=0.2, space="room",
      send=0.2)
    E(T.SAMPLE + 0.09, "tube_clink", "glass sample tube clink", lambda r: (G.glass_clink(r, 4600), 0.0), -6, p=0.25, space="room", send=0.2)

    # ------------------------------------------------ 19.43 - 25.13 Gey's lab: whir, dying cells, dividing cells, sting
    Bd(T.LAB - 0.02, "lab_hum", "1951 lab hum (60 Hz) + air", _bed(lambda d, r: G.room_tone(d, r, 60, 0.12, 2200), 1.44, 0.05, 0.25), -24, space="room")
    Bd(T.LAB, "roller_whir", "slow motor whir of the roller drum (19.43-20.83)", _bed(lambda d, r: G.motor_whir(d, r), 1.42, 0.15, 0.25), -19,
       space="room", send=0.05)
    Bd(T.DYING - 0.05, "cell_bed_view", "faint cell bed under the dying / dividing cells (20.83-24.43)",
       _bed(lambda d, r: G.cell_bed(d, r, 6.0), 3.65, 0.2, 0.15), -27, space="room")
    for k, (tm, f) in enumerate(zip(T.POPS, [440.0, 392.0, 349.2, 329.6, 277.2])):
        E(tm, "bwomp", f"dying-cell 'bwomp' pop {k + 1}/5, descending (A4 G4 F4 E4 C#4), each softer", (lambda r, f=f: (G.bwomp(r, f), 0.0)), -3,
          extra=-1.5 * k, p=[0.25, -0.2, 0.15, -0.25, 0.05][k], space="room", send=0.12, group="bwomps")
    for k, (tm, f) in enumerate(zip(T.RISE_BLOOPS, [293.7, 329.6, 370.0, 440.0, 493.9])):
        E(tm, "rise_bloop", f"dividing-cell bloop {k + 1}/5, each higher (D4 E4 F#4 A4 B4)", (lambda r, f=f: (G.bloop(r, f, up=0.6, bright=0.7), 0.0)), -2,
          extra=[-2.0, 0.0, 0.3, 0.6, 0.9][k], p=-0.3 + 0.15 * k, space="room", send=0.15, group="rise_bloops")
    E(T.SURPRISE, "surprise_sting", "short surprised sting: upward 'bwip' + two bright pings (D6/A6)", lambda r: (G.surprise_sting(r), 0.0), -9,
      send=0.15, space="room")

    # ------------------------------------------------ 25.13 - 29.4 explanation
    Bd(T.EXPLAIN, "hourglass_ticks", "hourglass / countdown tick bed (8ths, 0.32 s, as the music) + fine sand trickle (stops at the shatter)",
       _bed(lambda d, r: G.hourglass_bed(d, r, 0.32), T.SHATTER - T.EXPLAIN - 0.12, 0.01, 0.03), -20, space="room", send=0.08)
    E(T.VIRUS_ZIP, "virus_zip", "cartoon zip: the virus flies in", lambda r: (peq(G.cartoon_zip(r), 1800, -4.0, 0.8), 0.08), -5, send=0.12, space="room")
    E(T.SHATTER, "glass_shatter", "glass shatter: the hourglass breaks (crack, shard cascade, sand)", lambda r: (peq(G.glass_shatter(r), 2000, -5.0, 0.7), 0.0), -4,
      send=0.18, space="room")
    E(T.SHATTER + 0.12, "shatter_sparkle", "sparkle after the shatter", lambda r: (G.sparkle(0.7, r, 22, 3500, 9000,
      lambda t: np.exp(-t / 0.3), 0.85), 0.0), -7, send=0.25, space="room")
    E(T.HAPPY_BLOOP, "happy_bloop", "happy bloop (E5) + tiny ping", lambda r: (G.bloop(r, 659.3, 0.45, 0.7, False, 0.6) +
      0.25 * G.ping(r, 3520.0, 0.2, 0.2, 0.45), 0.0), -8, p=0.1, send=0.15, space="room")

    # ------------------------------------------------ 29.4 - 31.37 October dusk (very soft, nothing else)
    Bd(T.DEATH[0] - 0.02, "dusk_wind", "October dusk: soft wind", _bed(lambda d, r: G.wind(d, r, 1.0, 0.2, 650), 2.02, 0.25, 0.1), -29)
    Bd(T.DEATH[0], "dusk_leaves", "rustling leaves (gusty, very soft)", _bed(lambda d, r: G.leaves(d, r, 0.3, 120), 2.0, 0.3, 0.1), -30)

    # ------------------------------------------------ 31.37 - 42.3 montage
    Bd(T.ROLLER, "roller_bed", "roller drum whirring with glass tubes clinking (31.37-32.6)", _bed(lambda d, r: G.roller_bed(d, r, 4.0), 1.25, 0.08, 0.2),
       -19, space="room", send=0.08)
    E(T.NAMED, "hela_chime", "sparkle chime: the cells are named HeLa (D major, A6-D8)", lambda r: (G.chime_burst(r, (93, 98, 102, 105, 110), 1.4), 0.0),
      -5, send=0.25, space="room")
    Bd(T.NAMED, "lab_tone_named", "lab tone", _bed(lambda d, r: G.room_tone(d, r, 60, 0.08, 2000), T.TOWN - T.NAMED + 0.03, 0.1, 0.05), -27,
       space="room")
    steps = [33.78, 34.28, 34.78]
    Bd(T.TOWN - 0.02, "town_street", "town street: light distant traffic", _bed(lambda d, r: G.traffic(d, r, 1), 1.56, 0.05, 0.05), -22)
    for k, tm in enumerate(steps):
        E(tm, "town_step", "footstep (2 per second)", (lambda r, k=k: (lp(G.cobble_step(r, 0.9 if k % 2 else 1.0), 2500, 1), 0.0)), -5,
          extra=-3.0 if k == 2 else 0.0, p=-0.1 + 0.1 * k, send=0.12, group="town_steps")
    E(steps[0], "crate_rattle", "glass tubes rattling in a carried crate (with every step)",
      lambda r: (G.crate_rattle(1.5, r, steps, steps[0]), 0.0), -6, p=0.1, send=0.12)
    Bd(T.CLINIC - 0.02, "clinic_tone", "vaccine clinic: room tone", _bed(lambda d, r: G.room_tone(d, r, 60, 0.05, 2400), 1.56, 0.05, 0.05), -27,
       space="room")
    E(T.PINCH, "pinch_pop", "tiny 'pinch' pop (vaccine)", lambda r: (G.pinch_pop(r), 0.0), -4, p=0.15, space="room", send=0.12)
    E(T.PINCH + 0.1, "bright_chime", "bright little chime after the pinch (G7 B7 D8)", lambda r: (G.little_chime(r), 0.0), -4, space="room", send=0.22)
    Bd(T.FOCUS - 0.02, "lab_tone_dna", "lab tone", _bed(lambda d, r: G.room_tone(d, r, 60, 0.08, 2000), T.ROCKET - T.FOCUS + 0.04, 0.05, 0.05), -27,
       space="room")
    E(T.FOCUS, "focus_click", "microscope focus click", lambda r: (G.focus_click(r), 0.0), -3, p=-0.15, space="room", send=0.12)
    E(T.DNA, "dna_twinkle", "DNA twinkle: pings spiralling up (A major, A6-E8)", lambda r: (G.dna_twinkle(r), 0.0), -4, space="room", send=0.25)
    Bd(T.ROCKET - 0.02, "launchpad", "launch pad: venting hiss + wind before ignition", _bed(lambda d, r: G.hiss(d, r, 4500, 11000, 0.3, 2.0) +
       0.6 * G.wind(d, r, 1.0, 0.2, 600), 0.4, 0.1, 0.1), -33)
    E(T.IGNITION, "ignition", "rocket ignition: sputtering crackle + low rumble catching", lambda r: (peq(fades(G.ignition(r, 0.55), 0.005, 0.12), 2200, -6.0, 0.6), 0.0),
      -4, send=0.12)
    E(T.LIFTOFF, "liftoff_roar", "HUGE liftoff roar, swelling, to 40.17", lambda r: (peq(fades(G.liftoff_roar(T.ROCKET_END - T.LIFTOFF, r, 0.9), 0.06, 0.12), 2200, -7.0, 0.6), 0.0),
      -3, send=0.15)
    Bd(T.PAPERS, "paper_bed", "paper tower: sheets shuffling (40.17-42.3)", _bed(lambda d, r: G.paper_rustle(d, r, 3.0), 2.13, 0.15, 0.1), -21,
       space="room", send=0.05)
    E(T.AVALANCHE, "paper_avalanche", "avalanche of falling paper: rush of sheets + stack thuds", lambda r: (peq(G.paper_avalanche(r), 2500, -4.0, 0.7), 0.0), -6,
      space="room", send=0.15)

    # ------------------------------------------------ 42.3 - 46.0 warm outdoor, then near silence
    Bd(T.PROTECTED - 0.02, "amb_warm", "warm outdoor bed: soft air, birds (no voices)", _bed(lambda d, r: _farm(d, r, 0.9, 0.7, 900), 1.99, 0.15, 0.12),
       -20)
    Bd(T.UNLUCKILY, "night_breeze", "near silence: a faint night breeze", _bed(lambda d, r: G.wind(d, r, 1.0, 0.15, 450), 1.75, 0.2, 0.15), -33)

    # ------------------------------------------------ 46.0 - 51.2 family porch
    Bd(T.PORCH - 0.02, "porch_air", "family porch: soft breeze, far birds", _bed(lambda d, r: _farm(d, r, 0.35, 0.8, 700), 5.24, 0.2, 0.1), -23)
    E(T.LETTER, "letter_rustle", "paper letter rustle", lambda r: (G.letter_rustle(r), 0.0), -7, p=0.15, send=0.08)
    E(T.LETTER_STING, "soft_shock", "soft shock sting: airy swell into a soft low thump + glassy A/Bb shimmer", lambda r: G.soft_shock(r), -8,
      send=0.2)
    Bd(T.DECADES, "slow_clock", "slow clock ticks (decades passing) to 51.2", _bed(lambda d, r: G.clock_ticks(d, r, 1 / 0.7), T.COURT - T.DECADES, 0.0, 0.1),
       -22, p=0.25, send=0.25)
    Bd(T.DECADES, "decades_wind", "wind rising (decades passing)", _bed(lambda d, r: G.wind(d, r, 1.0, 0.3, 800, 0.25, 350, 800), T.COURT - T.DECADES + 0.05,
       0.6, 0.2, lambda t: np.interp(t, [0, 1.4, 1.8], [0.6, 1.0, 0.8])), -24)

    # ------------------------------------------------ 51.2 - 54.7 courthouse steps (city outdoors)
    Bd(T.COURT - 0.02, "city_bed", "city outdoors (2023): light traffic wash", _bed(lambda d, r: G.city_bed(d, r), 3.54, 0.25, 0.1), -22)
    Bd(T.COURT - 0.02, "city_birds", "birds at the courthouse steps", _bed(lambda d, r: _farm(d, r, 1.0, 0.3, 900), 3.54, 0.25, 0.1), -23)

    # ------------------------------------------------ 54.7 - 60.2 modern lab, cells, golden evening
    Bd(T.MODERN - 0.02, "modern_lab", "modern lab hum (fans, 60 Hz)", _bed(lambda d, r: G.room_tone(d, r, 60, 0.1, 2600), T.CELLS2 - T.MODERN + 0.05, 0.12, 0.15),
       -24, space="room")
    E(T.MODERN + 0.2, "micro_click", "microscope click", lambda r: (G.focus_click(r), 0.0), -6, p=0.15, space="room", send=0.12)
    Bd(T.CELLS2 - 0.02, "cell_bed_end", "faint cell bed", _bed(lambda d, r: G.cell_bed(d, r, 5.0), T.GOLDEN - T.CELLS2 + 0.05, 0.2, 0.2), -26, space="room")
    for k, (tm, f) in enumerate([(56.35, 440.0), (56.8, 370.0), (57.25, 587.3), (57.65, 493.9)]):
        E(tm, "end_bloop", "gentle cell bloop (A4 F#4 D5 B4)", (lambda r, f=f: (G.bloop(r, f, up=0.45, bright=0.45), 0.0)), -5, p=[-0.3, 0.3, -0.1, 0.2][k],
          space="room", send=0.18, group="end_bloops")
    Bd(T.GOLDEN - 0.02, "golden_breeze", "golden evening breeze, faint birds", _bed(lambda d, r: _farm(d, r, 0.4, 0.8, 750), T.DUR - T.GOLDEN + 0.02, 0.3, 0.3),
       -25)
    E(58.6, "golden_twinkle", "soft sparkle chime 58.6-59.6 (D major, F#7-F#8)", lambda r: (_tuned_twinkle(0.85, r, [102, 105, 107, 110, 112, 114], 10.0,
      lambda t: np.sin(np.pi * np.clip(t / 0.85, 0, 1)) ** 1.2), 0.0), -11, send=0.3)
    return C


# ================================================================ render
def render(v_ref, on_event=None):
    """v_ref = integrated loudness of the voice stem (stereo). Returns (stereo stem, cue list with measured levels).
    on_event(cue, x, t0) is called with every placed (dry) event, for analysis."""
    C = cues()
    out = np.zeros((2, N))
    send = {"out": np.zeros(N), "room": np.zeros(N)}
    for c in C:
        x, anchor = c.gen(rng(zlib.crc32(f"{c.name}@{c.t:.3f}".encode())))
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        if c.cut is not None:
            k = ns(c.cut - (c.t - anchor))
            if 0 < k < x.shape[1]:
                x = fades(x[:, :k], 0.0, 0.02)
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(send[c.space], c.send * x.mean(0), t0)
    outdoor = make_ir(1.0, 77, pre=0.012, hf=1.6, early=[(0.08, 0.4, -0.5), (0.13, 0.3, 0.6), (0.21, 0.2, -0.2)])
    room = make_ir(0.55, 78, pre=0.006, hf=1.2, early=[(0.012, 0.5, -0.4), (0.019, 0.4, 0.5), (0.031, 0.3, 0.1)])
    out += 0.55 * convolve_st(send["out"], outdoor) + 0.5 * convolve_st(send["room"], room)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.3)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
