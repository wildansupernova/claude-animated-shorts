# Render "Floor Zero, Part 5" on your own computer

Paste the prompt below into a Claude Code session running on your computer (Claude desktop app or the `claude` CLI). A
computer with a graphics card renders this in roughly 15-45 minutes; the cloud container has no GPU and needs about 2.5 h.

---

**Prompt:**

Render the finished vertical short "Floor Zero, Part 5" on this computer and give me the final MP4.

Context:
- Repo: `https://github.com/wildansupernova/claude-animated-shorts`, branch `floor-zero-part-5`, project folder
  `videos-done/floor-zero-part-5/`. It's a Remotion 4 + three.js project: entry `src/index.ts`, composition id
  `FloorZero5`, 2522 frames at 1080x1920, 30 fps (84.07 s): "There Are Two of You", per
  `videos-done/floor-zero-series/SEASON.md`. Floor -3 redraws a 2D security feed onto every monitor each frame (a
  canvas texture), and many shots are full-screen 2D canvas inserts (monitor wall, phone, photo wall).
- The picture renders silent. The finished sound mix is `audio/mix.m4a` (AAC 256 kbps; the lossless master is
  `audio/mix.flac`) and gets muxed in afterwards.
- Remotion's CLI ships its own ffmpeg and ffprobe (`npx remotion ffmpeg ...`), so no separate ffmpeg install is
  needed.
- The picture is final. Don't edit anything in `src/`, and don't commit or push the rendered MP4s (they're large;
  `out/` is git-ignored).

Steps:
1. **Get the code.**
   - If this repo is already cloned here, run `git fetch origin floor-zero-part-5` and `git checkout floor-zero-part-5`,
     then `git pull`.
   - Otherwise clone the repo and check out `floor-zero-part-5`.
   - Then `cd videos-done/floor-zero-part-5`.
2. **Install.** Check `node -v` is 20 or newer (install Node LTS if not), then `npm install` and `npm run fonts`.
3. **Pick the GPU mode.**
   - Run `npx remotion gpu` and note whether WebGL is hardware accelerated.
   - The `--gl` value to use: macOS or Windows → `angle`; Linux with a GPU → `angle-egl` (fallback `egl`); no
     usable GPU → `swangle` (works, but slow).
4. **Test two stills first.**
   - Run `npx remotion still src/index.ts FloorZero5 out/test_1310.png --frame=1310 --gl=<mode> --timeout=120000`,
     and the same for `--frame=2330` → `out/test_2330.png`.
   - Look at both images.
     - Frame 1310: a sepia wall of framed photos, pushed in on two brass plates, "D. HALE · 14 NOV" (a tall man
       from behind) and "YOU · 21 NOV" (an empty frame); caption "AND IT HAS YOUR NAME ON IT."
     - Frame 2330: red light; two identical cartoon workers side by side in front of a time clock reading 05:57,
       under a sign "-7. ONLY ONE OF YOU CAN CLOCK OUT."; caption "LOOK CLOSELY BEFORE YOU ANSWER."
   - Compare them with `preview_frames.jpg` in the same folder.
   - If the 3D picture is black or empty (only captions visible), try the next `--gl` value and test again.
   - Tell me how long each still took.
5. **Render the picture.**
   - Command:
     `npx remotion render src/index.ts FloorZero5 out/video.mp4 --codec=h264 --crf=16 --gl=<mode> --concurrency=2 --timeout=120000 --muted`
   - Start with concurrency 2. If it averages under 0.5 s per frame and the GPU isn't maxed out, stop and retry
     with 3 or 4 only if that's clearly faster.
   - If the whole render is going to take more than about 2 hours, tell me before carrying on.
6. **Add the sound.** Run
   `npx remotion ffmpeg -y -i out/video.mp4 -i audio/mix.m4a -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -movflags +faststart out/floor_zero_part5_master.mp4`
7. **Make the share version** (smaller, for Reels / TikTok / Shorts). Run
   `npx remotion ffmpeg -y -i out/floor_zero_part5_master.mp4 -c:v libx264 -preset slow -crf 21 -tune animation -maxrate 7M -bufsize 14M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart out/floor_zero_part5.mp4`
8. **Verify.**
   - `npx remotion ffprobe out/floor_zero_part5.mp4` should show 1080x1920, 30 fps, about 84.1 s, and both a video
     and an audio stream.
   - Grab frames at 1 s (red: the two of you, the clock at 05:57), 23 s (walking the green office), 47 s (the photo
     wall) and 83 s (the two of you with the ① and ② pills), e.g.
     `npx remotion ffmpeg -y -ss 23 -i out/floor_zero_part5.mp4 -frames:v 1 out/check_23.jpg`, and confirm none
     are black.
   - Planned blacks: 17.8–19.7 s (the end of the turn-around branch), 65.3–69.4 s (the light dies; only a faint red
     "05:57" shows), and three short flickers around 72.8, 73.8 and 75.6 s.
9. **Report back:** the paths and sizes of `out/floor_zero_part5_master.mp4` and `out/floor_zero_part5.mp4`, the
   total render time, the `--gl` mode used, and anything that went wrong.
