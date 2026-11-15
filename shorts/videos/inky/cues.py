# Sound cues for "Inky's Great Escape" (times from voice/words.json)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "audio"))
from cuehelp import sheet
W, L, END = sheet(os.path.dirname(os.path.abspath(__file__)))
DURATION = (round(END * 30) + 24) / 30
BPM = 96
SEED = 51
KEY = 1
MUSIC_REL = -12.0
SFX_REL = -8.0
BED_REL = -20.0
DUCK_DB = 4.0
SECTIONS = [
    (0.0, "mystery", "sneaky"), (L(1), "quirky", "major"), (L(4), "mystery", "sneaky"), (L(6), "tension", "sneaky"), (L(8), "chase", "minor"),
    (L(9), "calm", "minor"), (L(10), "stop", "minor"), (L(11), "quirky", "major"), (L(15), "calm", "major"), (L(16), "quirky", "major"), (END + 0.3, "stop", "major"),
]
EVENTS = [
    (W("prison") - 0.1, "whoosh", {"seed": 1, "dur": 0.5}, -8), (W("nobody") , "crickets", {"dur": 1.2}, -8),
    (W("inky,") , "sparkle", {"seed": 1}, -10), (W("fishermen") , "gull", {"seed": 1}, -12), (W("home.") , "ding", {"seed": 1}, -8),
    (W("too") , "boing", {"seed": 1, "f0": 200}, -8), (W("cleaning,") , "bubbles", {"seed": 2, "dur": 1.0, "rate": 20}, -12),
    (W("crack.") , "pop", {"seed": 2, "f0": 700}, -6), (W("needs.") - 0.05, "impact", {"seed": 1, "f0": 70, "crack": 0.2}, -8),
    (W("squeezes") , "slime", {"seed": 1, "dur": 0.6}, -6), (W("slides") , "squeak", {"seed": 1, "dur": 0.8, "f0": 700}, -14),
    *[(W("crosses") + 0.3 * i, "slime", {"seed": 10 + i, "dur": 0.2}, -16) for i in range(8)],
    (W("drain") , "pop", {"seed": 3}, -10), (W("pours") , "slime", {"seed": 2, "dur": 1.2}, -2), (W("pours") + 0.5, "whoosh", {"seed": 3, "dur": 1.2, "peak": 0.6, "lo": 200, "hi": 900}, -8),
    (W("ocean.") , "splashy", {"seed": 1}, -4),
    (W("empty") , "record_scratch", {"seed": 1}, -8), (W("wait...") - 0.05, "record_scratch", {"seed": 2}, -1),
    (W("rugby") , "pop", {"seed": 4, "f0": 600}, -8), (W("six-inch") , "pop", {"seed": 5, "f0": 900}, -8),
    (W("bones.") , "boing", {"seed": 2, "f0": 120}, -8), (W("beak.") , "ding", {"seed": 2}, -8), (W("follow.") - 0.3, "slime", {"seed": 3, "dur": 0.8}, -4),
    (W("brain.") , "sparkle", {"seed": 2}, -6), (W("jars,") , "pop", {"seed": 6}, -6), (W("puzzles,") , "tick_clock", {"dur": 0.6, "rate": 8}, -8), (W("faces.") , "ding", {"seed": 3, "f": 1760.0}, -8),
    (W("never") , "whoosh", {"seed": 4, "dur": 1.2, "peak": 0.5}, -10), (W("blotchy?") , "boing", {"seed": 3, "f0": 90}, -6),
    (W("artists.") + 0.2, "sad_trombone", {}, -8),
]
BEDS = [
    (0.0, L(1), "room_tone", {"seed": 1}, -4), (L(1), L(2), "room_tone", {"seed": 2}, -6), (L(2), L(3), "sea_bed", {"seed": 1}, -2),
    (L(4), L(8), "room_tone", {"seed": 3}, -4), (L(8), L(9), "sea_bed", {"seed": 2}, -2), (L(15), L(16), "underwater_bed", {"seed": 1}, 0),
]
