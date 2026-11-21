# Render "Floor Zero, Part 2" on your own computer

Paste the prompt below into a Claude Code session running on your computer (Claude desktop app or the `claude` CLI). A
computer with a graphics card renders this in roughly 15-45 minutes; the cloud container has no GPU and needs about 2.5 h.

---

**Prompt:**

Render the finished vertical short "Floor Zero, Part 2" on this computer and give me the final MP4.

Context:
- Repo: `https://github.com/wildansupernova/claude-animated-shorts`, branch `floor-zero-part-2`, project folder
  `videos-done/floor-zero-part-2/`. It's a Remotion 4 + three.js project: entry `src/index.ts`, composition id
  `FloorZero2`, 2734 frames at 1080x1920, 30 fps (91.13 s).
- The picture renders silent. The finished sound mix is `audio/mix.m4a` (AAC 256 kbps; the lossless master is
  `audio/mix.flac`) and gets muxed in afterwards.
- Remotion's CLI ships its own ffmpeg and ffprobe (`npx remotion ffmpeg ...`), so no separate ffmpeg install is
  needed.
- The picture is final. Don't edit anything in `src/`, and don't commit or push the rendered MP4s (they're large;
  `out/` is git-ignored).

Steps:
1. **Get the code.**
   - If this repo is already cloned here, run `git fetch origin floor-zero-part-2` and `git checkout floor-zero-part-2`,
     then `git pull`.
   - Otherwise clone the repo and check out `floor-zero-part-2`.
   - Then `cd videos-done/floor-zero-part-2`.
2. **Install.** Check `node -v` is 20 or newer (install Node LTS if not), then `npm install` and `npm run fonts`.
3. **Pick the GPU mode.**
   - Run `npx remotion gpu` and note whether WebGL is hardware accelerated.
   - The `--gl` value to use: macOS or Windows → `angle`; Linux with a GPU → `angle-egl` (fallback `egl`); no
     usable GPU → `swangle` (works, but slow).
4. **Test two stills first.**
   - Run `npx remotion still src/index.ts FloorZero2 out/test_1760.png --frame=1760 --gl=<mode> --timeout=120000`, and
     the same for `--frame=2600` → `out/test_2600.png`.
   - Look at both images. Frame 1760 should show rows of office monitors all reading "NIGHT SHIFT" with a red
     countdown. Frame 2600 should show the elevator wall: an open stairwell door under an EXIT sign (left), the open
     elevator with a tall grey figure inside (right), the cartoon worker between them, and two numbered tags
     (1 STAIRS, 2 ELEVATOR).
   - Compare them with `preview_frames.jpg` in the same folder.
   - If the 3D picture is black or empty (only captions visible), try the next `--gl` value and test again.
   - Tell me how long each still took.
5. **Render the picture.**
   - Command:
     `npx remotion render src/index.ts FloorZero2 out/video.mp4 --codec=h264 --crf=16 --gl=<mode> --concurrency=2 --timeout=120000 --muted`
   - Start with concurrency 2. If it averages under 0.5 s per frame and the GPU isn't maxed out, stop and retry
     with 3 or 4 only if that's clearly faster.
   - If the whole render is going to take more than about 2 hours, tell me before carrying on.
6. **Add the sound.** Run
   `npx remotion ffmpeg -y -i out/video.mp4 -i audio/mix.m4a -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -movflags +faststart out/floor_zero_part2_master.mp4`
7. **Make the share version** (smaller, for Reels / TikTok / Shorts). Run
   `npx remotion ffmpeg -y -i out/floor_zero_part2_master.mp4 -c:v libx264 -preset slow -crf 21 -tune animation -maxrate 7M -bufsize 14M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart out/floor_zero_part2.mp4`
8. **Verify.**
   - `npx remotion ffprobe out/floor_zero_part2.mp4` should show 1080x1920, 30 fps, about 91.1 s, and both a video
     and an audio stream.
   - Grab frames at 5 s, 40 s, 60 s and 89 s, e.g.
     `npx remotion ffmpeg -y -ss 40 -i out/floor_zero_part2.mp4 -frames:v 1 out/check_40.jpg`, and confirm none
     are black.
9. **Report back:** the paths and sizes of `out/floor_zero_part2_master.mp4` and `out/floor_zero_part2.mp4`, the
   total render time, the `--gl` mode used, and anything that went wrong.
