#!/bin/bash
# Final render of Godzilla24 (1080x1920, 24 fps, WebGL buffer at dpr 0.6, captions in HTML at full res) in 120-frame
# chunks on 3 workers, each its own browser. Resumable: finished chunks (out/final/chunk_s<start>.mp4) are skipped.
cd "$(dirname "$0")/.."
mkdir -p out/final/logs
LAST=2639; STEP=120
STARTS=(); for ((s=0; s<=LAST; s+=STEP)); do STARTS+=($s); done
SERVE=$(node scripts/bundle.mjs | tail -1); export SERVE
worker() { local w=$1; for ((i=w; i<${#STARTS[@]}; i+=3)); do
  s=${STARTS[$i]}; e=$((s+STEP-1)); [ $e -gt $LAST ] && e=$LAST; name=$(printf "chunk_s%05d" $s)
  [ -f out/final/$name.mp4 ] && continue
  PROPS='{"dpr":0.6}' CRF=16 node scripts/render.mjs out/final/part_$s.mp4 $s-$e 1 Godzilla24 1 > out/final/logs/$name.log 2>&1 && mv out/final/part_$s.mp4 out/final/$name.mp4
done; }
worker 0 & worker 1 & worker 2 & wait
n=$(ls out/final/chunk_s*.mp4 | wc -l); [ "$n" -eq "${#STARTS[@]}" ] && touch out/final/DONE
echo "chunks $n / ${#STARTS[@]}"
