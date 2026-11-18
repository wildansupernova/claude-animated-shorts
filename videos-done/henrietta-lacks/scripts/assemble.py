# Final assembly of the Henrietta short: render segments + patches (later sources win per frame), mux the mix, export
# 1080p + lanczos 1440p, then burn the captions (out/captions.ass) onto both. Run from anywhere.
import glob, os, re, subprocess, sys
SEG = "/home/user/haber-work/remotion/out/henrietta/seg"
MIX = "/home/user/haber-work/audio_henrietta/mix.wav"
OUT = "/home/user/haber-work/remotion/out/henrietta"
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOTAL = 1806
src = [(f"{SEG}/A.mp4", 0, 599), (f"{SEG}/B.mp4", 600, 1199), (f"{SEG}/C.mp4", 1200, 1805)]
for p in sorted(glob.glob(f"{SEG}/patch_*.mp4")):
    a, b = map(int, re.findall(r"patch_(\d+)_(\d+)", p)[0]); src.append((p, a, b))
owner = [None] * TOTAL
for k, (_, a, b) in enumerate(src):
    for f in range(a, b + 1): owner[f] = k
assert all(o is not None for o in owner), "frames missing"
pieces, f = [], 0
while f < TOTAL:
    k, g = owner[f], f
    while g + 1 < TOTAL and owner[g + 1] == k: g += 1
    pieces.append((k, f, g)); f = g + 1
filt = [f"[{k}:v]trim=start_frame={a - src[k][1]}:end_frame={b - src[k][1] + 1},setpts=PTS-STARTPTS[p{i}]" for i, (k, a, b) in enumerate(pieces)]
filt.append("".join(f"[p{i}]" for i in range(len(pieces))) + f"concat=n={len(pieces)}:v=1:a=0,fps=30[v]")
cmd = ["ffmpeg", "-loglevel", "error", "-y"] + sum([["-i", s[0]] for s in src], []) + ["-i", MIX, "-filter_complex", ";".join(filt), "-map", "[v]", "-map", f"{len(src)}:a",
       "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", f"{OUT}/henrietta_1080x1920.mp4"]
print(len(pieces), "pieces from", len(src), "sources"); subprocess.run(cmd, check=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{OUT}/henrietta_1080x1920.mp4", "-vf", "scale=1440:2560:flags=lanczos", "-c:v", "libx264", "-crf", "17", "-preset", "slow",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "copy", f"{OUT}/henrietta_1440x2560.mp4"], check=True)
ass = f"{PROJ}/out/captions.ass"
os.makedirs(f"{PROJ}/out", exist_ok=True)
for name, crf in [("henrietta_1440x2560", "17"), ("henrietta_1080x1920", "16")]:
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{OUT}/{name}.mp4", "-vf", f"ass={ass}", "-c:v", "libx264", "-crf", crf, "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "copy", f"{PROJ}/out/{name}_captions.mp4"], check=True)
    subprocess.run(["cp", f"{OUT}/{name}.mp4", f"{PROJ}/out/{name}.mp4"], check=True)
print(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries", "stream=codec_type,width,height,nb_read_frames:format=duration", "-of", "compact", f"{PROJ}/out/henrietta_1080x1920_captions.mp4"], capture_output=True, text=True).stdout)
