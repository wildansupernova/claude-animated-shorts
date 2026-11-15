#!/bin/bash
# render + mux the remaining shorts one after another
cd /home/user/claude-animated-shorts/shorts
mux() { ffmpeg -y -loglevel error -i out/$1/video.mp4 -i videos/$1/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart final/$2.mp4 && echo "MUXED $2"; }
while pgrep -f "render.mjs Hagfish" > /dev/null; do sleep 10; done
mux hagfish 03_hagfish_slime_highway
node scripts/render.mjs Eels out/eels/video.mp4 all 1 3 > out/eels/render.log 2>&1 && mux eels 04_electric_eels_vs_horses
node scripts/render.mjs Inky out/inky/video.mp4 all 1 3 > out/inky/render.log 2>&1 && mux inky 05_inky_octopus_escape
echo QUEUE_DONE
