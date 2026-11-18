# Sound cues for "The Snot Highway" (times from voice/words.json)
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "audio"))
from cuehelp import sheet
W, L, END = sheet(os.path.dirname(os.path.abspath(__file__)))
DURATION = (round(END * 30) + 24) / 30
BPM = 116
SEED = 31
KEY = -2
MUSIC_REL = -12.0
SFX_REL = -8.0
BED_REL = -20.0
DUCK_DB = 4.0
SECTIONS = [
    (0.0, "quirky", "major"), (L(3), "tension", "minor"), (W("slams"), "chase", "minor"), (L(6), "quirky", "sneaky"),
    (L(9), "stop", "minor"), (L(10), "mystery", "sneaky"), (L(13), "quirky", "major"), (L(14), "tension", "minor"),
    (L(15), "chase", "major"), (L(16), "calm", "major"), (L(17), "quirky", "major"), (END + 0.3, "stop", "major"),
]
EVENTS = [
    (W("into") - 0.1, "whoosh", {"seed": 1}, -6), (W("slime.") - 0.05, "slime", {"seed": 1, "dur": 1.0}, 0), (W("slime.") + 0.2, "slime", {"seed": 2}, -4),
    (L(1) - 0.25, "whoosh", {"seed": 2, "dur": 0.5}, -6), (L(1), "engine_hum", {"dur": 3.0, "f0": 45}, -8),
    (W("hagfish.") - 0.05, "pop", {"seed": 3}, -8), *[(W("hagfish.") + 0.1 + 0.12 * i, "slime", {"seed": 10 + i, "dur": 0.3}, -14) for i in range(5)],
    (L(2) + 1.4, "boing", {"seed": 1, "f0": 160}, -8), (W("eat") - 0.05, "ding", {"seed": 1}, -8),
    (W("roadworks...") - 0.1, "horn", {}, -10), (W("slams") - 0.15, "squeak", {"seed": 5, "dur": 0.9, "f0": 1500}, -2), (W("slams"), "impact", {"seed": 1, "f0": 60}, -8),
    (W("flies") - 0.05, "whoosh", {"seed": 3, "dur": 0.6, "peak": 0.25}, -4), (W("smashes"), "crunch", {"seed": 1}, -2), (W("rest") + 0.2, "impact", {"seed": 2, "f0": 70, "crack": 0.3}, -6),
    *[(W("rest") + 0.3 + 0.08 * i, "thud", {"seed": 20 + i}, -12, (i % 3 - 1) * 0.5) for i in range(6)],
    *[(W("pour") + 0.07 * i, "slime", {"seed": 30 + i, "dur": 0.35}, -12, (i % 3 - 1) * 0.6) for i in range(14)],
    (W("panic,"), "pop", {"seed": 4, "f0": 1200}, -10), (W("make") + 0.1, "slime", {"seed": 40, "dur": 1.4}, -2),
    (W("extremely"), "record_scratch", {"seed": 2}, -10), *[(W("extremely") + 0.1 * i, "slime", {"seed": 50 + i, "dur": 0.3}, -12) for i in range(8)],
    (W("coated") , "slime", {"seed": 60, "dur": 1.5}, -4), (W("sneezed") - 0.3, "whoosh", {"seed": 5, "dur": 0.5, "peak": 0.3, "lo": 200, "hi": 1500}, -6), (W("sneezed"), "explosion", {"seed": 3, "dur": 1.0}, -12), (W("sneezed") + 0.05, "slime", {"seed": 61, "dur": 1.2}, -2),
    (W("wait...") - 0.05, "record_scratch", {"seed": 3}, -1),
    *[(W("glands") - 0.2 + 0.1 * i, "pop", {"seed": 70 + i, "f0": 900 + 60 * i}, -14) for i in range(8)],
    (W("balls"), "sparkle", {"seed": 1}, -10), (W("unravel,"), "whoosh", {"seed": 6, "dur": 0.8, "peak": 0.2, "lo": 800, "hi": 4000}, -8),
    (W("expands"), "slime", {"seed": 80, "dur": 1.0}, 0), (W("expands") + 0.05, "boing", {"seed": 2, "f0": 90, "dur": 0.8}, -6), (W("half", 0, 12) - 0.2, "tick_clock", {"dur": 0.6, "rate": 6}, -8),
    (W("snot") - 0.05, "impact", {"seed": 4, "f0": 80, "crack": 0.6}, -6), (W("snot"), "slime", {"seed": 81, "dur": 1.0}, -2),
    (W("gills") - 0.3, "whoosh", {"seed": 7, "dur": 0.5}, -6), (W("gills") - 0.15, "slime", {"seed": 82, "dur": 1.2}, -4), (W("gagging,"), "squeak", {"seed": 6, "dur": 0.6, "f0": 300}, -8), (W("swim"), "whoosh", {"seed": 8, "dur": 0.7, "peak": 0.1}, -8),
    (W("bulldozer") - 0.3, "engine_hum", {"dur": 2.5, "f0": 38}, -4), (W("hoses") - 0.2, "rain", {"dur": 2.0}, -6),
    (W("three", 0, 16), "pop", {"seed": 5, "f0": 500}, -8), (W("dinosaurs.") - 0.2, "impact", {"seed": 5, "f0": 45, "dur": 1.0}, -6),
    (W("disgusting.") , "slime", {"seed": 90, "dur": 1.0}, -4), (W("disgusting.") + 0.1, "sparkle", {"seed": 2}, -10),
    (W("working.") + 0.1, "ding", {"seed": 3, "f": 2093.0}, -6),
]
BEDS = [
    (0.0, L(3), "sea_bed", {"seed": 1}, -2), (L(3), L(9), "wind", {"seed": 2}, -6), (L(10), L(14), "underwater_bed", {"seed": 3}, 0),
    (L(14), L(15), "underwater_bed", {"seed": 4}, 0), (L(15), L(16), "sea_bed", {"seed": 5}, -2), (L(18), DURATION, "sea_bed", {"seed": 6}, -2),
]
