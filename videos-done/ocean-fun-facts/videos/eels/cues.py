# Sound cues for "The Horses and the Electric Eels" (times from voice/words.json)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "audio"))
from cuehelp import sheet
W, L, END = sheet(os.path.dirname(os.path.abspath(__file__)))
DURATION = (round(END * 30) + 24) / 30
BPM = 100
SEED = 41
KEY = 3
MUSIC_REL = -12.0
SFX_REL = -8.0
BED_REL = -20.0
DUCK_DB = 4.0
SECTIONS = [
    (0.0, "tension", "minor"), (L(1), "quirky", "major"), (L(4), "tension", "sneaky"), (L(5), "chase", "minor"), (L(6), "calm", "minor"),
    (L(7), "quirky", "major"), (L(8), "stop", "minor"), (L(9), "mystery", "sneaky"), (L(10), "chase", "minor"), (L(11), "mystery", "sneaky"),
    (L(13), "quirky", "major"), (L(15), "triumph", "major"), (L(16), "quirky", "major"), (END + 0.3, "stop", "major"),
]
EVENTS = [
    *[(W("fish", 0) + 0.15 * i, "zap", {"seed": i, "dur": 0.5}, -6, (i % 3 - 1) * 0.5) for i in range(4)],
    (W("horses...", 0), "splashy", {"seed": 1}, -10),
    (W("nobody") + 0.2, "applause", {"dur": 1.5}, -14),
    (W("hurts.") - 0.12, "zap", {"seed": 10, "dur": 0.9}, 0), (W("lot.") , "boing", {"seed": 1, "f0": 110}, -8),
    (W("idea.") - 0.1, "ding", {"seed": 1}, -6),
    (W("drive") , "whoosh", {"seed": 2, "dur": 0.8}, -8), *[(W("drive") + 0.4 + 0.2 * i, "splashy", {"seed": 2 + i}, -14) for i in range(3)],
    (W("rise") - 0.1, "bubbles", {"seed": 3, "dur": 1.0, "rate": 50, "decay": 0.4}, -8),
    (W("zap") - 0.05, "zap", {"seed": 20, "dur": 0.6}, 0), (W("again", 0) - 0.05, "zap", {"seed": 21, "dur": 0.5}, -2), (W("again.") - 0.05, "zap", {"seed": 22, "dur": 0.7}, -1),
    (W("down") , "splashy", {"seed": 9}, -8), (W("drown.") , "bubbles", {"seed": 4, "dur": 1.6, "rate": 30, "decay": 0.8}, -8),
    (W("writes") , "squeak", {"seed": 1, "dur": 1.0, "f0": 3200}, -22), (W("nonsense.") , "applause", {"seed": 2, "dur": 1.5}, -10),
    (W("wait...") - 0.05, "record_scratch", {"seed": 1}, -1),
    (W("leap") - 0.1, "splashy", {"seed": 12}, -10), (W("leap") , "zap", {"seed": 30, "dur": 0.8}, 0),
    (W("spreads") , "sonar_ping", {"seed": 1, "f0": 600}, -8),
    (W("chin") , "zap", {"seed": 31, "dur": 0.4}, -6), (W("straight", 0, 12) , "zap", {"seed": 32, "dur": 1.0}, 0),
    (W("stadium,") , "applause", {"seed": 3, "dur": 1.6}, -8), (W("ear.") - 0.1, "horn", {}, -6),
    *[(W("higher") - 0.1 + 0.45 * i, "zap", {"seed": 40 + i, "dur": 0.3 + 0.2 * i}, -8 + 3 * i) for i in range(3)],
    (W("right", 0, 15) , "sparkle", {"seed": 1}, -6),
    (W("zap", 1) - 0.05, "zap", {"seed": 50, "dur": 0.8}, 0), (W("purpose.") + 0.1, "ding", {"seed": 2, "f": 2093.0}, -6),
]
BEDS = [
    (0.0, L(1) - 0.2, "wind", {"seed": 1}, -4), (L(1), L(9), "wind", {"seed": 2}, -8), (L(9), L(11), "room_tone", {}, -6),
    (L(11), L(12), "underwater_bed", {"seed": 3}, 0), (L(16), DURATION, "room_tone", {"seed": 2}, -6),
]
