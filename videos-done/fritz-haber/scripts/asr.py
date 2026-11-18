import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    import soundfile as sf, scipy.signal as ss; a, sr = sf.read(f, dtype="float32"); a = ss.resample_poly(a, 16000, sr).astype("float32")
    segs, info = m.transcribe(a, word_timestamps=True, beam_size=5)
    words = [w for s in segs for w in s.words]
    json.dump([{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for w in words], open(f.replace(".wav", "_asr.json"), "w"), indent=0)
    print(f, " ".join(w.word.strip() for w in words))
    print("low-confidence:", [(w.word.strip(), round(w.probability, 2)) for w in words if w.probability < 0.6])
