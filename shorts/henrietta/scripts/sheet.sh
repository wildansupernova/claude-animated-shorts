#!/bin/bash
# usage: sheet.sh out.jpg cols img1 img2 ...  (each scaled to 360x640, labelled)
out=$1; cols=$2; shift 2
args=(); filt=""; i=0
for f in "$@"; do args+=(-i "$f"); lbl=$(basename "$f" .jpg); filt+="[$i:v]scale=360:640,drawtext=text='$lbl':x=8:y=8:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.6[v$i];"; i=$((i+1)); done
n=$i; rows=$(( (n + cols - 1) / cols )); lay=""
for ((k=0;k<n;k++)); do x=$(( (k % cols) * 360 )); y=$(( (k / cols) * 640 )); lay+="${x}_${y}|"; done
ins=""; for ((k=0;k<n;k++)); do ins+="[v$k]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filt}${ins}xstack=inputs=$n:layout=${lay%|}:fill=black[o]" -map "[o]" -q:v 3 "$out"
