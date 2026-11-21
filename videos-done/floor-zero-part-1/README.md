# Floor Zero, Part 1: an interactive "what would you do?" horror short

**Watch:** `floor_zero_part1.mp4` (96.5 s, 1080x1920, 30 fps, burned-in captions). It's committed here only if it stays
under GitHub's 50 MB warning; otherwise rebuild it with the steps below.

Episode 1 of our original series **Floor Zero**, built on the formula in `references/INTERACTIVE_SERIES_FORMULA.md`.
You're the last one leaving the office. The elevator goes right past the ground floor and stops on floor zero, an
exact copy of your office. Something is breathing behind you, and the episode ends on a numbered choice:
① STEP OUT / ② STAY IN. `SCRIPT.md` has the script, the beat map, the on-screen text and the Part 2 plan.

## Render and posting record
- **Rendered** on the user's Mac (GPU) from `RENDER_ON_YOUR_COMPUTER.md`. The share encode is 23.5 MB, 1080x1920,
  30 fps, 2894 frames, 96.47 s, AAC 48 kHz stereo.
- **Frame QA** (`scripts/short_qa.py` on the posted file):
  - no black, white or silent spans; -14.5 LUFS, LRA 1.8, peak -1.0 dBFS;
  - the flagged "pops" are planned story events (light rows switching off, flickers, button flares);
  - the "frozen" spans are short camera holds (shots 13, 14b, 23).
  - The GPU render matches the CPU stills (ink, lighting, captions, tags).
- **Posted** from Tigris through Buffer, AI label off. Both posts were switched to "share now" in Buffer a couple
  of minutes after being queued, so they went out early:
  - TikTok: Sat 21 Nov, 16:08 WIB;
  - YouTube Short: 16:06 WIB.
  - Both are `sent`, so the Tigris file was deleted per the repo rule.

## What's in it
- **Picture:** our house style (flat bean-head cards in an inked 3D world, `templates/bridge/` lineage via
  `videos-done/birthday-bet/`), relit for night interiors. There are 27 shots, each with its own motivated camera move
  (camera-moves skill):
  - office: crane down to your desk, clock push-in, a follow as the light rows die behind you;
  - elevator: back-view truck to the call button, the walk into the car, tilt up to the floor display, pedestal down
    ("it keeps going"), a POV phone insert;
  - basement: tilt down the new 0..-7 buttons, a shake plus snap zoom on the jolt, rack focus to the rules card,
    tilt down the rules;
  - floor zero: a POV out of the doors, a low-angle truck past the turned chairs, a lens zoom to your monitor, a
    dolly zoom on "right behind you", a POV turn into the corner, a low angle on the figure, a pull-out as the doors
    close.
- **New world** (`office.ts`): an open-plan office at night (20 desks, swivel chairs, ceiling panel rows, windows on a
  night city, whiteboard, EXIT sign), the elevator wall (two elevators, sliding doors, call button, displays, clock)
  and the car (brushed steel, smoked mirror, handrails, button panel, display, the rules card). Dynamic canvases
  redraw only on change: floor displays, the car panel (basement buttons appear and glow), the call button, your
  monitor typing `YOU`, the clock, the phone lock screen.
- **New lighting** (`shade.ts`, `lights.ts`, `grade.ts`): the bridge's sun two-tone is replaced by up to 16 ceiling
  "pools". These are rectangular area lights with soft falloff, a wrap term and a z-clip, so office light never
  leaks into the car. A single overhead key still casts the contact shadows. Rows switch off one by one, the car
  light flickers, the open doors spill the car's light, and character cards are lit by the same pools on the CPU
  (`poolAt`). There are three presets (office, cab, zero), each with its own grade.
- **Cast** (`cast.ts`, `toon.ts`):
  - YOU walk (front stroll, back stroll, side march), sit, rise, reach, hold a phone, turn (front → profile → back)
    and stagger.
  - New drawings: the back view, a tall build, a lanyard with an ID badge, a phone prop, `fear` and `tired` faces, a
    pointing-hand card for button presses, ringing waves and a breath puff.
  - The one facing the wall: tall, thin, grey suit, white collar, no ears, always seen from behind, breathing slowly,
    one head twitch.
- **Captions and graphics:** 1-5 word chunks with key words in amber (the display's colour); the captions drop low
  under the rules card so Rule 2 stays readable. A small series title runs over the first two seconds. The numbered
  choice tags are projected from 3D anchors with leader lines, then pinned big at the top for the final question.
- **Voice** (`voice/gen_voice.py`): Kokoro-82M `af_heart`, chosen by measured intonation range and Kokoro's quality
  grade. The per-line speed is slower on the dread lines, with scripted pauses. Word timings come from the TTS and
  were checked against Whisper (median offset -0.006 s). `voice/alt_voice_sample_am_michael.m4a` is the male
  alternative; re-voice with `python gen_voice.py am_michael`, and since every cue is timed by word, the picture
  follows.
- **Sound** (`audio/sound.py`): 68 cues, all synthesized from the house kit (`templates/audio`):
  - SFX: office room tone and fluorescent hum thinning as each light row clunks off, chair casters, carpet then
    hard-floor footsteps on the walk cycle, call button, arrival chime, door motors, car motor and a deepening shaft
    wind, floor beeps, flicker crackle, three G stabs, phone low-battery chirps, an unanswered ringback, descending
    vibes for each basement button, the jolt (sub, metal, cable twang), a deep dong on "zero", the soft ding, chair
    swivel creaks, three key clacks, breathing in sync with the figure, a riser and sub boom on the dolly zoom, a
    whoosh, a neck crack, the slow door close and tag pops.
  - Score: an original dark drone with the Floor Zero motif (four falling music-box notes, a lift going down), a
    heartbeat that quickens toward the jolt and again for the choice, and a riser cut dead on the impact.
  - Master: -14.4 LUFS, -1.05 dBTP, LRA 1.9. Whisper recovers every narrated word through the full mix.

## Render on your own computer (fast, GPU)
Follow `RENDER_ON_YOUR_COMPUTER.md`: a ready-to-paste prompt for a Claude Code session on a Mac / Windows / Linux machine
(clone branch `floor-zero-part-1`, `npm install`, `npm run fonts`, test two stills, `npx remotion render ... --gl=angle`, mux
`audio/mix.m4a`). The finished sound is in `audio/` (`mix.flac` lossless, `mix.m4a` AAC for muxing, `cues.md`).

## Build (Linux, no GPU)
```bash
npm install && npm run fonts                       # Remotion 4 + R3F 9 + postprocessing; fonts into public/
cd voice && python gen_voice.py af_heart && cd ..  # needs kokoro + soundfile (Python 3.12 venv; torch CPU wheel)
cp voice/words.json src/videos/floorzero/words.json
node scripts/dump-timeline.mjs                     # out/timeline.json
python audio/sound.py                              # out/audio/mix.wav (+ stems, cues.md); AUDIO_LIB=<repo>/templates/audio
node scripts/stills.mjs FloorZero out/look/s_ 40,600,1561,2696 0.5
node scripts/render-chunks.mjs 3 <a-b,a-b,...>     # parallel chunks, resumable (we used one chunk per shot, <=100 f)
scripts/finish.sh                                  # concat + mux + frame QA + share encode
```
Chromium renders with software WebGL (`gl: "swangle"`). On 4 CPU cores one worker takes about 4.1 s per 1080p frame
(30-frame test), and 3 parallel workers take about 10 s per frame each.

## Gotchas found on this one
- **Blank 3D canvas with @react-three/postprocessing 3.2:** it builds its composer in a `useEffect` after the first R3F
  frame, and Remotion advances R3F only once per frame. On a fresh mount (every still, the first frame of every chunk)
  the frame renders nothing, with no error, and stills finish suspiciously fast (~0.9 s).
  - Fix (in `FloorZero.tsx`): hold a `delayRender` until `composer.passes.length > 1`, then `advance()` once more.
- **NaN card colour:** `material.color.copy(vector3)` reads `.r/.g/.b` from a Vector3 and gives NaN. Use `setRGB(v.x, v.y, v.z)`.
- **Big heads in a small car:** the bean heads are about 0.5 m wide, so a 1.7 m elevator only fits close-ups.
  - Wide and medium shots use wild walls (`hide` per shot): the camera stands behind the mirror or outside the side
    wall.
  - Anything left on a hidden wall (the rules card) must hide with it, or the ink pass outlines its invisible back
    face.
- **Hand cards on a wall panel:** camera-facing cards half sink into the wall behind the button. Draw them `top`
  (depth test off).
