#!/bin/bash
# join segments (B's frames 943-1042 replaced by the patch P), mux the mix, export 1080p + lanczos 1440p
set -e
cd /home/user/haber-work/remotion/out/haber
ffmpeg -loglevel error -y -i seg/A.mp4 -i seg/B.mp4 -i seg/P.mp4 -i seg/C.mp4 -i /home/user/haber-work/audio/mix.wav -filter_complex \
 "[1:v]trim=start_frame=0:end_frame=243,setpts=PTS-STARTPTS[b1];[1:v]trim=start_frame=343,setpts=PTS-STARTPTS[b2];[0:v][b1][2:v][b2][3:v]concat=n=5:v=1:a=0,fps=30[v]" \
 -map "[v]" -map 4:a -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 256k -ar 48000 haber_1080x1920.mp4
ffmpeg -loglevel error -y -i haber_1080x1920.mp4 -vf "scale=1440:2560:flags=lanczos" -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a copy haber_1440x2560.mp4
ffprobe -v error -count_frames -show_entries stream=codec_type,width,height,nb_read_frames:format=duration -of compact haber_1080x1920.mp4
