# Ocean fun-fact shorts (2.5D canvas pipeline)

Five 60-72 s vertical (1080x1920, 30 fps) animated fact shorts with an expressive AI voice-over, word-by-word captions,
synthesized SFX and an original procedural score. This project is a fast CPU-only variant of the repo's cartoon short
skill: instead of rendering a full three.js world per frame (over 30 s/frame without a GPU), every frame is painted on a
Canvas2D in Remotion: layered painted sets with parallax, the skill's toon characters (`src/lib/toon.ts`), cartoon FX,
camera glides/push-ins/kicks and crossfades. A full short renders in about 8-15 minutes on 4 CPU cores.

| # | Short | Story |
|---|---|---|
| 1 | `videos/herring` | Sweden's navy hunted "Soviet submarines" for years: herring farts (Ig Nobel 2004) |
| 2 | `videos/whale` | Oregon, 1970: a dead whale, half a ton of dynamite, and Walter's brand-new car |
| 3 | `videos/hagfish` | 2017: a truck spills 7,500 lb of hagfish onto Highway 101, slime everywhere |
| 4 | `videos/eels` | Humboldt's eels vs horses (1800), proven by Kenneth Catania (2016-17) |
| 5 | `videos/inky` | Inky the octopus escapes his aquarium down a drainpipe to the sea (2016) |

Each `videos/<name>/` holds `SCRIPT.md` (facts + sources), `voice/lines.txt` (per-line speed/pause, emphasis markup),
`voice/voice.wav` + `voice/words.json` (word timings) and `cues.py` (SFX events, music sections). The pictures live in
`src/videos/<name>/{actors,story}.ts`; shots for videos 3-5 are cued straight from the word timings (`src/lib/cues.ts`).

## Pipeline
1. Voice: `~/tts-venv/bin/python tools/voice.py videos/<name>/voice/lines.txt videos/<name>/voice am_puck`
   (Kokoro TTS, `am_puck`, per-line speed for an expressive read; writes word timings for the captions).
2. Stills: `node scripts/stills.mjs <Comp> out/<name>/st_ 100,400,900 0.5`, sheets with `tools/sheet.py`.
3. Sound: `~/tts-venv/bin/python audio/mixdown.py videos/<name>` (voice + ducked score + SFX + beds, -14 LUFS, <= -1 dBTP).
4. Render: `node scripts/render.mjs <Comp> out/<name>/video.mp4 all 1 3`, then mux with
   `ffmpeg -i video.mp4 -i mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out.mp4`.

Rules learned: keep faces above ~y 1150 or below ~y 1400 (captions sit at 65 % height); never use `ctx.filter` blur per
frame (it costs ~5 s/frame); don't `np.convolve` long envelopes in the mix (use `uniform_filter1d`).
