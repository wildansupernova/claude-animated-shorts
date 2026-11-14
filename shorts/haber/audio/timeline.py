# Picture timeline of "Bread and Bombs from Thin Air" (Fritz Haber short), locked: 2051 frames at 30 fps = 68.3667 s.
# Scene cuts and every SFX event time come from the picture's event table (seconds). The score has its own beat grids
# (music.py), chosen so that picture events land on beats.
import json

FPS = 30
TOTAL = 2051
DUR = TOTAL / FPS              # 68.3667 s exactly (3,281,600 samples at 48 kHz)
fr = lambda f: f / FPS

# scene table: (start s, end s, name, place)
SCENES = [
    (0.00, 1.70, "hook_farm", "farm"), (1.70, 3.47, "hook_trench", "trench"), (3.47, 4.87, "hook_lab", "lab"),
    (4.87, 7.77, "farm1", "farm"), (7.77, 12.03, "sea1", "sea"), (12.03, 16.57, "farm2", "farm"),
    (16.57, 24.67, "lab1", "lab"), (24.67, 25.90, "flask", "lab"), (25.90, 28.07, "crowd", "outdoor"),
    (28.07, 31.43, "factory", "factory"), (31.43, 34.77, "sea2", "sea"), (34.77, 36.03, "trench", "trench"),
    (36.03, 42.50, "ypres", "trench"), (42.50, 46.23, "night_lab", "room"), (46.23, 48.13, "morning", "outdoor"),
    (48.13, 52.33, "alps", "alps"), (52.33, 54.40, "nobel", "room"), (54.40, 58.10, "lab2", "lab"),
    (58.10, 60.73, "camp", "camp"), (60.73, 62.70, "candle", "room"), (62.70, DUR, "ending", "outdoor"),
]

FLASH = (4.80, 4.93)           # white flash
SHOCK1 = 6.53                  # farmer looks into the empty sack
PLOPS = [8.5, 9.4, 10.2, 11.0]
ROPE = 10.3
CANNON = 11.4
INHALE = 13.07
TINKS = [15.65, 16.15]
DAZED = 16.13
LAB_WHOOSH = 17.67
PUMP0, PUMP1, PUMP_HZ = 18.67, 23.73, 2.5
IGNITE, FIRE_END = 20.97, 23.4
CLANK = 22.8
DRIPS = [24.15, 24.77, 25.39, 26.01]
FLASK_UP, SPARKLE_BURST = 24.67, 25.4
CROWD = (25.9, 28.07)
SACKS = [28.37, 28.99, 29.61]
SHELL = 30.2
WHISTLE, ENGINE_STOP = 31.67, 33.73
GUNS = [35.13, 35.50]
TICK = (37.03, 38.5)
GAS = 38.67
PANIC = 41.2
SILENCE = (45.2, 46.23)
POOF, TIPTOE = 50.37, 51.1
MEDAL = 53.13
SPRAY = (54.4, 56.7, 0.33)
BUGS = 55.87
OMINOUS = 56.77
SHOCK2, WHOOSH_UP, FINAL_BOOM = 63.87, 65.27, 67.3


def scene_at(t):
    for a, b, name, place in SCENES:
        if a <= t < b:
            return name
    return SCENES[-1][2]


def pump_strokes():
    out, k = [], 0
    while True:
        t = PUMP0 + k / PUMP_HZ
        if t > PUMP1 + 1e-6:
            break
        out.append(t)
        k += 1
    return out


def spray_times():
    a, b, dt = SPRAY
    out, t = [], a
    while t <= b + 1e-6:
        out.append(round(t, 4))
        t += dt
    return out


def words(path):
    return json.load(open(path, encoding="utf-8"))
