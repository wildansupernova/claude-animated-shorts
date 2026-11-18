# Every sound effect + ambience bed of the Haber short as a cue list timed to the picture (timeline.py), rendered
# into one stereo SFX stem. Levels follow the user's standard mix exactly as the bridge template does: each EVENT has a
# "naive" level (LU relative to the voice stem, measured as the event's max momentary loudness) and is placed
# SFX_DB = -6 dB under it; ambience BEDS (integrated loudness) keep their level. No vocal sounds of any kind.
import zlib
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, shelf, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise, modal)
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


def _farm(dur, r, birds=0.5, wind_lvl=1.0):
    x = G.wind(dur, r, wind_lvl, 0.18, 800)
    x = x / (np.std(x) + 1e-9)
    x += pan(G.bird_chirps(dur, r, birds, "sparrow") * 0.35, 0.5)
    x += pan(G.bird_chirps(dur, r, birds * 0.6, "blackbird") * 0.22, -0.55)
    return x


def _sea(dur, r, gulls=False, dark=False):
    x = G.waves(dur, r, (3.0, 5.0) if not dark else (3.6, 6.0), 1.0, 0.35 if not dark else 0.2, 0.6 if not dark else 0.9)
    x = x / (np.std(x) + 1e-9)
    w = G.wind(dur, r, 1.0, 0.2, 900 if not dark else 600)
    x += 0.35 * w / (np.std(w) + 1e-9)
    if dark:
        x = lp(x, 2500, 1)
    return x


def cues():
    C = []
    R = rng(1909)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append
    E = lambda t, name, desc, fn, naive, **k: add(Cue(t, name, desc, fn, naive, **k))
    Bd = lambda t, name, desc, fn, naive, **k: add(Cue(t, name, desc, fn, naive, kind="bed", send=k.pop("send", 0.0), **k))

    # ------------------------------------------------ 0 - 4.87 hook montage: farm -> trench (1.7) -> lab (3.47) -> white flash
    Bd(0.0, "amb_hook_farm", "soft wind over the farm (hook)", _bed(lambda d, r: _farm(d, r, 0.25, 1.0), 1.76, 0.0, 0.06), -26)
    Bd(1.68, "trench_rumble", "trench rumble bed, far shelling thuds (hook)", _bed(lambda d, r: G.rumble(d, r, 1.0, 22, 150, 1.2), 1.84, 0.03, 0.06), -22)
    Bd(1.68, "gas_hiss_far", "gas hiss far off, under the rumble (hook)", _bed(lambda d, r: lp(G.hiss(d, r, 2000, 9000, 0.4, 0.8), 4500, 1), 1.84, 0.2, 0.06), -33)
    Bd(3.45, "lab_tone_hook", "lab room tone: air + mains hum (hook)", _bed(lambda d, r: G.room_tone(d, r), 1.38, 0.03, 0.04), -30, space="room", send=0.0)
    E(3.6, "sparkle_hook", "sparkle twinkle over the lab bench (3.6-4.6)",
      lambda r: (G.sparkle(1.0, r, 16, 3000, 8000, lambda t: np.sin(np.pi * np.clip(t / 1.0, 0, 1)) ** 0.8), 0.0), -11, space="room", send=0.2)
    E(T.FLASH[0], "flash", "white flash 4.80-4.93: reverse swell peaking on the cut + impact (sub thump, crack, sizzle)",
      lambda r: G.flash_impact(r), -8, send=0.18)

    # ------------------------------------------------ 4.87 - 7.77 farm
    Bd(4.85, "amb_farm1", "farm: birds + light wind", _bed(lambda d, r: _farm(d, r, 0.7), 2.97, 0.04, 0.06), -25)
    E(T.SHOCK1, "shock_sting", "comic shock sting: farmer looks into the empty sack", lambda r: (G.shock_sting(r), 0.0), -8, send=0.15)

    # ------------------------------------------------ 7.77 - 12.03 sea
    Bd(7.75, "amb_sea1", "sea: waves + sea wind", _bed(lambda d, r: _sea(d, r), 4.33, 0.04, 0.06), -20)
    for tm, pp in [(7.95, -0.55), (9.05, 0.6), (10.75, -0.3)]:
        E(tm, "gull", "seagull-like synthesized chirps (distant)", (lambda r: (G.gull(r), 0.0)), -17, p=pp, lpf=5500, send=0.3, group="gulls")
    for k, tm in enumerate(T.PLOPS):
        E(tm, "plop", f"small plop drop {k + 1}/4", (lambda r, k=k: (G.plop(r, [620, 700, 560, 760][k]), 0.0)), -13,
          p=[-0.3, 0.25, -0.15, 0.35][k], send=0.15, group="plops")
    E(T.ROPE, "rope_strain", "rope creak/strain (tug of war)", lambda r: (G.rope_strain(r, 1.1), 0.0), -11, p=0.2, send=0.12)
    E(T.CANNON, "cannon", "cannon boom (muzzle crack, blast, boom, echo)", lambda r: (G.cannon(r, 2.4, 46, 0.7), 0.0), -5, p=-0.2, send=0.2)
    E(T.CANNON + 0.12, "debris_puff", "debris puff after the cannon", lambda r: (G.debris_puff(r), 0.0), -14, p=-0.1, send=0.15)

    # ------------------------------------------------ 12.03 - 16.57 farm
    Bd(12.01, "amb_farm2", "farm: birds + light wind", _bed(lambda d, r: _farm(d, r, 0.6), 4.6, 0.04, 0.06), -25)
    E(T.INHALE, "inhale_whoosh", "big inhale whoosh: rising airy noise ~1.5 s (noise only, no voice)",
      lambda r: (G.whoosh(1.55, r, 1.42, 280, 3600, 0.9, 0.05, 0.35), 0.0), -6, send=0.1)
    for k, tm in enumerate(T.TINKS):
        E(tm, "hammer_tink", f"tiny hammer tink on the molecule {k + 1}/2", (lambda r: (G.tink(r), 0.0)), -13, p=0.15, send=0.12, group="tinks")
    E(T.DAZED, "dazed_boing", "cartoon 'dazed' boing", lambda r: (G.boing(r, 165), 0.0), -12, send=0.12)
    E(T.DAZED + 0.1, "dazed_stars", "twinkly stars circling", lambda r: (G.circling_stars(r, 1.4, 9), 0.0), -17, send=0.2)

    # ------------------------------------------------ 16.57 - 24.67 lab
    Bd(16.55, "lab_tone", "lab room tone (through the flask shot to 25.9)", _bed(lambda d, r: G.room_tone(d, r), 9.39, 0.04, 0.08), -28, space="room")
    E(T.LAB_WHOOSH, "whoosh", "camera whoosh", lambda r: (G.whoosh(0.7, r, 0.14, 330, 2200, 0.8, 0.2, 0.15), 0.14), -10, space="room", send=0.1)
    strokes = T.pump_strokes()
    for k, tm in enumerate(strokes):
        E(tm, "pump_piston", f"pump piston stroke {k + 1}/{len(strokes)} (2.5 Hz)", (lambda r: (G.piston(r), 0.0)), -11,
          extra=2.0 * k / max(1, len(strokes) - 1), p=-0.25, space="room", send=0.1, group="pump")
    E(T.PUMP0, "pressure_build", "pressure gauge: rising metal creak + hiss (18.67-23.73)",
      lambda r: (G.pressure_build(T.PUMP1 - T.PUMP0 + 0.05, r), 0.0), -14, space="room", send=0.08)
    E(T.IGNITE, "furnace_ignite", "furnace ignition whoomph", lambda r: (G.whoomph(r), 0.0), -5, p=0.25, space="room", send=0.15)
    Bd(T.IGNITE + 0.05, "fire_bed", "roaring furnace fire bed (to 23.4)", _bed(lambda d, r: G.fire_bed(d, r), T.FIRE_END - T.IGNITE + 0.2, 0.25, 0.3), -21,
       space="room", send=0.05)
    E(T.CLANK, "machine_clank", "machine clank", lambda r: (G.metal_clank(r, 1.0), 0.0), -9, p=-0.3, space="room", send=0.15)
    for k, tm in enumerate(T.DRIPS):
        E(tm, "drip_plink", f"liquid drip plink into the flask {k + 1}/4", (lambda r, k=k: (G.plink(r, 1180 * 2 ** (k / 12)), 0.0)), -12,
          p=0.1, space="room", send=0.2, group="drips")
    E(T.FLASK_UP, "flask_lift", "flask raised: soft glass clink + swish",
      lambda r: (G.whoosh(0.7, r, 0.1, 800, 3500, 0.7, 0.1, 0.2) * 0.5 + G.plink(r, 2400) * 0.4, 0.0),
      -16, space="room", send=0.15)
    E(T.SPARKLE_BURST, "sparkle_burst", "sparkle burst chime ('out of thin air')", lambda r: (G.chime_burst(r), 0.0), -11, send=0.25)

    # ------------------------------------------------ 25.9 - 28.07 outdoor crowd scene (no voices)
    Bd(T.CROWD[0] - 0.02, "amb_crowd", "outdoor crowd scene bed: birds + warm air (no voices)", _bed(lambda d, r: _farm(d, r, 0.9, 0.8), 2.22, 0.08, 0.06), -24)
    E(T.CROWD[0] + 0.05, "bell_gliss", "warm handbell glissando (F major)", lambda r: (fades(G.bell_gliss(r, dur=2.1), 0.0, 0.4), 0.0), -12, p=0.1, send=0.25)

    # ------------------------------------------------ 28.07 - 31.43 factory
    Bd(28.05, "conveyor", "factory conveyor rattle, belt, motor hum", _bed(lambda d, r: G.conveyor(d, r), 3.42, 0.04, 0.06), -21, space="room")
    for k, tm in enumerate(T.SACKS):
        E(tm, "sack_thump", f"fertilizer sack thump {k + 1}/3", (lambda r: (G.sack_thump(r), 0.0)), -10, p=[-0.3, 0.0, 0.3][k], space="room",
          send=0.12, group="sacks")
    E(T.SHELL, "shell_clank", "heavy metal shell CLANK + impact", lambda r: (G.shell_clank(r), 0.0), -3, p=0.15, space="room", send=0.2)

    # ------------------------------------------------ 31.43 - 34.77 sea (warship)
    Bd(31.41, "amb_sea2", "grey sea: heavier waves, wind", _bed(lambda d, r: _sea(d, r, dark=True), 3.4, 0.04, 0.06), -23)
    E(T.WHISTLE, "steam_whistle", "warship steam whistle (three chambers)", lambda r: (G.steam_whistle(r, 1.7), 0.0), -6, p=0.3, send=0.3)

    def _engine(r):
        dur = T.ENGINE_STOP - T.WHISTLE + 0.3
        y = np.zeros(ns(dur))
        tm, k = 0.0, 0
        while tm < dur - 0.3:
            G._place_mono(y, G.chug(r, k % 2 == 0) * r.uniform(0.85, 1.0), tm)
            left = (T.ENGINE_STOP - T.WHISTLE) - tm
            tm += (1 / 3.4) * (1 if left > 0.6 else 1 + 1.2 * (0.6 - left))
            k += 1
        return widen(lp(y, 4000, 1), r, 9, 0.6), 0.0
    E(T.WHISTLE, "steam_chug", "steam-engine chug (from 31.67, slowing before the stop)", _engine, -13, p=-0.1, send=0.15)
    E(T.ENGINE_STOP, "engine_stop", "engine stops with a release hiss", lambda r: (G.steam_stop(r), 0.0), -11, p=-0.1, send=0.2)

    # ------------------------------------------------ 34.77 - 36.03 trench guns
    Bd(34.75, "trench_rumble2", "trench rumble", _bed(lambda d, r: G.rumble(d, r, 1.0, 22, 150, 0.0), 1.3, 0.03, 0.06), -25)
    for k, tm in enumerate(T.GUNS):
        E(tm, "field_gun", f"field-gun boom {k + 1}/2 with ground shake + dirt rain", (lambda r: (G.field_gun(r), 0.0)), -4 if k == 0 else -5,
          p=[-0.3, 0.35][k], send=0.2, group="guns")

    # ------------------------------------------------ 36.03 - 42.5 Ypres
    Bd(36.01, "amb_ypres", "Ypres: wind over the lines", _bed(lambda d, r: G.wind(d, r, 1.0, 0.15, 650, 0.4, 300, 700), 6.51, 0.04, 0.08), -24)
    for tm, pp in [(36.35, -0.6), (37.65, 0.5), (39.3, -0.4), (40.4, 0.6)]:
        E(tm, "artillery_far", "distant artillery", (lambda r: (G.distant_boom(r, 2.2, r.uniform(38, 48), 320), 0.0)), -18, p=pp, send=0.35,
          group="artillery_far")
    Bd(T.TICK[0], "watch_tick", "pocket-watch tick bed (5 Hz) until 38.5", _bed(lambda d, r: G.watch_ticks(d, r, 5.0), T.TICK[1] - T.TICK[0], 0.01, 0.15), -23,
       p=0.1, send=0.06)
    E(T.GAS, "gas_valves", "many gas valves opening: squeak-clunks, each starting a hiss", lambda r: (G.valves_open(r), 0.0), -8, send=0.15)
    Bd(T.GAS, "gas_cloud", "hiss swelling into a rolling low cloud rumble (38.67-42.5)", _bed(lambda d, r: G.gas_cloud(d, r), 42.52 - T.GAS, 0.05, 0.1), -21,
       send=0.1)
    E(T.PANIC, "alarm_whistle", "panic: short pea-whistle alarm blasts (no voice)", lambda r: (G.alarm_whistle(r), 0.0), -11, p=0.4, send=0.3)
    Bd(T.PANIC, "boots_running", "boots running through the trench (41.2-42.5)",
       _bed(lambda d, r: G.running_boots(d, r), 42.52 - T.PANIC, 0.25, 0.08), -24, send=0.1)

    # ------------------------------------------------ 42.5 - 46.23 night lab, near silence from 45.2 (no SFX for the death)
    quiet = lambda t: np.interp(t + 42.48, [42.48, T.SILENCE[0], T.SILENCE[0] + 0.35, 46.25], [1.0, 1.0, 0.1, 0.1])
    Bd(42.48, "night_tone", "night lab: quiet room tone (drops to near silence at 45.2)", _bed(lambda d, r: G.room_tone(d, r, 50, 0.06, 1800), 3.77, 0.05, 0.06, quiet),
       -32, space="room")
    Bd(42.6, "clock_tick", "faint wall-clock tick (stops at 45.2)", _bed(lambda d, r: G.clock_ticks(d, r, 1.0), T.SILENCE[0] - 42.6, 0.0, 0.05), -29, p=-0.3,
       space="room", send=0.2)

    # ------------------------------------------------ 46.23 - 48.13 golden morning
    Bd(46.21, "amb_morning", "golden morning: birds, soft air", _bed(lambda d, r: _farm(d, r, 0.9, 0.6), 1.95, 0.35, 0.06), -25)
    for k, tm in enumerate([46.45, 46.95, 47.45, 47.95]):
        E(tm, "footstep", f"slow footstep {k + 1}/4 (2 per second)", (lambda r, k=k: (G.gravel_step(r, 1.0 if k % 2 else 0.85), 0.0)), -15,
          p=0.1 + 0.05 * k, send=0.1, group="steps_morning")
    for tm in (46.62, 47.62):
        E(tm, "suitcase_creak", "suitcase handle creak", (lambda r: (G.suitcase_creak(r), 0.0)), -17, p=0.2, send=0.1, group="suitcase")

    # ------------------------------------------------ 48.13 - 52.33 Alps
    Bd(48.11, "amb_alps", "Alps: mountain wind", _bed(lambda d, r: G.wind(d, r, 1.0, 0.12, 900, 0.25, 500, 1100), 4.25, 0.04, 0.06), -24)
    Bd(48.11, "cowbells", "distant cowbells", _bed(lambda d, r: G.cowbells(d, r, 3), 4.25, 0.3, 0.06), -26, send=0.35)
    E(T.POOF, "poof", "'poof' puff as the beard appears", lambda r: (G.poof(r), 0.0), -8, send=0.12)
    E(T.TIPTOE, "tiptoe_pluck", "sneaky tiptoe pluck + toe tick",
      lambda r: (I.pizz(I.m2f(74), 0.7, r, 0.5) + np.pad(G.bug_thud(r) * 0.3, (0, ns(0.5) - ns(0.12))), 0.0), -11, p=0.15, send=0.12)

    # ------------------------------------------------ 52.33 - 54.4 Nobel
    Bd(52.31, "nobel_tone", "hall room tone", _bed(lambda d, r: G.room_tone(d, r, 50, 0.03, 2000), 2.1, 0.04, 0.06), -33, space="room")
    for k, tm in enumerate([52.38, 52.62, 52.86]):
        E(tm, "footstep_hall", f"footsteps to the podium {k + 1}/3", (lambda r: (G.stroll_step(r, 0.3), 0.0)), -15, p=-0.1 + 0.1 * k, space="room",
          send=0.2, group="steps_nobel")
    E(T.MEDAL, "medal_ding", "medal 'ding'", lambda r: (G.medal_ding(r), 0.0), -9, p=-0.1, space="room", send=0.25)
    E(T.MEDAL, "confetti_pop", "confetti pop + paper flutter", lambda r: (G.confetti_pop(r), 0.0), -8, p=0.1, space="room", send=0.15)

    # ------------------------------------------------ 54.4 - 58.1 lab (pest killing)
    Bd(54.38, "lab_tone2", "lab room tone", _bed(lambda d, r: G.room_tone(d, r), 3.74, 0.04, 0.06), -31, space="room")
    sp = [t for t in np.arange(T.SPRAY[0], T.SPRAY[1] + 0.02, T.SPRAY[2])]
    for k, tm in enumerate(sp):
        E(float(tm), "spray", f"spray-can 'psst' {k + 1}/{len(sp)}", (lambda r: (G.spray(r, 0.18), 0.0)), -13, p=0.3 * (-1) ** k, space="room",
          send=0.1, group="spray")
    for k, tm in enumerate([T.BUGS, T.BUGS + 0.09, T.BUGS + 0.21, T.BUGS + 0.36]):
        E(tm, "bug_thud", "tiny bug thud", (lambda r: (G.bug_thud(r), 0.0)), -18, p=-0.2 + 0.15 * k, space="room", send=0.08, group="bugs")
    E(T.OMINOUS, "ominous_hit", "ominous low hit: the poison can appears", lambda r: G.ominous_hit(r), -5, space="room", send=0.2)

    # ------------------------------------------------ 58.1 - 60.73 night camp, 60.73 - 62.7 candle
    Bd(58.08, "amb_camp", "night camp: cold wind", _bed(lambda d, r: G.wind(d, r, 1.0, 0.1, 500, 0.5, 260, 600), 2.68, 0.06, 0.08), -25)
    Bd(58.08, "searchlight_hum", "low electric searchlight hum", _bed(lambda d, r: G.searchlight_hum(d, r), 2.68, 0.3, 0.1), -33, p=0.3)
    Bd(60.71, "candle", "soft candle flicker, near silence", _bed(lambda d, r: G.candle(d, r), 2.02, 0.1, 0.06), -37, space="room")

    # ------------------------------------------------ 62.7 - 68.37 golden ending
    Bd(62.68, "amb_end", "golden ending: soft air, faint birds", _bed(lambda d, r: _farm(d, r, 0.35, 0.6), T.DUR - 62.68, 0.25, 0.3), -31)
    E(63.0, "falling_sparkles", "gentle sparkles/chimes as molecules fall (63-65)",
      lambda r: (G.sparkle(2.0, r, 11, 2500, 6500, lambda t: np.sin(np.pi * np.clip(t / 2.0, 0, 1)) ** 0.7, 0.85, 0.6, 0.03), 0.0), -12, send=0.25)
    E(T.SHOCK2, "shock_sting_soft", "soft shock sting", lambda r: (G.shock_sting(r, soft=True), 0.0), -12, send=0.15)
    E(T.WHOOSH_UP, "whoosh_up", "whoosh up toward the sky", lambda r: (widen(G.whoosh_rise(1.1, r, 0.28, 350, 5200, 0.8, 0.35, 0.3), r, 10, 0.8), 0.0), -10, send=0.15)
    E(T.FINAL_BOOM, "final_boom", "final low boom on 'warfare'", lambda r: (G.low_boom(r, 1.06, 33.0), 0.0), -5, send=0.15)
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
