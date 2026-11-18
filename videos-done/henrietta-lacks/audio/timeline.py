# Picture timeline of "The Woman Who Never Stopped" (Henrietta Lacks short), locked: 1806 frames at 30 fps = 60.2 s.
# Scene cuts and every SFX event time come from the picture's event table (seconds). The score has its own beat grids
# (music.py), chosen so that the picture's key events land on beats.
import json

FPS = 30
TOTAL = 1806
DUR = TOTAL / FPS              # 60.2 s exactly (2,889,600 samples at 48 kHz)
fr = lambda f: f / FPS

# scene table: (start s, end s, name, place)
SCENES = [
    (0.00, 1.87, "hook_farm", "farm"), (1.87, 3.57, "hook_cells", "lab"), (3.57, 4.90, "hook_space", "space"),
    (4.90, 5.03, "flash", "flash"), (5.03, 10.93, "farm", "farm"), (10.93, 14.70, "street1951", "street"),
    (14.70, 19.43, "exam", "room"), (19.43, 20.83, "gey_lab", "lab"), (20.83, 22.83, "dying", "lab"),
    (22.83, 24.43, "dividing", "lab"), (24.43, 25.13, "surprise", "lab"), (25.13, 29.40, "explain", "lab"),
    (29.40, 31.37, "dusk", "outdoor"), (31.37, 32.53, "roller", "lab"), (32.53, 33.73, "named", "lab"),
    (33.73, 35.27, "town", "street"), (35.27, 36.80, "clinic", "room"), (36.80, 37.57, "microscope", "lab"),
    (37.57, 38.30, "dna", "lab"), (38.30, 40.17, "rocket", "outdoor"), (40.17, 42.30, "papers", "room"),
    (42.30, 44.27, "protected", "outdoor"), (44.27, 46.00, "night", "outdoor"), (46.00, 51.20, "porch", "outdoor"),
    (51.20, 54.70, "courthouse", "street"), (54.70, 56.17, "modern_lab", "lab"), (56.17, 57.87, "cells", "lab"),
    (57.87, DUR, "golden", "outdoor"),
]

# hook
CUT_MICRO, CUT_SPACE, FLASH = 1.87, 3.57, (4.90, 5.03)
HOOK_BLOOPS = [2.3, 2.9, 3.3]
# 1951
STREET, COBBLES = 10.93, (10.93, 12.3)
HOSPITAL = 12.33
EXAM, SAMPLE, WITHOUT_ASKING = 14.70, 17.4, 18.5
# Gey's lab
LAB, DYING, DIVIDING, SURPRISE, EXPLAIN = 19.43, 20.83, 22.83, 24.43, 25.13
POPS = [21.4, 21.7, 22.0, 22.3, 22.6]
RISE_BLOOPS = [22.87, 23.19, 23.51, 23.83, 24.15]
VIRUS_ZIP, SHATTER, HAPPY_BLOOP = 27.43, 28.67, 29.0
DEATH = (29.40, 31.37)
# montage
ROLLER, NAMED, TOWN, CLINIC, PINCH, FOCUS, DNA = 31.37, 32.53, 33.73, 35.27, 36.0, 36.8, 37.57
ROCKET, IGNITION, LIFTOFF, ROCKET_END = 38.3, 38.6, 39.0, 40.17
PAPERS, AVALANCHE = 40.17, 41.2
PROTECTED, UNLUCKILY = 42.30, 44.27
PORCH, LETTER, LETTER_STING, DECADES = 46.0, 46.8, 46.9, 49.43
COURT, SETTLE = 51.2, 52.83
MODERN, CELLS2, GOLDEN, NAME = 54.7, 56.17, 57.87, 59.23


def scene_at(t):
    for a, b, name, place in SCENES:
        if a <= t < b:
            return name
    return SCENES[-1][2]


def words(path):
    return json.load(open(path, encoding="utf-8"))
