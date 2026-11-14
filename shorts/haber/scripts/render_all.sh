#!/bin/bash
# render the Haber short in segments (CPU WebGL), one log per segment. usage: render_all.sh <from> <to> <name>
cd /home/user/haber-work/remotion
mkdir -p out/haber/seg
node scripts/render.mjs HaberShort out/haber/seg/$3.mp4 1 $1-$2 1 > out/haber/seg/$3.log 2>&1
echo "exit $?" >> out/haber/seg/$3.log
