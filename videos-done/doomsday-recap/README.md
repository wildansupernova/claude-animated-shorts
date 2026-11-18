# The Road to Doomsday — animated recap short

An unofficial fan recap, made with this repo's cartoon-3D-short skill, of every Marvel movie that leads into
**Avengers: Doomsday** (in theaters December 18, 2026). It runs 3 min 15 s, vertical 1080x1920 at 24 fps, with
narration, subtitle captions (the current word is highlighted), a movie-title chip for each chapter, an original
synthesized score and SFX.

Everything here is our own: the cartoon drawings (bean-head cards in the skill's style), the script, the voice
(Kokoro TTS, `af_heart`) and the music. There is no film footage, no logos and no studio music.

## Watch list covered, in order
| # | Title | Year |
|---|---|---|
| 01 | X-Men · X2 | 2000 · 2003 |
| 02 | Iron Man → The Avengers | 2008 – 2012 |
| 03 | Avengers: Infinity War | 2018 |
| 04 | Avengers: Endgame | 2019 |
| 05 | Loki, seasons 1 & 2 (series) | 2021 – 2023 |
| 06 | Spider-Man: No Way Home | 2021 |
| 07 | Doctor Strange in the Multiverse of Madness | 2022 |
| 08 | Black Panther: Wakanda Forever | 2022 |
| 09 | Ant-Man and the Wasp: Quantumania | 2023 |
| 10 | The Marvels | 2023 |
| 11 | Deadpool & Wolverine | 2024 |
| 12 | Captain America: Brave New World | 2025 |
| 13 | Thunderbolts* | 2025 |
| 14 | The Fantastic Four: First Steps | 2025 |
| 15 | Spider-Man: Brand New Day | 2026 |
| NEXT | Avengers: Doomsday | Dec 18, 2026 |

`SCRIPT.md` lists the facts and their sources.

## Layout
- `voice/lines.json` holds the script, one caption unit per line, with chapter ids. `voice/make_voice.py` writes `voice.wav` and `words.json` (word timings).
- `src/videos/doomsday/`:
  - `heroes.ts` holds the ~55 parametric cartoon costumes.
  - `sets.ts` builds the places: NYC, space, the TVA, the mansion, the desert/Void, the cave, snow, retro Earth-828, the Wakanda coast and Doom's castle.
  - `story.ts` holds 71 shots timed to the words, with cameras, cast and effects.
  - `world.ts` is the engine, and `Recap.tsx` is the composition plus captions and chips.
- `audio/score.py` writes the score, SFX and mix (`audio/out/mix.wav`, -14.4 LUFS, ≤ -1.2 dBTP).
- `scripts/`:
  - `stills.mjs` renders stills.
  - `frames.mjs` together with the `Contact` composition renders one frame per shot as a contact sheet.
  - `render_all.sh` runs the final render in chunks.
  - `finalize.sh` concatenates the chunks, muxes the audio and makes the share copy.
  - `short_qa.py` does the QA.

## Rebuild
```bash
npm install
python3.12 -m venv ~/tts && ~/tts/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu && ~/tts/bin/pip install kokoro soundfile scipy "misaki[en]"
(cd voice && ~/tts/bin/python make_voice.py af_heart 1.3) && cp voice/words.json src/videos/doomsday/words.json
~/tts/bin/python audio/score.py
scripts/render_all.sh && scripts/finalize.sh
```

## Notes from this build (CPU-only cloud container, 4 cores, SwiftShader WebGL)
- The bridge template's full post chain cost about 19 s/frame here. This recap keeps the look but costs ~2.8 s/frame:
  - ink pass with 2 sample directions;
  - tone map and grade folded into the ink composite, as one final pass;
  - sky drawn last;
  - geometry merged per 40 m cell, so it sorts front to back;
  - no shadow maps, DOF, bloom or MSAA;
  - WebGL buffer at 0.6x (648x1152), with captions drawn by HTML at full 1080x1920;
  - 24 fps.
- In a vertical frame, groups must fit within ~3 m at ~7 m from the lens: space characters 0.85-1.0 m apart.
- Character cards are ~1.75 m tall (head centre ≈ 1.45 m). Aim medium shots at ~1.0-1.2 m, not at eye height.
- `Freeze` did not reach the R3F tree in this setup, so contact sheets pass the frame as a prop (`<Recap frame={f} />`).
