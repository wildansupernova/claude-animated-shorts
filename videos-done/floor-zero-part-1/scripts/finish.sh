#!/bin/bash
# Join the rendered chunks, mux the mix, run the frame-by-frame QA, make the share encode.
# usage: scripts/finish.sh   (from the project folder; needs out/chunks/*.mp4, out/audio/mix.wav, out/timeline.json)
set -euo pipefail
ls out/chunks/c_*.mp4 | grep -v part | sort | sed "s#^#file '$PWD/#; s#\$#'#" > out/chunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/chunks/list.txt -c copy out/video.mp4
ffmpeg -v error -y -i out/video.mp4 -i out/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart out/floor_zero_part1_master.mp4
python3 - <<'PY'
import json
t = json.load(open("out/timeline.json"))
json.dump({"shots": [{"id": s["id"], "a": s["a"], "b": s["b"]} for s in t["shots"]], "planned": [[f, f + 1] for f, _ in t["flicker"]]}, open("out/shots.json", "w"))
PY
python3 scripts/short_qa.py out/floor_zero_part1_master.mp4 out/qa out/shots.json
# share encode (fits under GitHub's 50 MB warning; fine for Reels / TikTok / Shorts)
ffmpeg -v error -y -i out/floor_zero_part1_master.mp4 -c:v libx264 -preset slow -crf 21 -tune animation -maxrate 7M -bufsize 14M \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart out/floor_zero_part1.mp4
ls -la out/floor_zero_part1*.mp4
