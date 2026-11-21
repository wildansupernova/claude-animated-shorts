# Videos done

Every finished short made with this skill, gathered from the work branches into one place. Each folder keeps what
you need to rebuild the video later: the script with facts and sources, the full picture source, the voice track and
word timings, the sound design and mix scripts, and the build notes. All videos are 1080x1920 vertical, with our own
characters, story, synthesized score and SFX, and Kokoro TTS voices (AI-generated; disclose where a platform asks).

| Folder | Video | Length | From branch | Start here |
|---|---|---|---|---|
| `birthday-bet/` | **Would You Take This Bet?** The birthday paradox as a $2,200 party bet (v3, four voices, stakes HUD, 253 = 253 twist) | 55 s, 30 fps | `claude/birthday-paradox-short` (includes v1 from `claude/gallant-pascal-lpy05p`) | `README.md`, `SCRIPT.md` |
| `doomsday-recap/` | **The Road to Doomsday**: an animated recap of the films leading into Avengers: Doomsday (fan recap, our own drawings) | 3 min 15 s, 24 fps | `ccr-c7875b3a-drnzdt` | `README.md`, `SCRIPT.md`, `QA_REPORT.md` |
| `floor-zero-part-2/` | **Floor Zero, Part 2: the Night Shift**: STAY IN ends with you facing the wall, VHS rewind, STEP OUT into the game reveal (every screen: 7 floors, 1 rule each), new choice ① STAIRS / ② ELEVATOR | 91.1 s, 30 fps | `floor-zero-part-2` | `README.md`, `SCRIPT.md` |
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
