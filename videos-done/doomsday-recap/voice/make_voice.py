# Kokoro TTS (af_heart): one clip per line, trimmed to its first/last word, joined with fixed gaps.
# Writes voice.wav (24 kHz mono) + words.json [{w, s, e, line, ch}] + lines_timed.json. Run with the tts venv.
import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
SR = 24000
VOICE, SPEED = (sys.argv[1] if len(sys.argv) > 1 else "af_heart"), float(sys.argv[2]) if len(sys.argv) > 2 else 1.15
LEAD, GAP_LINE, GAP_CH, PAD = 0.5, 0.22, 0.45, 0.05
lines = json.load(open("lines.json"))
p = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
out, words, timed, t = [np.zeros(int(LEAD * SR), np.float32)], [], [], LEAD
for i, L in enumerate(lines):
    auds, toks, off = [], [], 0.0
    for r in p(L["say"], voice=VOICE, speed=SPEED):
        a = r.audio.numpy(); auds.append(a)
        for k in (r.tokens or []):
            if k.start_ts is None: continue
            toks.append([k.text, off + k.start_ts, off + k.end_ts, k.whitespace])
        off += len(a) / SR
    a = np.concatenate(auds)
    s0 = max(0.0, toks[0][1] - PAD); s1 = min(len(a) / SR, toks[-1][2] + 0.18)
    seg = a[int(s0 * SR):int(s1 * SR)]
    # merge punctuation tokens into the previous word for captions
    ws = []
    for txt, s, e, wsp in toks:
        if ws and not any(c.isalnum() for c in txt):
            ws[-1]["w"] += txt; ws[-1]["sp"] = wsp
        else:
            ws.append({"w": txt, "s": round(t + s - s0, 3), "e": round(t + e - s0, 3), "sp": wsp, "line": L["id"], "ch": L["ch"]})
    words += ws
    timed.append({**L, "s": round(t, 3), "e": round(t + len(seg) / SR, 3)})
    out.append(seg); t += len(seg) / SR
    nxt = lines[i + 1]["ch"] if i + 1 < len(lines) else -1
    gap = 1.2 if nxt == -1 else (GAP_CH if nxt != L["ch"] else GAP_LINE)
    out.append(np.zeros(int(gap * SR), np.float32)); t += gap
    print(f"{L['id']} {timed[-1]['s']:.2f}-{timed[-1]['e']:.2f}", flush=True)
v = np.concatenate(out)
sf.write("voice.wav", v, SR)
json.dump(words, open("words.json", "w"), indent=0)
json.dump(timed, open("lines_timed.json", "w"), indent=1)
print("total", round(len(v) / SR, 2), "s,", len(words), "words")
