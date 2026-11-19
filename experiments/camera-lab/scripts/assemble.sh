#!/usr/bin/env bash
# Joins card + clip for every variant into the review reel and muxes the reel sound.
# needs: out/cards/card_XX.png (scripts/cards.mjs), out/reel/c_*.mp4 (scripts/render-chunks.mjs, 4 chunks per clip),
# out/audio/reel.wav (audio/reel_audio.py). Output: out/camera_moves_reel.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
N=${N:-26}; CARD=${CARD:-60}; FPS=30
mkdir -p out/cardv out/clips
for i in $(seq 0 $((N - 1))); do
  ii=$(printf "%02d" $i)
  [ -f out/cardv/card_$ii.mp4 ] || ffmpeg -v error -y -loop 1 -framerate $FPS -i out/cards/card_$ii.png -frames:v $CARD \
    -vf "fade=in:0:4,fade=out:$((CARD - 4)):4,format=yuv420p" -c:v libx264 -crf 16 -preset medium -r $FPS out/cardv/card_$ii.mp4
  a=$((i * 420)); ls out/reel/c_$(printf "%05d" $a)_*.mp4 > /dev/null
  : > out/clips/list_$ii.txt
  for k in 0 1 2 3; do s=$((a + k * 105)); f=$(ls out/reel/c_$(printf "%05d" $s)_*.mp4); echo "file '$(realpath $f)'" >> out/clips/list_$ii.txt; done
done
: > out/reel_list.txt
for i in $(seq 0 $((N - 1))); do ii=$(printf "%02d" $i); echo "file '$(realpath out/cardv/card_$ii.mp4)'" >> out/reel_list.txt; cat out/clips/list_$ii.txt >> out/reel_list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i out/reel_list.txt -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r $FPS out/reel_video.mp4
ffmpeg -v error -y -i out/reel_video.mp4 -i out/audio/reel.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/camera_moves_reel.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 out/camera_moves_reel.mp4
