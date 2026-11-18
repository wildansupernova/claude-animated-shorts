#!/bin/bash
# concat the chunks, mux the mix (Remotion's silent track is not used: -map 0:v:0 -map 1:a:0), run QA
set -e
D=/home/user/remotion-shorts/out/forest
cd $D/chunks
ls c_*.mp4 | sort | sed "s/^/file '/; s/$/'/" > list.txt
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy $D/video.mp4
ffmpeg -v error -y -i $D/video.mp4 -i /home/user/forest-short/audio/out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart $D/final.mp4
mkdir -p /home/user/claude-animated-shorts/output
cp $D/final.mp4 /home/user/claude-animated-shorts/output/the-forest-snitch-v2.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames,duration -of compact $D/final.mp4
