# Camera lab: one short, 26 camera moves

An experiment to pick camera moves for future shorts. One 14 s explainer, **"Butter Side Down"**, is filmed 26 times
with the same story, voice and sound. Only the camera changes. The clips are joined into one review reel with a
numbered title card before each one, so you can say "I like 08 and 14, drop 21".

- **What each move is and when to use it:** `references/CAMERA_MOVES.md` (the catalogue, with the house numbers).
- **The move helpers:** `src/videos/camlab/moves.ts`. They are plain functions on `{pos, look, fov, roll}` that stack, so
  they can be copied into any short's `story.ts`.
- **The 26 camera plans:** `src/videos/camlab/variants.ts`.

## The story (13.2 s of voice, 14 s clip)
> Toast really does land butter side down. And it's not bad luck. Blame your table. It's only about seventy-five
> centimeters tall. The toast tips off the edge, starts spinning, and only has time for half a turn. Splat. To land
> butter side up, it would need a table three meters tall.

Fact: R. A. J. Matthews, "Tumbling toast, Murphy's Law and the fundamental constants", *European Journal of Physics*
16 (1995) 172-176 (Ig Nobel Prize in Physics 1996). From a normal table, toast has time for about half a turn before it
hits the floor. A table about 3 m tall gives it time for a full turn, so it lands butter side up.

Beats: S1 hook (kid and toast), S2 the table and a measuring stick, S3 the toast tips and falls, S4 splat, S5 the
garden, where the kid stands on a 3 m table and a second toast lands butter side up.

## The reel
| # | Move | # | Move |
|---|---|---|---|
| 00 | Baseline (what our shorts do today) | 13 | Whip pan |
| 01 | Push-in (dolly in) | 14 | Fly-through |
| 02 | Pull-out reveal | 15 | Dutch roll |
| 03 | Pan | 16 | Impact shake |
| 04 | Tilt | 17 | Rack focus |
| 05 | Truck (slide) | 18 | Foreground wipe |
| 06 | Pedestal (boom) | 19 | Low angle |
| 07 | Crane / jib | 20 | Top-down |
| 08 | Arc / orbit | 21 | POV (toast cam) |
| 09 | Follow / tracking | 22 | Speed ramp |
| 10 | Lens zoom | 23 | Overshoot & settle |
| 11 | Snap zoom | 24 | Spin transition |
| 12 | Dolly zoom (vertigo) | 25 | Mixed (recommended) |

The label at the top left shows the number and the move. A yellow tag under it lights up while the featured move is
happening.

## Build (Linux, no GPU)
```bash
npm install && npm run fonts
uv venv -p 3.12 .venv && VIRTUAL_ENV=.venv uv pip install kokoro soundfile scipy torch --extra-index-url https://download.pytorch.org/whl/cpu
(cd voice && ../.venv/bin/python gen_voice.py)          # voice.wav + words.json (already committed)
cp voice/words.json src/videos/camlab/words.json
npm run timeline                                         # out/timeline.json for the sound
.venv/bin/python audio/reel_audio.py                     # out/audio/reel.wav, -14 LUFS, -1 dBTP
node scripts/vstills.mjs CamReel720 out/vs 0,1,2 30,120,215,300,345,400   # check framings first
node scripts/render-chunks.mjs 4 "$(python3 -c "print(','.join(f'{v*420+k*105}-{v*420+k*105+104}' for v in range(26) for k in range(4)))")"
node scripts/cards.mjs CamCards720 out/cards
scripts/assemble.sh                                      # out/camera_moves_reel.mp4
```
Set `OUTDIR=out/reel` for the chunk render (`assemble.sh` reads `out/reel/`), and `TEMP`/`TMP` to a roomy folder.

**Gotchas found here:**
- **Pin the post stack.** With `@react-three/postprocessing` 3.2.2, `postprocessing` 6.39 and `@react-three/fiber` 9.8
  the EffectComposer renders blank frames under Remotion. `package.json` pins 3.0.4 / 6.37.8 / 9.4.0, which work.
- **MSAA 0 gives blank frames** in this composer. MSAA 2 costs the same as 4.
- **Speed:** at 720x1280 with ink, lens blur, motion blur and bloom, one worker takes about 2 s per frame; four workers
  together take about 1.3 s per frame. The 26 clips (10,920 frames) take about 4 hours on 4 CPU cores.
- **Clamp easing input.** A custom ease like `u => u ** 3` must get `u` clamped to 0..1 (`prog()` does this), or the
  move runs backwards before its cue.
- **Characters from above:** cards are yaw-only billboards, so from a high camera they go edge-on. `world.ts` leans them
  back toward the lens (up to 69°) so top-down shots still read.
