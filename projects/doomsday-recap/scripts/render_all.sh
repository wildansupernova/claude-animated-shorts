#!/bin/bash
# Final render of Recap24 in short chunks (120 frames, ~10 min each) on 2 workers, each its own browser / SwiftShader
# GPU process. Resumable: finished chunks (out/final/chunk_s<start>.mp4) are skipped, so a recycled container only
# loses the chunks that were in flight. Writes out/final/DONE when every chunk exists.
cd "$(dirname "$0")/.."
LAST=4671; STEP=120
STARTS=(0 779); for ((s=1558; s<=LAST; s+=STEP)); do STARTS+=($s); done
end_of() { local i=$1; local n=$((i+1)); if [ $n -lt ${#STARTS[@]} ]; then echo $((STARTS[n]-1)); else echo $LAST; fi; }
SERVE=$(node scripts/bundle.mjs | tail -1); export SERVE
worker() { local w=$1; for ((i=w; i<${#STARTS[@]}; i+=2)); do
  s=${STARTS[$i]}; e=$(end_of $i); name=$(printf "chunk_s%05d" $s)
  [ -f out/final/$name.mp4 ] && continue
  PROPS='{"dpr":0.6}' CRF=16 node scripts/render.mjs out/final/part_$s.mp4 $s-$e 1 Recap24 1 > out/final/logs/$name.log 2>&1 && mv out/final/part_$s.mp4 out/final/$name.mp4
done; }
worker 0 & worker 1 & wait
n=$(ls out/final/chunk_s*.mp4 | wc -l); [ "$n" -eq "${#STARTS[@]}" ] && touch out/final/DONE
