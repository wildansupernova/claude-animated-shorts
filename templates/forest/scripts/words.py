# word timings: faster-whisper word timestamps, aligned onto the script words (captions use the script spelling)
import json, re, difflib
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
import soundfile as sf
aud, _sr = sf.read("/home/user/forest-short/voice/voice16k.wav", dtype="float32")
segs, _ = m.transcribe(aud, word_timestamps=True, language="en", beam_size=5)
hw = [w for s in segs for w in s.words]
norm = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
lines = json.load(open("/home/user/forest-short/voice/lines.json"))
sw = []  # script words with line index
for L in lines:
    for w in L["text"].split(): sw.append({"w": w, "line": L["i"]})
A = [norm(w["w"]) for w in sw]; B = [norm(w.word) for w in hw]
sm = difflib.SequenceMatcher(a=A, b=B, autojunk=False)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1): sw[i1 + k]["s"] = hw[j1 + k].start; sw[i1 + k]["e"] = hw[j1 + k].end
    elif j2 > j1:  # replace: spread the heard span over the script words
        s0, e0 = hw[j1].start, hw[j2 - 1].end; n = i2 - i1
        for k in range(n): sw[i1 + k]["s"] = s0 + (e0 - s0) * k / n; sw[i1 + k]["e"] = s0 + (e0 - s0) * (k + 1) / n
# fill any gaps by interpolation inside the line bounds
for i, w in enumerate(sw):
    if "s" not in w:
        L = lines[w["line"]]; prev = next((sw[j]["e"] for j in range(i - 1, -1, -1) if "e" in sw[j]), L["start"])
        nxt = next((sw[j]["s"] for j in range(i + 1, len(sw)) if "s" in sw[j]), L["end"])
        w["s"], w["e"] = prev, min(nxt, prev + 0.3)
out = [{"w": w["w"], "line": w["line"], "s": round(w["s"], 3), "e": round(w["e"], 3)} for w in sw]
json.dump(out, open("/home/user/forest-short/voice/words.json", "w"), indent=0)
print(len(out), "words;", sum(1 for t, *_ in sm.get_opcodes() if t != "equal"), "non-equal ops")
print(" ".join(w.word for w in hw))
