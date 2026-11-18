# Sound cues for "The Jellyfish That Starts Over" (times from voice/words.json)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "audio"))
from cuehelp import sheet
W, L, END = sheet(os.path.dirname(os.path.abspath(__file__)))
DURATION = (round(END * 30) + 30) / 30
BPM = 100
SEED = 61
KEY = 2
MUSIC_REL = -12.0
SFX_REL = -8.0
BED_REL = -20.0
DUCK_DB = 4.0
SECTIONS = [
    (0.0, "mystery", "sneaky"), (L(1), "quirky", "major"), (L(2), "calm", "minor"), (L(4), "tension", "sneaky"), (L(6), "mystery", "sneaky"),
    (L(7), "quirky", "major"), (L(8), "calm", "major"), (L(9), "quirky", "major"), (L(11), "calm", "major"), (L(12), "stop", "minor"),
    (L(13), "chase", "minor"), (L(14), "mystery", "minor"), (L(15), "calm", "major"), (END + 0.4, "stop", "major"),
]
# Kubota's ten rejuvenations: one pop per tally mark (same timing as story.ts kubotaCount)
_w, _t = W("watched") * 30, W("times...") * 30 + 4
KUBOTA = [(_w + i * (_t - _w) / 10) / 30 for i in range(10)]
PINS = [W("spreading."), W("scientists"), W("think"), W("hitched"), W("rides")]
EVENTS = [
    # hook: old jelly rewinds into a baby polyp
    (W("old", 0, 0), "tick_clock", {"dur": 1.0, "rate": 3}, -14),
    (W("starts") - 0.15, "tape_whirr", {"seed": 1, "dur": 0.9}, -4), (W("over.") + 0.02, "pop", {"seed": 1, "f0": 700}, -4), (W("over.") + 0.1, "sparkle", {"seed": 1}, -6),
    (W("immortal", 0, 1), "sparkle", {"seed": 2}, -8), (W("pinky") - 0.2, "whoosh", {"seed": 2, "dur": 0.5}, -10), (W("nail."), "ding", {"seed": 1, "f": 1760.0}, -8),
    (W("one", 0, 2) - 0.1, "pop", {"seed": 2, "f0": 500}, -8),
    (W("buds", 0, 3), "bubbles", {"seed": 1, "dur": 0.6, "rate": 25}, -10), (W("baby", 0, 3), "pop", {"seed": 3, "f0": 1100}, -8),
    (W("grows", 0, 3), "whoosh", {"seed": 3, "dur": 0.9, "peak": 0.5}, -10), (W("it", 1, 3) + 0.05, "sad_trombone", {}, -8),
    # stress: starve / hurt / old
    (W("starve"), "pop", {"seed": 4, "f0": 400}, -8), (W("hurt"), "impact", {"seed": 1, "f0": 90, "dur": 0.4, "crack": 0.3}, -10), (W("old", 0, 4), "tick_clock", {"dur": 0.8, "rate": 6}, -10),
    # shrink, pull in, sink, blob
    (W("shrinks."), "squeak", {"seed": 2, "dur": 0.5, "f0": 900}, -12), (W("tentacles"), "slime", {"seed": 1, "dur": 0.7}, -6),
    (W("sinks"), "bubbles", {"seed": 2, "dur": 1.4, "rate": 18, "lo": 200, "hi": 1200}, -8), (W("blob", 0, 5) - 0.05, "slime", {"seed": 2, "dur": 0.5}, -2), (W("blob", 0, 5), "thud", {"seed": 1}, -8),
    # roots and the baby polyp
    (W("roots..."), "slime", {"seed": 3, "dur": 0.9}, -10), (W("becomes"), "sparkle", {"seed": 3}, -6), (W("baby", 0, 6), "pop", {"seed": 5, "f0": 1200}, -6),
    # buds and RESET
    *[(W("buds", 0, 7) + 0.12 * i, "pop", {"seed": 6 + i, "f0": 800 + 150 * i}, -8) for i in range(3)],
    (W("brand") + 0.1, "bubbles", {"seed": 3, "dur": 0.8, "rate": 30}, -10),
    (W("reset.") - 0.35, "tape_whirr", {"seed": 2, "dur": 0.5}, -8), (W("reset.") - 0.05, "impact", {"seed": 2, "f0": 70, "dur": 0.6, "crack": 0.4}, -6), (W("reset.") + 0.05, "ding", {"seed": 2}, -6),
    # butterfly -> cocoon -> caterpillar
    (W("butterfly") - 0.2, "flaps", {"seed": 1, "dur": 1.6}, -10), (W("cocoon...") + 0.1, "slime", {"seed": 4, "dur": 0.4}, -10),
    (W("cocoon...") + 0.4, "tape_whirr", {"seed": 3, "dur": 0.6}, -12), (W("caterpillar."), "boing", {"seed": 1, "f0": 160}, -6), (W("caterpillar.") + 0.35, "pop", {"seed": 9, "f0": 600}, -10),
    # cells switch jobs
    (W("trick?"), "sparkle", {"seed": 4}, -10), (W("switch") - 0.05, "whoosh", {"seed": 4, "dur": 0.4, "peak": 0.5}, -10), (W("jobs."), "pop", {"seed": 10, "f0": 900}, -8),
    (W("skin"), "whoosh", {"seed": 5, "dur": 0.5}, -12), (W("different") - 0.1, "zap", {"seed": 1, "dur": 0.6}, -8), (W("cell.") + 0.05, "ding", {"seed": 3, "f": 1318.5}, -8),
    # Kubota: Japan, ten tally marks, calendar flip
    (W("japan,"), "pop", {"seed": 11, "f0": 700}, -10),
    *[(t, "pop", {"seed": 20 + i, "f0": 600 + 60 * i}, -9) for i, t in enumerate(KUBOTA)],
    (W("times...") + 0.15, "ding", {"seed": 4, "f": 1568.0}, -8), (W("two", 0, 10) - 0.05, "camera_shutter", {"seed": 1}, -10),
    # luckily / unluckily
    (W("luckily,"), "sparkle", {"seed": 5}, -6), (W("never", 0, 11), "ding", {"seed": 5, "f": 2093.0, "vel": 0.5}, -10),
    (W("unluckily...") - 0.05, "record_scratch", {"seed": 1}, -4), (W("snack.") - 0.08, "gulp", {"seed": 1}, -2), (W("snack.") + 0.12, "crunch", {"seed": 1}, -10),
    # spreading: pins, ship horn, ballast water
    *[(t - 0.05, "pop", {"seed": 30 + i, "f0": 700 + 80 * i}, -8) for i, t in enumerate(PINS)],
    (W("ships'") - 0.1, "horn", {"seed": 1, "dur": 0.7}, -10), (W("ballast"), "bubbles", {"seed": 4, "dur": 1.0, "rate": 20}, -10),
    # 2022 genome
    (W("2022,"), "pop", {"seed": 12, "f0": 600}, -8), (W("spain"), "pop", {"seed": 13, "f0": 800}, -10), (W("dna,"), "sparkle", {"seed": 6}, -8),
    *[(W("copies") - 0.12 + 0.1 * i, "pop", {"seed": 40 + i, "f0": 1000 + 120 * i}, -10) for i in range(3)],
    (W("repair"), "tick_clock", {"dur": 0.5, "rate": 10}, -8), (W("it.", 0, 14) + 0.05, "ding", {"seed": 6, "f": 1760.0}, -10),
    # ending: eleventh childhood
    (W("eleventh") - 0.15, "pop", {"seed": 14, "f0": 700}, -8), (W("childhood.") - 0.1, "sparkle", {"seed": 7}, -4), (W("childhood.") + 0.05, "applause", {"seed": 1, "dur": 2.2}, -14),
]
BEDS = [
    (0.0, L(8), "underwater_bed", {"seed": 1}, 0), (L(8), L(9), "wind", {"seed": 1}, -12), (L(9), L(10), "underwater_bed", {"seed": 2}, -8),
    (L(10), L(11), "room_tone", {"seed": 1}, -4), (L(11), L(13), "underwater_bed", {"seed": 3}, 0), (L(13), L(14), "sea_bed", {"seed": 1}, -4),
    (L(15), DURATION, "underwater_bed", {"seed": 4}, 0),
]
