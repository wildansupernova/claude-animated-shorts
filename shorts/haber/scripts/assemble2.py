# Final assembly from render segments + patches (later sources win per frame), mux the mix, export 1080p + 1440p.
import glob, os, re, subprocess
os.chdir("/home/user/haber-work/remotion/out/haber")
TOTAL = 2051
src = [("seg/A.mp4", 0, 699), ("seg/B.mp4", 700, 1399), ("seg/C.mp4", 1400, 2050), ("seg/P.mp4", 943, 1042)]
for p in sorted(glob.glob("seg/patch_*.mp4")):
    a, b = map(int, re.findall(r"patch_(\d+)_(\d+)", p)[0]); src.append((p, a, b))
owner = [None] * TOTAL
for k, (_, a, b) in enumerate(src):
    for f in range(a, b + 1): owner[f] = k
assert all(o is not None for o in owner)
pieces, f = [], 0
while f < TOTAL:
    k, g = owner[f], f
    while g + 1 < TOTAL and owner[g + 1] == k: g += 1
    pieces.append((k, f, g)); f = g + 1
filt, labels = [], []
for i, (k, a, b) in enumerate(pieces):
    s0 = src[k][1]
    filt.append(f"[{k}:v]trim=start_frame={a - s0}:end_frame={b - s0 + 1},setpts=PTS-STARTPTS[p{i}]"); labels.append(f"[p{i}]")
filt.append("".join(labels) + f"concat=n={len(pieces)}:v=1:a=0,fps=30[v]")
cmd = ["ffmpeg", "-loglevel", "error", "-y"]
for s in src: cmd += ["-i", s[0]]
cmd += ["-i", "/home/user/haber-work/audio/mix.wav", "-filter_complex", ";".join(filt), "-map", "[v]", "-map", f"{len(src)}:a",
        "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "haber_1080x1920.mp4"]
print(len(pieces), "pieces from", len(src), "sources")
subprocess.run(cmd, check=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "haber_1080x1920.mp4", "-vf", "scale=1440:2560:flags=lanczos", "-c:v", "libx264", "-crf", "17", "-preset", "slow",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "copy", "haber_1440x2560.mp4"], check=True)
print(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries", "stream=codec_type,width,height,nb_read_frames:format=duration", "-of", "compact", "haber_1080x1920.mp4"], capture_output=True, text=True).stdout)
