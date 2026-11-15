# The Forest Snitch (second example short)

A ~70 s vertical short on "how nature can expose buried bodies" (forensic botany), built from `templates/bridge/` and the
pipeline in `SKILL.md`. Story, characters, script and voice are our own; facts and sources are in `SCRIPT.md`.

Beats: hook ("If you bury a body in the woods, the forest will snitch on you") → Gary, a shovel and a very heavy rug →
the dig → the grass turns brown in a rectangle → regrows greener → mushrooms → the ground sinks → Luckily / Unluckily →
why (loosened soil, nitrogen, the dog-pee-on-the-lawn analogy, the "corpse finder" mushroom) → search teams and drones →
picnic callback.

## What is new compared to the bridge template
| File | What changed |
|---|---|
| `story.ts` | New shot plan timed to `words.json`; the grave patch state (hole, mound, rug, brown, lush, tufts, mushrooms, sink) is a pure function of shot + frame (`patchAt`). |
| `world.ts` | Procedural forest clearing (no Kenney assets needed), ground with an opening for the dynamic patch mesh, patch shader (dead / lush / soil / seam / ring), instanced grass tufts, mushrooms, rug, drone, fertilizer sack, picnic blanket, suburban lawn. Trees are batched in 16 sectors for frustum culling. |
| `cast.ts` | Same card / pool machinery; new staging for Gary, the search team, the homeowner, the dog and the picnic family. |
| `toon.ts` | Adds a shovel prop, beanie, hi-vis vest stripes, `fxDog`, `fxShroomFace`, `fxDirt`, `fxSparkle`, `fxSweat`, and the outfits. |
| `Captions.tsx` | Burned-in word-timed subtitles (Montserrat Black, 1-3 words per group, spoken word highlighted). `inputProps { captions: false }` turns them off. Needs `public/montserrat-900.woff2` (from `@fontsource/montserrat`). |
| `audio/forest_audio.py` | Original sneaky pizzicato score, synthesized SFX on the picture's frames, ducking, -15 LUFS mix (uses `templates/audio/{dsp,instruments,sfx_gen}.py`). |
| `scripts/` | `tts.py` (Kokoro voice), `words.py` (faster-whisper word times aligned to the script), `stills.mjs`, `chunks.mjs` (per-shot chunk render), `sheet.py` (contact sheets). |

## Run it
1. Remotion project with `remotion`, `@remotion/three`, `three@0.169`, `@react-three/fiber@8`, `@react-three/postprocessing@2`, `postprocessing`.
2. Copy this folder to `src/videos/forest/`, register `ForestShort` (`FOREST_FRAMES`, 30 fps, 1080x1920) in `Root.tsx`.
3. Voice: `python scripts/tts.py am_michael 1.15`, then `python scripts/words.py` → copy `words.json` here.
4. Stills: `node scripts/stills.mjs ForestShort out/forest/x_ 30,305,1310 0.5`.
5. Film: `node scripts/chunks.mjs ForestShort out/forest/chunks 3`, concat the chunks, mux with `audio/out/mix.wav`.

On a machine without a GPU (SwiftShader) the full film renders at ~0.2 fps; with a GPU it is much faster.
