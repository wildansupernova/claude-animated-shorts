# Videos done

Every finished short made with this skill, gathered from the work branches into one place. Each folder keeps what
you need to rebuild the video later: the script with facts and sources, the full picture source, the voice track and
word timings, the sound design and mix scripts, and the build notes. All videos are 1080x1920 vertical, with our own
characters, story, synthesized score and SFX, and Kokoro TTS voices (AI-generated; disclose where a platform asks).

| Folder | Video | Length | From branch | Start here |
|---|---|---|---|---|
| `birthday-bet/` | **Would You Take This Bet?** The birthday paradox as a $2,200 party bet (v3, four voices, stakes HUD, 253 = 253 twist) | 55 s, 30 fps | `claude/birthday-paradox-short` (includes v1 from `claude/gallant-pascal-lpy05p`) | `README.md`, `SCRIPT.md` |
| `doomsday-recap/` | **The Road to Doomsday**: an animated recap of the films leading into Avengers: Doomsday (fan recap, our own drawings) | 3 min 15 s, 24 fps | `ccr-c7875b3a-drnzdt` | `README.md`, `SCRIPT.md`, `QA_REPORT.md` |
| `floor-zero-part-2/` | **Floor Zero, Part 2: "It Took a Step"**: cold open on its legs past its dusty prints; STAY IN ends with you facing the wall; VHS rewind; STEP OUT (zero was on the panel) into the game reveal ("clock out before 06:00"); it comes back one step closer; ① STAIRS / ② ELEVATOR | 93.3 s, 30 fps | `floor-zero-part-2` | `README.md`, `SCRIPT.md` |
| `floor-zero-part-3/` | **Floor Zero, Part 3: "Don't Step in the Water"**: your reflection smiles; STAIRS ends with a hand on your shoulder; the elevator ride (it steps closer each flicker, the clock jumps); -1 flooded, the rows die toward you; ① WADE / ② CLIMB | 87.8 s, 30 fps | `floor-zero-part-3` | `README.md`, `SCRIPT.md` |
| `floor-zero-part-4/` | **Floor Zero, Part 4: "Never Turn Around"**: a wall of security monitors, and it's right behind you; WADE ends with your own face smiling up out of the water; CLIMB: your reflection grabs your wrist (a grey print), the last light dies, −2 is bricked up ("if you hear typing…"), −3 every screen shows it behind you, badge UOY; ① TURN AROUND / ② KEEP WALKING | 85.3 s, 30 fps | `floor-zero-part-4` | `README.md`, `SCRIPT.md` |
| `floor-zero-part-5/` | **Floor Zero, Part 5: "There Are Two of You"**: TURN AROUND ends with it breathing on your neck and the monitors dying; KEEP WALKING: it stays one step behind on the screens, legs never moving; −5 a wall of photos, the empty frame "YOU · 21 NOV"; −7 the time clock, a message you never sent, 05:57, two of you (one mirrored); ① ONE / ② TWO | 84.1 s, 30 fps | `floor-zero-part-5` | `README.md`, `SCRIPT.md` |
| `floor-zero-series/` | **Floor Zero, Season 1 bible** (6 parts): the audited plan from Part 2 to the finale. Every rule is true and means exactly what it says; it only moves when nobody is watching; it becomes you, mirrored. | plan | `ccr-387febaf-ervqdy` | `SEASON.md` |
| `floor-zero-part-1/` | **Floor Zero, Part 1**: an interactive "what would you do?" horror series pilot (elevator past the ground floor, ends on ① STEP OUT / ② STAY IN). Night-interior relight with ceiling light pools, captions, choice tags | 96.5 s, 30 fps | `floor-zero-part-1` | `README.md`, `SCRIPT.md` |
| `forest-snitch/` | **The Forest Snitch**: how nature exposes buried bodies (forensic botany) | ~63 s, 30 fps | `claude/amazing-albattani-rvlgbr` | `README.md`, `SCRIPT.md` |
| `fritz-haber/` | **Bread and Bombs from Thin Air**: Fritz Haber, fertilizer and gas | 68 s, 30 fps | `claude/fritz-haber-short` (same commit as `claude/adoring-tesla-hqjljy`) | `NOTES.md`, `SCRIPT.md` |
| `henrietta-lacks/` | **The Woman Who Never Stopped**: Henrietta Lacks and the HeLa cells | 60 s, 30 fps | `claude/henrietta-lacks-short` | `NOTES.md`, `SCRIPT.md` |
| `ocean-fun-facts/` | Five ocean fun-fact shorts in one 2.5D Canvas project: **The Navy That Hunted Fish Farts** (69 s), **It Rained Whale** (71 s), **The Snot Highway** (72 s), **The Horses and the Electric Eels** (64 s), **Inky's Great Escape** (60 s) | 60-72 s, 30 fps | `ccr-9959e9ae-j7k2gj` | `README.md`, `POSTING.md`, `videos/<name>/SCRIPT.md` |

`claude/keen-ride-9bfoie` is not a video (a financial-freedom simulator page), so it is not included here.

## Rendered MP4s
Only `birthday-bet/birthday_paradox_short.mp4` (41 MB share encode) is in git. The other renders are larger than
GitHub's file limits and were git-ignored, so rebuild them from source with each folder's build notes.

## Rebuilding: what to know
- **3D shorts** (`birthday-bet`, `doomsday-recap`, `forest-snitch`, `fritz-haber`, `henrietta-lacks`) are Remotion +
  three.js projects built from `templates/bridge/`. `birthday-bet` and `doomsday-recap` are complete Remotion projects
  (`npm install`, then the steps in their README). `fritz-haber`, `henrietta-lacks` and `forest-snitch` hold the
  source to drop into a Remotion project as `src/videos/<name>/`, registered in `Root.tsx`. The `henrietta-lacks` and
  `forest-snitch` notes describe this, and `fritz-haber` is set up the same way as `henrietta-lacks` (`Haber.tsx`).
- **`ocean-fun-facts`** is a separate, faster Canvas2D project (8-15 min per short on 4 CPU cores). Its five shorts
  share `src/lib/`, `audio/` and `scripts/`, so they stay together in one folder.
- **Voice tracks** are committed for every video except `forest-snitch`. Its `voice.wav` was not saved, so regenerate
  it with `scripts/tts.py am_michael 1.26`. `words.json` holds the timings the cut was made to, and a fresh Kokoro run
  can differ slightly, so check the cues against the new voice.
- **Sound scripts:** most folders carry their own copy of the synth code in `audio/`. `birthday-bet` loads
  `templates/audio/` (`dsp.py`, `instruments.py`, `sfx_gen.py`) from the repo root. `forest-snitch` expects copies of
  those three files next to `audio/forest_audio.py`.
- **Absolute paths:** some render, assemble and finalize scripts still point at the working folders used at the time
  (`/home/user/haber-work`, `/home/user/forest-short`, `/home/user/remotion-shorts`, `/home/user/remotion-tmp`).
  Point them at your own work folder before running. Paths inside this repo were updated to `videos-done/`.
