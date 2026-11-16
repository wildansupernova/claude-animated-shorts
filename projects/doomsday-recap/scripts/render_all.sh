#!/bin/bash
# Final render: Recap24 in 6 chunks on 2 workers (each its own browser = its own SwiftShader GPU process).
cd "$(dirname "$0")/.."
CH=("0-778" "779-1557" "1558-2336" "2337-3115" "3116-3894" "3895-4671")
worker() { for i in "$@"; do
  [ -f out/final/chunk_$i.mp4 ] && continue
  PROPS='{"dpr":0.6}' CRF=16 node scripts/render.mjs out/final/part_$i.mp4 ${CH[$i]} 1 Recap24 1 > out/final/chunk_$i.log 2>&1 && mv out/final/part_$i.mp4 out/final/chunk_$i.mp4
done; }
worker 0 2 4 & worker 1 3 5 & wait
touch out/final/DONE
