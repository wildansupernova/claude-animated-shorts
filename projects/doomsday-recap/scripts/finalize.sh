#!/bin/bash
# Concat the rendered chunks, mux the mix, run frame-by-frame QA and make a smaller share copy.
set -e
cd "$(dirname "$0")/.."
ls out/final/chunk_s*.mp4 | sort | sed "s|^|file '$PWD/|; s|$|'|" > out/final/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/final/list.txt -c copy out/final/video.mp4
ffmpeg -v error -y -i out/final/video.mp4 -i audio/out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/final/road_to_doomsday.mp4
ffmpeg -v error -y -i out/final/road_to_doomsday.mp4 -map 0:v:0 -map 0:a:0 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart out/final/road_to_doomsday_share.mp4
ls -la out/final/*.mp4
