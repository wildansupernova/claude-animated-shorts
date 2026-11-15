#!/bin/bash
# Join the rendered chunks, mux the mix, run the frame-by-frame QA.
# usage: scripts/finish.sh   (from the project folder; needs out/chunks/*.mp4, out/audio/mix.wav, out/timeline.json)
set -euo pipefail
ls out/chunks/c_*.mp4 | grep -v part | sort | sed "s#^#file '$PWD/#; s#\$#'#" > out/chunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/chunks/list.txt -c copy out/video.mp4
ffmpeg -v error -y -i out/video.mp4 -i out/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart out/birthday_bet.mp4
python3 - <<'PY'
import json
t = json.load(open("out/timeline.json"))
x = [[s["a"] - t["XFADE"][str(s["id"])] // 2, s["a"] + t["XFADE"][str(s["id"])] // 2] for s in t["shots"] if str(s["id"]) in t["XFADE"]]
json.dump({"shots": [{"id": s["id"], "a": s["a"], "b": s["b"]} for s in t["shots"]], "flash": [t["FLASH_AT"], t["FLASH_AT"] + 4], "xfade": x}, open("out/shots.json", "w"))
PY
python3 scripts/short_qa.py out/birthday_bet.mp4 out/qa out/shots.json
