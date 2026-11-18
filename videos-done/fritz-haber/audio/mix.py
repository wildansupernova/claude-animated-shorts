# Final mix of the Haber short: the voice (unprocessed: 24 kHz -> 48 kHz resample only) + original score (ducked under
# the speech, per-section level automation relative to the voice) + synthesized SFX stem (lightly ducked). One master
# gain on the whole mix to -14 LUFS integrated, own 4x-oversampled look-ahead limiter for <= -1 dBTP, exactly
# 2051/30 s = 3,281,600 samples, 48 kHz / stereo / 16-bit (TPDF dither).
# Writes mix.wav, stems/{voice,music,sfx}.wav (pre-master balance, 24-bit; mix = limiter(G * sum)), cues.md.
# Rendered stems are cached in _cache/ (delete it after changing music.py / sfx.py).
import os
import re
import time
import json
import subprocess
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, short_term, lra, true_peak, fades)
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "voice")
CACHE = os.path.join(HERE, "_cache")
N = ns(T.DUR)                    # 3,281,600 samples = 68.3667 s
assert N == 3281600, N
TARGET_LUFS = -14.0
CEIL_DBTP = -1.3                 # limiter ceiling (spec: true peak <= -1 dBTP, margin for dither / resampling)
DUCK_DB = -3.0                   # music dip while the voice speaks (key = words.json), as the template
SFX_DUCK_DB = -2.0               # lighter dip on the SFX stem, same key

# music level per section, LU relative to the voice in that section (after ducking). The template's "+3 dB music"
# standard puts the bed at about -10 LU (old -13); the hook runs hotter, the night / dark / morning cues softer.
MUSIC_TARGET = {"hook": -8.0, "invent": -10.0, "bright": -9.0, "war": -10.0, "gas": -9.0, "somber": -13.0, "morning": -13.0,
                "sneaky": -11.0, "fanfare": -10.0, "dark": -14.0, "return": -10.0}

# music rides (start, end, dB) to keep quiet words on top (filled after listening tests / margin analysis)
DIPS = [(4.15, 4.80, -6.0),    # hook riser under "...was the air" (the flash owns 4.80)
        (11.80, 12.12, -4.0),  # tune re-enters under the soft "it" after the cannon
        (23.95, 24.62, -4.0),  # lab build under "ammonia"
        (25.45, 26.00, -3.5),  # the lift under "thin air"
        (27.55, 28.15, -4.0),  # turn to D minor under "Earth"
        (34.15, 35.95, -3.0),  # trench tutti under "his process keeps its guns firing"
        (41.75, 42.47, -4.0),  # panic stabs under "trenches"
        (67.34, 67.95, -4.0)]  # after the final hit's transient, under "warfare"


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def cached(name, fn):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name + ".npy")
    if os.path.exists(p):
        log("cache hit", name)
        return np.load(p).astype(np.float64)
    x = fn()
    np.save(p, np.asarray(x, np.float32))
    return x


# ================================================================ voice
def load_voice():
    x, sr = read_wav(os.path.join(VOICE_DIR, "voice.wav"))
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    if sr != SR:
        g = np.gcd(SR, sr)
        v = signal.resample_poly(v, SR // g, sr // g)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


def speech_spans(words, merge=0.3):
    sp = []
    for w in words:
        s, e = float(w["s"]), float(w["e"])
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp


def duck_db(spans, depth=DUCK_DB, pre=0.08, post=0.12, att=0.07, rel=0.45):
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


# ================================================================ music level automation
def section_db(m_ducked, v):
    import music
    secs = music.SECTIONS
    gains = {}
    for name, a, b in secs:
        seg = slice(ns(a), ns(b))
        Lm, Lv = integrated(m_ducked[:, seg]), integrated(v[:, seg])
        gains[name] = (Lv + MUSIC_TARGET[name] - Lm) if np.isfinite(Lm) else 0.0
    t = np.arange(N) / SR
    curve = np.zeros(N)
    for name, a, b in secs:
        curve[t >= a] = gains[name]
    sm = ndimage.uniform_filter1d(curve, ns(0.4), mode="nearest")
    hard = np.zeros(N, bool)
    for tb in music.HARD:
        hard[ns(tb - 0.25): ns(tb + 0.25)] = True
    curve = np.where(hard, curve, sm)
    for a, b, db in DIPS:
        d = np.zeros(N)
        d[ns(a): ns(b)] = db
        curve += ndimage.uniform_filter1d(d, ns(0.06), mode="nearest")
    return curve, gains


# ================================================================ limiter (template)
def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.04):
    """4x-oversampled peak detection, look-ahead min filter, release one-pole, centred smoothing -> gain curve"""
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3


# ================================================================ report helpers
def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


REPORT = [("hook", 0.0, 4.87), ("farm/sea/farm", 4.87, 16.57), ("lab", 16.57, 24.67), ("flask+crowd", 24.67, 28.07),
          ("factory/sea", 28.07, 34.77), ("trench", 34.77, 36.03), ("Ypres+gas", 36.03, 42.5), ("night", 42.5, 46.23),
          ("morning/Alps", 46.23, 52.33), ("Nobel", 52.33, 54.4), ("lab2", 54.4, 58.1), ("camp/candle", 58.1, 62.7),
          ("ending", 62.7, T.DUR)]


def section_table(v, m, s, words):
    Mv, Mb = momentary(v), momentary(m + s)
    tc = np.arange(len(Mv)) * 0.01 + 0.2
    speak = np.zeros(len(tc), bool)
    for w in words:
        speak |= (tc >= float(w["s"]) + 0.03) & (tc <= float(w["e"]) - 0.03)
    speak &= Mv > lufs(v) - 10
    rows = []
    for name, a, b in REPORT:
        seg = slice(ns(a), ns(b))
        Lv, Lm, Ls, Lb = lufs(v[:, seg]), lufs(m[:, seg]), lufs(s[:, seg]), lufs(m[:, seg] + s[:, seg])
        k = speak & (tc >= a) & (tc < b) & np.isfinite(Mb) & (Mb > -70)
        p10 = float(np.percentile(Mv[k] - Mb[k], 10)) if k.sum() > 5 else float("nan")
        med = float(np.median(Mv[k] - Mb[k])) if k.sum() > 5 else float("nan")
        rows.append((name, a, b, Lv, Lm, Ls, Lb, Lv - Lb, p10, med))
    return rows


def word_margins(v, m, s, words):
    """per word: voice momentary - bed momentary at the word centre (400 ms window)"""
    Mv, Mb = momentary(v), momentary(m + s)
    out = []
    for w in words:
        c = 0.5 * (float(w["s"]) + float(w["e"]))
        i = int(round((c - 0.2) / 0.01))
        if 0 <= i < len(Mv):
            out.append((w["w"], float(w["s"]), float(Mv[i] - Mb[i])))
    return out


def ffmpeg_ebur(path):
    try:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                           capture_output=True, text=True, timeout=300)
        txt = r.stderr
        i = txt.rfind("Summary:")
        if i < 0:
            return txt[-1500:]
        out = []
        for line in txt[i:].splitlines():
            out.append(line.rstrip())
            if line.strip().startswith("Peak:"):
                break
        return chr(10).join(l for l in out if l)
    except Exception as e:  # noqa
        return f"ffmpeg check failed: {e}"


# ================================================================ main
def main():
    t_start = time.time()
    words = T.words(os.path.join(VOICE_DIR, "words.json"))
    spans = speech_spans(words)
    v = load_voice()
    v_ref = integrated(v)
    log(f"voice: {v_ref:.2f} LUFS (as stereo), TP {true_peak(v):.2f} dBTP")

    import music
    b = music.build()

    def _m():
        out, levels = music.render(b, ref=-20.0)
        log("band levels", levels)
        return out
    m_raw = cached("music_raw", _m)
    log("music rendered", f"{lufs(m_raw):.2f} LUFS raw")
    dk = duck_db(spans)
    m_d = m_raw * dbg(dk)[None, :]
    sec_curve, sec_gains = section_db(m_d, v)
    m = m_d * dbg(sec_curve)[None, :]

    import sfx
    C_holder = {}

    def _s():
        out, C = sfx.render(v_ref)
        C_holder["C"] = C
        return out
    s_raw = cached("sfx", _s)
    if "C" not in C_holder:
        C_holder["C"] = sfx.cues()
    C = C_holder["C"]
    s_st = s_raw * dbg(duck_db(spans, SFX_DUCK_DB))[None, :]
    log("sfx rendered", f"{lufs(s_st):.2f} LUFS")

    mix0 = v + m + s_st
    G = TARGET_LUFS - lufs(mix0)
    for it in range(6):
        y, g3 = limiter(mix0 * dbg(G))
        L = lufs(y)
        log(f"master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20 * np.log10(g3.min()):.2f} dB")
        if abs(L - TARGET_LUFS) < 0.02:
            break
        G += TARGET_LUFS - L
    y = fades(y, 0.0, 0.3)                      # tail fade in the last 0.3 s
    assert y.shape == (2, N)
    os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)
    write_wav(os.path.join(HERE, "mix.wav"), y, bits=16, dither=True)
    write_wav(os.path.join(HERE, "stems", "voice.wav"), v, bits=24)
    write_wav(os.path.join(HERE, "stems", "music.wav"), m, bits=24)
    write_wav(os.path.join(HERE, "stems", "sfx.wav"), s_st, bits=24)
    log("wrote mix + stems")

    yq, _ = read_wav(os.path.join(HERE, "mix.wav"))
    I_, TP, LRA = lufs(yq), true_peak(yq), lra(yq)
    Mmax, Smax = float(np.max(momentary(yq))), float(np.max(short_term(yq)))
    grdb = -20 * np.log10(g3)
    gr_stats = dict(max=float(grdb.max()), pct_over_0_5=float((grdb > 0.5).mean() * 100), pct_over_0_1=float((grdb > 0.1).mean() * 100))
    gv, gm, gs = v * dbg(G), m * dbg(G), s_st * dbg(G)
    rows = section_table(gv, gm, gs, words)
    wm = word_margins(gv, gm, gs, words)
    eb = ffmpeg_ebur(os.path.join(HERE, "mix.wav"))
    stats = dict(I=I_, TP=TP, LRA=LRA, Mmax=Mmax, Smax=Smax, G=G, gr=gr_stats, v_ref=v_ref, n=yq.shape[1],
                 voice_I=lufs(gv), music_I=lufs(gm), sfx_I=lufs(gs), sec_gains=sec_gains)
    log(json.dumps({k: (round(v_, 3) if isinstance(v_, float) else v_) for k, v_ in stats.items() if k not in ("gr", "sec_gains")}))
    log("GR", gr_stats, "section gains", {k: round(x, 1) for k, x in sec_gains.items()})
    for r in rows:
        log(f"{r[0]:<14} voice {r[3]:6.1f}  music {r[4]:6.1f}  sfx {r[5]:6.1f}  bed {r[6]:6.1f}  margin {r[7]:5.1f}  speech med {r[9]:5.1f} p10 {r[8]:5.1f}")
    low = sorted(wm, key=lambda x: x[2])[:12]
    log("lowest word margins:", ", ".join(f"{w}@{s:.2f}:{d:.1f}" for w, s, d in low))
    print(eb)
    json.dump(dict(stats=stats, rows=rows, words=wm), open(os.path.join(CACHE, "report.json"), "w"), default=float, indent=1)
    write_cues(C, b, stats, rows, eb)
    log(f"done in {time.time() - t_start:.0f} s")


def write_cues(C, b, st_, rows, eb):
    L = []
    w = L.append
    gr = st_["gr"]
    w("# Bread and Bombs from Thin Air (Fritz Haber) - sound cue sheet")
    w("")
    w("Original score + SFX, all synthesized in numpy/scipy (`instruments.py`, `sfx_gen.py`, placed by `music.py` / `sfx.py`, "
      "mixed by `mix.py`; pipeline adapted from `templates/audio/`). No samples, no vocal sounds in the SFX.")
    w("")
    w("## Output")
    w(f"- `mix.wav`: 48 kHz stereo 16-bit (TPDF dither), {st_['n']:,} samples = {st_['n'] / SR:.4f} s (2051 frames @ 30 fps), voice from t = 0.")
    w(f"- `stems/voice|music|sfx.wav`: 24-bit, pre-master balance (voice = voice.wav untouched, 24 -> 48 kHz). "
      f"mix = limiter({st_['G']:+.2f} dB x (voice + music + sfx)), last 0.3 s faded.")
    w(f"- Loudness: **{st_['I']:.1f} LUFS** integrated, **{st_['TP']:.1f} dBTP** true peak (own BS.1770-4 meter; ffmpeg ebur128 agrees), "
      f"LRA {st_['LRA']:.1f} LU.")
    w(f"- Getting there needs {st_['G']:+.1f} dB on the whole mix: the voice alone is {st_['v_ref']:.1f} LUFS with peaks at -1.6 dBTP, so its "
      f"peaks are limited (ceiling {CEIL_DBTP} dBTP, max {gr['max']:.1f} dB, >0.5 dB on {gr['pct_over_0_5']:.0f} % of samples). Music + SFX alone never reach the limiter.")
    w("")
    w("## Levels (user standard: music +3 dB, SFX -6 dB, voice unchanged; applied the way the template does)")
    w("- Music ducked -3 dB under speech (key = words.json), then per section to a target under the voice (LU): " +
      ", ".join(f"{k} {v:+.0f}" for k, v in MUSIC_TARGET.items()) + ".")
    w("- Music rides under quiet key words: " + ", ".join(f"{a:.2f}-{b:.2f} {d:+.0f} dB" for a, b, d in DIPS) + ".")
    w(f"- SFX events at naive level - 6 dB (LU vs voice, max momentary), beds at their integrated level; SFX stem ducked {SFX_DUCK_DB:.0f} dB under speech.")
    w("- Voice vs bed (music + SFX), LU: " + "; ".join(f"{r[0]} {r[7]:.1f} (speech p10 {r[8]:.1f})" for r in rows) + ".")
    w("")
    w("## Music map (one piece built on the hook's bell motif D-A-G-F-E | D-A-Bb-A-C#)")
    w("| s | frame | music |")
    w("|---|---|---|")
    for t, d in sorted(b.cues):
        w(f"| {t:.2f} | {int(round(t * T.FPS))} | {d} |")
    w("")
    w("## SFX (s; naive -> applied LU; beds marked)")
    groups = {}
    for c in sorted(C, key=lambda c: c.t):
        g = groups.setdefault(c.name, dict(ts=[], c=c))
        g["ts"].append(c.t)
    for name, g in sorted(groups.items(), key=lambda kv: kv[1]["ts"][0]):
        c = g["c"]
        ts = ", ".join(f"{t:.2f}" for t in g["ts"])
        bed = " (bed)" if c.kind == "bed" else ""
        desc = re.sub(r"\s\d+/\d+", "", c.desc) if len(g["ts"]) > 1 else c.desc
        w(f"- {ts}: {desc}{bed} [{c.naive:+.0f} -> {c.applied:+.0f}]")
    w("")
    open(os.path.join(HERE, "cues.md"), "w", encoding="utf-8").write("\n".join(L))


if __name__ == "__main__":
    main()
