# Claude Animated Shorts: agent guide

This repo is for making animated vertical short videos and publishing them.

- **Make a video:** follow the root `SKILL.md` (the `cartoon-3d-short` skill). It covers the full pipeline, look values and gotchas, and `templates/` and `references/` back it up.
- **Camera moves:** pick a different, motivated move per beat with the `camera-moves` skill (`.claude/skills/camera-moves/SKILL.md`). It covers which move suits which situation, with house numbers and helpers. The full catalogue is `references/CAMERA_MOVES.md`, and the demo reel is in `experiments/camera-lab/`.
- **Interactive "what would you do?" series:** for episodic choose-your-path horror shorts (numbered choices,
  comment votes, "let's rewind" sequels), follow `references/INTERACTIVE_SERIES_FORMULA.md`. It has the beat sheets,
  the dilemma checklist, the picture, caption and sound specs, series seeds and a worked example.
- **Finished videos:** each one lives in `videos-done/<slug>/` with its script, source, voice, sound and build notes. The index is `videos-done/README.md`; add each new video there.
- **Upload and post:** use the `video-workflow` skill (`.claude/skills/video-workflow/SKILL.md`). It hosts the MP4 on Tigris and queues the posts with the Buffer connector. Tigris needs the env vars `TIGRIS_STORAGE_ACCESS_KEY_ID`, `TIGRIS_STORAGE_SECRET_ACCESS_KEY` and `TIGRIS_STORAGE_ENDPOINT`; check them with `python3 .claude/skills/video-workflow/scripts/tigris.py check`.
- **Standing rules:**
  - Never print, commit or ask for the Tigris keys in chat.
  - Post through Buffer only when the user asks; queue by default.
  - After the Buffer posts are `sent`, delete the uploaded file from Tigris. Never delete it before then, because Buffer fetches the media at publish time.
