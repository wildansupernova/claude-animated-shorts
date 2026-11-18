# Sound cues for "The Navy That Hunted Fish Farts" (times in seconds; frames / 30)
DURATION = 2078 / 30
BPM = 104
SEED = 11
MUSIC_REL = -12.0   # music bed vs voice (LU)
SFX_REL = -8.0
BED_REL = -19.0
DUCK_DB = 4.0
SECTIONS = [
    (0.0, "mystery", "sneaky"), (5.6, "tension", "minor"), (16.0, "mystery", "sneaky"), (20.1, "chase", "minor"),
    (24.0, "stop", "minor"), (24.7, "tension", "sneaky"), (32.4, "stop", "minor"), (33.0, "mystery", "sneaky"),
    (40.7, "quirky", "major"), (63.0, "triumph", "major"), (65.1, "tension", "minor"), (67.9, "quirky", "major"), (68.9, "stop", "major"),
]
F = lambda f: f / 30.0
EVENTS = [
    # hook: pings from the warship, the sub's hum, the reveal and the toots
    *[(F(30 + 26 * k), "sonar_ping", {"seed": k}, -2) for k in range(4)],
    (0.0, "engine_hum", {"dur": 3.7}, -10),
    (F(108), "whoosh", {"seed": 2}, -4),
    (F(136), "toot", {"seed": 3, "f0": 120}, -8, -0.4), (F(141), "toot", {"seed": 4, "f0": 85}, -1), (F(146), "toot", {"seed": 5, "f0": 140}, -9, 0.4),
    (F(166), "whoosh", {"seed": 6, "dur": 0.5}, -5), (F(168), "impact", {"seed": 1}, -6),
    # coast
    (F(200), "gull", {"seed": 1}, -10, -0.5), (F(250), "gull", {"seed": 2}, -12, 0.5),
    (F(270), "impact", {"seed": 2, "f0": 48}, -2),
    # admiral
    (F(362), "impact", {"seed": 3, "f0": 70, "crack": 0.2}, -4), (F(364), "boing", {"seed": 1, "f0": 140}, -10),
    # hydrophones
    *[(F(f0), "pop", {"seed": i, "f0": 700 + 90 * i}, -8) for i, f0 in enumerate([394, 405, 416, 424, 434])],
    *[(F(f0 + 3), "bubbles", {"seed": i, "dur": 0.8, "decay": 0.3}, -10) for i, f0 in enumerate([394, 405, 416, 424, 434])],
    # sonar room
    (F(452), "tick_clock", {"dur": 1.0, "rate": 3}, -14),
    (F(487), "sonar_ping", {"seed": 9}, -6), (F(489), "pop", {"seed": 9, "f0": 1200}, -8),
    (F(498), "crackle", {"seed": 1, "dur": 3.6}, -3),
    (F(546), "crackle", {"seed": 2, "dur": 2.0, "density": 600}, -4), (F(546), "bubbles", {"seed": 3, "dur": 2.0, "rate": 25}, -10),
    # alarm + warships + nothing
    (F(604), "siren", {"dur": 1.0}, -3), (F(606), "impact", {"seed": 4}, -6),
    (F(630), "whoosh", {"seed": 7, "dur": 0.8, "peak": 0.25}, -3), (F(633), "engine_hum", {"dur": 1.9, "f0": 40}, -6), (F(640), "splashy", {"seed": 1}, -10),
    (F(712), "whoosh", {"seed": 8, "dur": 1.0, "peak": 0.5, "lo": 200, "hi": 900}, -10), (F(716), "crickets", {"dur": 1.2}, -6),
    # montage
    (F(742), "crackle", {"seed": 3, "dur": 3.3, "density": 200}, -10),
    *[(F(805 + 5 * i), "whoosh", {"seed": 20 + i, "dur": 0.3, "peak": 0.06, "lo": 1200, "hi": 4000}, -12) for i in range(6)],
    (F(808), "pop", {"seed": 2, "f0": 500}, -10), (F(825), "pop", {"seed": 3, "f0": 400}, -10),
    # cold war ends
    (F(895), "flag_fall", {"seed": 1}, -2),
    (F(920), "crackle", {"seed": 4, "dur": 1.8, "density": 250}, -8),
    # wait / lonely sub
    (F(973), "record_scratch", {"seed": 1}, -1), (F(976), "pop", {"seed": 4, "f0": 800}, -8), (F(988), "pop", {"seed": 5, "f0": 950}, -8),
    (F(1068), "boing", {"seed": 2, "f0": 220}, -8),
    # tapes
    (F(1160), "tape_whirr", {"dur": 2.0}, -8),
    # reveal
    (F(1255), "whoosh", {"seed": 9, "dur": 0.6, "peak": 0.2}, -4), (F(1262), "sparkle", {"seed": 1}, -6), (F(1262), "bubbles", {"seed": 8, "dur": 1.2, "rate": 60, "decay": 0.5}, -8),
    # science
    (F(1290), "gulp", {"seed": 1}, -2), (F(1293), "bubbles", {"seed": 5, "dur": 0.6, "rate": 30, "decay": 0.25}, -10),
    (F(1350), "squeak", {"seed": 1, "dur": 0.7, "f0": 500}, -14), (F(1398), "ding", {"seed": 2, "f": 1318.5}, -8),
    (F(1478), "toot", {"seed": 7, "f0": 90, "dur": 0.6}, 0), (F(1496), "bubbles", {"seed": 9, "dur": 1.6, "rate": 80, "lo": 800, "hi": 3500}, -8),
    (F(1562), "squeak", {"seed": 2, "dur": 1.3}, -4),
    *[(F(1608 + 9 * k), "toot", {"seed": 30 + k, "f0": 80 + 20 * (k % 4), "dur": 0.3}, -10, 0.5 * ((k % 3) - 1)) for k in range(7)],
    (F(1676), "toot", {"seed": 40, "f0": 110, "dur": 0.35}, -8), (F(1718), "pop", {"seed": 6, "f0": 900}, -8),
    (F(1720), "engine_hum", {"dur": 1.4, "f0": 70}, -10), (F(1726), "ding", {"seed": 3}, -8),
    # FRT + Ig Nobel
    (F(1824), "pop", {"seed": 7}, -8), (F(1862), "boing", {"seed": 3, "f0": 260}, -8),
    (F(1895), "applause", {"dur": 2.4}, -4), (F(1928), "sparkle", {"seed": 2}, -6),
    # navy at war + final toot
    *[(F(1960 + 22 * k), "sonar_ping", {"seed": 20 + k, "f0": 1320 + 80 * k}, -6) for k in range(3)],
    (F(2038), "toot", {"seed": 50, "f0": 75, "dur": 0.7}, 1), (F(2058), "ding", {"seed": 5, "f": 2093.0}, -6),
]
BEDS = [
    (0.0, F(172), "underwater_bed", {}, 0), (F(172), F(349), "sea_bed", {}, 0), (F(394), F(447), "underwater_bed", {"seed": 2}, -2),
    (F(447), F(546), "room_tone", {}, -4), (F(546), F(605), "underwater_bed", {"seed": 3}, 0), (F(633), F(739), "sea_bed", {"seed": 2}, 0),
    (F(739), F(843), "room_tone", {"seed": 2}, -4), (F(843), F(918), "wind", {}, -4), (F(918), F(1040), "room_tone", {"seed": 3}, -4),
    (F(1040), F(1095), "sea_bed", {"seed": 3}, 0), (F(1095), F(1222), "room_tone", {"seed": 4}, -6), (F(1222), F(1547), "underwater_bed", {"seed": 4}, 0),
    (F(1603), F(1768), "underwater_bed", {"seed": 5}, 0), (F(1955), DURATION, "underwater_bed", {"seed": 6}, 0),
]
