#!/bin/bash
# Render whichever 120-frame chunks of Godzilla24 are still missing, 3 at a time (resumable; reuses the newest bundle).
cd "$(dirname "$0")/.."
while pgrep -f "render.mjs out/final/manual_" >/dev/null; do sleep 10; done
[ -f out/final/manual_2520.mp4 ] && [ ! -f out/final/chunk_s02520.mp4 ] && mv out/final/manual_2520.mp4 out/final/chunk_s02520.mp4
export SERVE=${SERVE:-$(ls -td /home/user/remotion-tmp/remotion-webpack-bundle-* | head -1)}
LAST=2639; STEP=120; MISSING=()
for ((s=0; s<=LAST; s+=STEP)); do [ -f out/final/$(printf "chunk_s%05d" $s).mp4 ] || MISSING+=($s); done
echo "missing: ${MISSING[*]}"
for s in "${MISSING[@]}"; do
  e=$((s+STEP-1)); [ $e -gt $LAST ] && e=$LAST; name=$(printf "chunk_s%05d" $s)
  ( PROPS='{"dpr":0.6}' CRF=16 node scripts/render.mjs out/final/part_$s.mp4 $s-$e 1 Godzilla24 1 > out/final/logs/$name.log 2>&1 && mv out/final/part_$s.mp4 out/final/$name.mp4 ) &
  while [ $(jobs -r | wc -l) -ge 3 ]; do sleep 5; done
done
wait
n=$(ls out/final/chunk_s*.mp4 | wc -l); echo "chunks $n / 22"; [ "$n" -eq 22 ] && touch out/final/DONE
