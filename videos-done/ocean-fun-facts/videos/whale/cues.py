# Sound cues for "It Rained Whale" (times in seconds; frames / 30)
DURATION = 2130 / 30
BPM = 112
SEED = 21
KEY = 2
MUSIC_REL = -12.0
SFX_REL = -8.0
BED_REL = -20.0
DUCK_DB = 4.0
F = lambda f: f / 30.0
SECTIONS = [
    (0.0, "quirky", "major"), (F(939), "tension", "minor"), (F(978), "stop", "minor"), (F(1010), "chase", "minor"),
    (F(1191), "stop", "minor"), (F(1262), "mystery", "sneaky"), (F(1477), "quirky", "major"), (F(1632), "quirky", "major"),
    (F(1700), "calm", "minor"), (F(1762), "tension", "minor"), (F(1792), "stop", "minor"), (F(1854), "calm", "minor"),
    (F(1920), "quirky", "major"), (F(1984), "triumph", "major"), (F(2125), "stop", "major"),
]
EVENTS = [
    (0.0, "buzz", {"dur": 2.6}, -12),
    *[(F(100 + i * 24 / 15), "pop", {"seed": i, "f0": 600 + 30 * i}, -12) for i in range(15)],
    (F(120), "fuse", {"dur": 1.0}, -8), (F(122), "impact", {"seed": 1, "f0": 60, "crack": 0.2}, -6),
    (F(144), "whoosh", {"seed": 2, "dur": 0.5}, -6),
    (F(170), "gull", {"seed": 1}, -12, -0.5), (F(230), "gull", {"seed": 2}, -12, 0.5),
    (F(270), "buzz", {"seed": 2, "dur": 1.6}, -10), (F(296), "boing", {"seed": 1, "f0": 120}, -8),
    (F(318), "engine_hum", {"dur": 1.4, "f0": 55}, -8), (F(346), "horn", {}, -6), (F(447), "pop", {"seed": 3}, -6), (F(449), "ding", {"seed": 1}, -9),
    (F(496), "pop", {"seed": 4, "f0": 700}, -8), (F(540), "pop", {"seed": 5, "f0": 800}, -8), (F(553), "impact", {"seed": 2, "f0": 90, "dur": 0.4}, -12),
    *[(F(598 + 6 * i), "pop", {"seed": 10 + i, "f0": 1000 + 100 * i}, -12) for i in range(4)],
    (F(700), "pop", {"seed": 6}, -10), (F(740), "pop", {"seed": 7}, -8), (F(742), "ding", {"seed": 2, "f": 1318.5}, -10),
    (F(800), "whoosh", {"seed": 3, "dur": 0.4}, -8), (F(804), "impact", {"seed": 3, "f0": 55}, -4), (F(806), "boing", {"seed": 2, "f0": 90}, -8),
    (F(834), "murmur", {"dur": 3.4}, -6), (F(905), "beep", {"f": 1200.0}, -10),
    (F(939), "beep", {"f": 880.0}, -4), (F(947), "beep", {"f": 880.0}, -4), (F(957), "beep", {"f": 1320.0}, -4),
    (F(972), "camera_shutter", {}, -8), (F(980), "explosion", {"seed": 1}, 2),
    *[(F(1014 + 3 * i), "slime", {"seed": i, "dur": 0.4}, -10, (i % 3 - 1) * 0.5) for i in range(12)],
    (F(1060), "whoosh", {"seed": 4, "dur": 1.0, "peak": 0.4}, -8),
    (F(1136), "slime", {"seed": 30}, -4), (F(1150), "crunch", {"seed": 2}, -10), (F(1166), "slime", {"seed": 31}, -4),
    (F(1190), "record_scratch", {}, -1),
    (F(1300), "fuse", {"seed": 2, "dur": 1.0}, -8), (F(1330), "impact", {"seed": 4, "f0": 70}, -4), (F(1332), "whoosh", {"seed": 5, "dur": 0.6}, -8),
    (F(1377), "boing", {"seed": 3, "f0": 150, "dur": 0.9}, -6), (F(1424), "pop", {"seed": 8}, -10), (F(1441), "rip", {"seed": 1}, -2),
    (F(1490), "fuse", {"seed": 3, "dur": 2.0}, -10), (F(1551), "explosion", {"seed": 2, "dur": 1.6}, -4),
    *[(F(1556 + 2 * i), "slime", {"seed": 40 + i, "dur": 0.3}, -12, (i % 3 - 1) * 0.6) for i in range(10)],
    (F(1660), "flaps", {"dur": 1.4}, -6), (F(1662), "gull", {"seed": 3}, -6, -0.4), (F(1668), "gull", {"seed": 4}, -8, 0.4),
    (F(1718), "sad_trombone", {}, -6),
    (F(1778), "whoosh", {"seed": 6, "dur": 0.6, "peak": 0.4, "lo": 200, "hi": 1200}, -6), (F(1792), "crunch", {"seed": 1}, 0),
    (F(1868), "thunder", {}, -8), (F(1870), "rain", {"dur": 1.6}, -10),
    (F(1920), "sparkle", {"seed": 1}, -8), (F(1950), "kaching", {}, -6),
    (F(2049), "pop", {"seed": 9, "f0": 600}, -6), (F(2093), "sparkle", {"seed": 3}, -6), (F(2093), "applause", {"dur": 1.2}, -8),
]
BEDS = [
    (0.0, F(938), "sea_bed", {"seed": 1}, 0), (F(938), F(1262), "sea_bed", {"seed": 2}, 0), (F(1477), F(1632), "room_tone", {}, -6),
    (F(1632), F(1762), "sea_bed", {"seed": 3}, 0), (F(1762), F(1984), "wind", {"seed": 2}, -6), (F(1984), DURATION, "sea_bed", {"seed": 4}, -2),
]
