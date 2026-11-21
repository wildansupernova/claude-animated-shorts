# Floor Zero, Part 3: "Don't Step in the Water"

Episode 3 of **Floor Zero** (Parts 1-2: `videos-done/floor-zero-part-1/`, `videos-done/floor-zero-part-2/`), built from
`SCRIPT.md`, the audited script, per `videos-done/floor-zero-series/SEASON.md`. It runs 87.80 s (2634 frames) at
1080x1920, 30 fps, with burned-in captions.

## The episode
- **Cold open (3.2 s):** "Floor minus one is flooded. Don't step in it." You look down, scared; your reflection in the
  black water looks back up, smiling. Text: "YOUR REFLECTION ISN'T COPYING YOU."
- **Recap:** stairs or elevator. A silent vote banner shows only with real numbers (`VOTES` in `story.ts`).
- **① STAIRS (loses; new sense: touch):** red stairwell; the footsteps stop right below you; your phone light finds an
  empty landing; the lamp flickers; a grey hand settles on your shoulder.
- **VHS rewind.**
- **② ELEVATOR:**
  - You ride down with it. Three flickers, and after each one it's a step closer.
  - The HUD clock jumps forward after each blackout (the dark eats time).
  - A 1 s brushed-steel insert shows your badge reflected: "UOY".
  - "It's your height now. It has ears now. And it's wearing a red lanyard. Like yours."
- **Floor -1:**
  - Your office, flooded. "-1. DON'T STEP IN THE WATER."
  - The stairs down are behind a fire door at the far end. The near stairwell door is taped off.
  - The rows of lights die, one row at a time, toward you.
- **Choice:** ① WADE / ② CLIMB.
- **Unnarrated clues:** the "UOY" reflection; a badge floating face-up reading "D. HALE"; one extra person who exists
  only in the water's reflection.

## How it's built (on top of Part 2's engine)
- **`flood.ts`:**
  - The water is a three.js `Reflector` with a dimmed teal shader.
  - Its camera sees the room (layer 0) and reflection-only cards (layer 6), never the real cast (NOINK, layer 3).
    That's how the reflection can smile and show an extra person.
  - `ink.ts`'s `noInkFallback` skips layer 6.
- **The figure's stages (`figStageAt`):** it shrinks from 1.3x to your height over the three flickers, then gets ears
  and a red lanyard (the back view now draws the strap, `toon.ts`).
- **New looks:** `stair` (red emergency lamp) and `flood` (black-teal) light and grade presets.
- **Sound (`audio/sound.py`, 41 cues):**
  - stairwell draught and lamp buzz;
  - footsteps that stop;
  - the hand's sub hit;
  - flicker crackles with a footstep in each dark;
  - the car's motor bed;
  - the ding and doors on -1;
  - drips;
  - one relay clunk per dying row.
- **QA:**
  - Whisper hears 227/230 words; it writes "one percent" as "1%" and hears "has" as "is".
  - The mix is -14.0 LUFS, -1.18 dBTP.
  - Stills are in `preview_frames.jpg`.

## Render
- **On a GPU machine:** `RENDER_ON_YOUR_COMPUTER.md` (composition `FloorZero3`, 2634 frames; mux `audio/mix.m4a`).
- **To rebuild the sound:** `node scripts/dump-timeline.mjs` writes `out/timeline3.json`, then run
  `python audio/sound.py` (with `AUDIO_LIB=<repo>/templates/audio`).
