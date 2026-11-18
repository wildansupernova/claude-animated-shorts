# The Man with the Golden Arm (2.5D canvas short)

A ~68 s vertical (1080x1920, 30 fps) animated fact short about James Harrison (1936-2025), the Australian plasma
donor whose anti-D antibodies are estimated to have helped protect 2.4 million babies. Same fast CPU-only pipeline as
`../ocean-fun-facts/` (Canvas2D in Remotion, toon characters, word-by-word captions, Kokoro TTS `am_puck`, procedural
score + SFX). `src/lib/`, `scripts/`, `audio/` and `tools/` are copies of that project's, so this folder rebuilds on
its own (`npm ci`, or symlink `node_modules` from `../ocean-fun-facts`).

- Script, facts, sources and the hook pick (viral-hooks skill): `videos/goldenarm/SCRIPT.md`
- Research notes: `../../ideas/golden-arm/RESEARCH.md`
- Picture: `src/videos/goldenarm/{actors,story}.ts`, composition `GoldenArm` in `src/Root.tsx`
- Voice: `videos/goldenarm/voice/` (`lines.txt`, `voice.wav`, `words.json`); sound cues: `videos/goldenarm/cues.py`
- Posting sheet: `POSTING.md`

## Rebuild
1. Voice: `~/tts-venv/bin/python tools/voice.py videos/goldenarm/voice/lines.txt videos/goldenarm/voice am_puck`
   (Python 3.12 venv with `kokoro`, `soundfile`, `scipy`, `pyloudnorm` and spaCy `en_core_web_sm`).
2. Stills: `node scripts/stills.mjs GoldenArm out/ga/st_ 100,400,900 0.5`
3. Sound: `~/tts-venv/bin/python audio/mixdown.py videos/goldenarm` (-14 LUFS)
4. Render: `node scripts/render.mjs GoldenArm out/ga/video.mp4 all 1 3` (about 2 min on 4 cores), mux with
   `ffmpeg -i out/ga/video.mp4 -i videos/goldenarm/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/ga/master.mp4`,
   then make the share encode (see the video-workflow skill).
