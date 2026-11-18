# Sound cues for "The Man with the Golden Arm" (times from voice/words.json)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "audio"))
from cuehelp import sheet
W, L, END = sheet(os.path.dirname(os.path.abspath(__file__)))
DURATION = (round(END * 30) + 30) / 30
BPM = 92
SEED = 73
KEY = 0
MUSIC_REL = -12.0
SFX_REL = -8.0
BED_REL = -20.0
DUCK_DB = 4.0
SECTIONS = [
    (0.0, "calm", "minor"), (W("paid"), "quirky", "major"), (L(4), "mystery", "sneaky"), (L(5), "tension", "minor"),
    (L(7), "calm", "minor"), (L(8), "quirky", "major"), (L(16), "calm", "minor"), (L(17), "calm", "major"), (END + 0.4, "stop", "major"),
]
_n, _b = W("needed"), W("blood.", 0, 1)
BAGS = [_n + i * (_b - _n) / 13 for i in range(13)]
_d, _bb = W("donations"), W("babies.", 0, 15)
BABIES = [_d + i * (_bb - _d) / 12 for i in range(12)]
EVENTS = [
    # hook: heartbeat in the ward, strangers' drops, the counter to 1,173
    *[(0.3 + 0.8 * i + d, "thud", {"seed": 1}, -16) for i in range(4) for d in (0.0, 0.22)],
    *[(W("strangers'") - 0.1 + 0.17 * i, "pop", {"seed": 1 + i, "f0": 700 + 120 * i}, -10) for i in range(3)],
    (W("saved"), "sparkle", {"seed": 1}, -8), (W("paid") - 0.1, "whoosh", {"seed": 1, "dur": 0.5}, -8),
    (W("1,173") - 0.1, "tick_clock", {"dur": 2.0, "rate": 14}, -10), (W("times."), "impact", {"seed": 1, "f0": 70, "dur": 0.6, "crack": 0.3}, -8), (W("times.") + 0.05, "ding", {"seed": 1, "f": 1568.0}, -6),
    # Australia, 1951, thirteen bags
    (W("james"), "pop", {"seed": 5, "f0": 600}, -10), (W("australia,"), "pop", {"seed": 6, "f0": 900}, -8), (W("1951..."), "camera_shutter", {"seed": 1}, -12),
    *[(t, "pop", {"seed": 10 + i, "f0": 500 + 40 * i}, -12) for i, t in enumerate(BAGS)], (W("thirteen"), "ding", {"seed": 2, "f": 1318.5}, -10),
    # the promise; age 18 and the needle
    (W("promise:"), "sparkle", {"seed": 2}, -8), (W("give"), "pop", {"seed": 30, "f0": 800}, -8),
    (W("eighteen,"), "pop", {"seed": 31, "f0": 700}, -10), (W("hated") - 0.05, "boing", {"seed": 1, "f0": 300, "dur": 0.4}, -10),
    # anti-D antibodies
    (W("packed") - 0.1, "bubbles", {"seed": 1, "dur": 0.9, "rate": 30}, -10), (W("anti-d."), "sparkle", {"seed": 3}, -6),
    # Rh disease
    (W("rh-negative,"), "pop", {"seed": 32, "f0": 500}, -10), (W("rh-positive,"), "pop", {"seed": 33, "f0": 900}, -10),
    (W("learn"), "zap", {"seed": 1, "dur": 0.4}, -14), (W("invader...") - 0.05, "siren", {}, -18), (W("attack", 0, 6) - 0.05, "impact", {"seed": 2, "f0": 60, "dur": 0.5, "crack": 0.5}, -8),
    # the medicine, 1967
    (W("medicine:") - 0.2, "whoosh", {"seed": 2, "dur": 0.5}, -10), (W("medicine:"), "sparkle", {"seed": 4}, -8), (W("shot", 0, 8), "ding", {"seed": 3, "f": 1760.0}, -8),
    (W("learning"), "pop", {"seed": 34, "f0": 400}, -6), (W("1967,"), "camera_shutter", {"seed": 2}, -12), (W("got"), "sparkle", {"seed": 5}, -8),
    # sixty years montage, daughter, golden arm
    (W("kept", 0, 10), "tick_clock", {"dur": 2.4, "rate": 10}, -12), (W("sixty") - 0.05, "impact", {"seed": 3, "f0": 80, "dur": 0.4, "crack": 0.2}, -10),
    (W("daughter."), "sparkle", {"seed": 6}, -6), (W("golden") - 0.05, "sparkle", {"seed": 7}, -4), (W("golden"), "ding", {"seed": 4, "f": 2093.0, "vel": 0.6}, -8),
    # luckily / unluckily
    (W("eighty-one."), "applause", {"seed": 1, "dur": 1.4}, -14), (W("unluckily...") - 0.05, "record_scratch", {"seed": 1}, -4), (W("needle.") + 0.05, "squeak", {"seed": 1, "dur": 0.4, "f0": 1300}, -14),
    # an estimated 2.4 million babies
    *[(t, "pop", {"seed": 40 + i, "f0": 700 + 50 * i}, -12) for i, t in enumerate(BABIES)], (W("2.4") - 0.05, "kaching", {"seed": 1}, -10),
    # the lab and the promise
    (W("lab...") - 0.1, "bubbles", {"seed": 2, "dur": 0.8, "rate": 20}, -12), (W("promise", 0, 17), "sparkle", {"seed": 8}, -6), (W("end."), "ding", {"seed": 5, "f": 1568.0}, -8),
]
BEDS = [
    (0.0, W("paid"), "room_tone", {"seed": 1}, -4), (L(1) + 1.5, L(4), "room_tone", {"seed": 2}, -4), (L(9), L(12), "room_tone", {"seed": 3}, -4),
    (L(13), L(15), "room_tone", {"seed": 4}, -4), (L(16), L(17), "room_tone", {"seed": 5}, -6), (L(17), DURATION, "room_tone", {"seed": 6}, -4),
]
