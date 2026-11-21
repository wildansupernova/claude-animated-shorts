# Floor Zero, Part 2: the Night Shift

Episode 2 of our original interactive horror series. Part 1 is in `videos-done/floor-zero-part-1/`, and `SCRIPT.md`
has this episode's script and beat map. It runs 96.4 s (2892 frames) at 1080x1920, 30 fps, with burned-in captions.

The episode follows the sequel beat sheet in `references/INTERACTIVE_SERIES_FORMULA.md`:
0. **Cold open (1 s):** a glitchy flash-forward of every monitor reading NIGHT SHIFT, then a white flash.
1. **Recap:** "So, did you step out, or did you stay in?" over Part 1's last frame and tags.
2. **② STAY IN:** the doors shut and the panel dies. The one facing the wall speaks without turning: "Don't worry.
   I'll finish your shift." Lights out. When they come back on it's gone, and you are the one facing the wall.
   "This is the end. Because the rules were never there to protect you. They were there to keep you." The card
   insert lands on Rule 1 (DO NOT STEP OUT), then back to the shut doors: obeying the card is what trapped you.
3. **VHS rewind** back through the branch.
4. **① STEP OUT:** you step out and the elevator falls (the display races -1…-7, then a crash far below). Every
   computer turns on at once, and every screen reads "WELCOME TO THE NIGHT SHIFT / 7 FLOORS · 1 RULE EACH / THE ONLY
   WAY UP IS DOWN / REACH G BEFORE 06:00" with a live countdown.
5. **The escalation:** the elevator comes back with the figure one step closer, and the stairwell door beside it
   creaks open on red dark with footsteps coming up.
6. **The new choice:** ① STAIRS / ② ELEVATOR. "So, which way down do you go?"

## Engagement revision (current)
Applied the retention and comment rules from `references/INTERACTIVE_SERIES_FORMULA.md`:
- **Cold-open teaser** (`TEASER`, frames 0-29): the screens shot from later in the episode, glitched, with a sting;
  the voice starts 1 s later (`LEAD = 1.12`).
- **Rule 2 insert** in the figure's scene (`RULE2`): a push-in on the card with Rule 2 circled in red.
- **"Rules are a trap" story logic:** the new line 10 and the Rule 1 card insert in shot 9 (`CARD9`), with a sub on
  "keep". Captions drop low under both card inserts.
- **Countdown HUD** ("UNTIL 06:00", top right) from the message reveal to the end: a ticking clock to the choice.
- **Comment prompt:** a "COMMENT 1 OR 2" pill with an arrow under the final tags.
- **Vote banner** (`VOTES` in `story.ts`): shows Part 1's real split over the recap. It's `null` (hidden) until we
  have real numbers; never fill it with made-up ones.
- QA: typecheck clean; stills checked (`preview_frames.jpg`); Whisper hears 258/258 words through the mix (median
  offset 0.003 s); mix -14.1 LUFS, -1.05 dBTP, 96.40 s.

## Render record (first cut, superseded)
- **Rendered** on the user's Mac with `RENDER_ON_YOUR_COMPUTER.md` (`--gl=angle`, concurrency 2). The picture took
  75 s; the CPU-only cloud container needs about 2.5 h for the same render.
- **Files** (kept on the Mac in the git-ignored `output/floor-zero-part-2/`):
  - share encode `floor_zero_part2.mp4`: 19.9 MB;
  - master: 42.0 MB.
  - Both are 1080x1920, 30 fps, 2734 frames, 91.13 s, AAC 48 kHz stereo.
- **Frame QA** on the share encode:
  - -14.3 LUFS, LRA 2.1, peak -1.2 dBFS; no silences, no unplanned white frames;
  - the black and frozen frames fall in the planned lights-out (628-708);
  - the 323-352 hold is the dead display under "the light above you hums";
  - the rewind and the crash countdown checked out on the contact sheets.
- **Mux fix:** done without `-shortest`, which had cut Part 1's last 2 frames. Both render prompts are fixed.
- **Not posted.** This cut is replaced by the engagement revision above, which needs a fresh render.

## What's new on top of Part 1
- **Set** (`office.ts`): a fire door cut into the elevator wall (hinged, swings into the office) with an EXIT sign;
  behind it a red-lit stairwell (unlit materials, no fog) with a landing, steps going down, a handrail, a pulsing
  emergency lamp and a shadow that climbs the back wall. One shared message canvas lets every monitor in the office
  show the same screen and countdown.
- **Timeline** (`story.ts`):
  - Every state is a function of frame: doors that start 45 % open (where Part 1 left them), the displays, a panel
    power-down, the car light dying and stuttering back, the screens waking, the stairwell door and the shadow.
  - `srcFrame()` maps the rewind's output frames back through shots 2-9, accelerating. The composition renders each
    shot at its source frame, with a VHS look (washed out, contrasty, sideways jitter, scanlines, a tracking band,
    ◀◀ REWIND).
- **Cast** (`cast.ts`): you walk out of the car, stand between the two doors, glance at each option while it's
  named, and reappear in the corner, back to us, as the one facing the wall.
- **Overlay and captions:**
  - branch badges (② STAY IN, then ① STEP OUT);
  - the recap tags;
  - the new projected tags, pinned big at the top for the question;
  - a red "???" name tag on the figure's lines;
  - captions dropped low over the monitor close-up.
- **Voice** (`voice/gen_voice.py`): narrator af_heart. The figure uses Kokoro `am_onyx`, resampled 2 semitones
  down (slower, lower), with word timings scaled to match. Whisper matches all 258 words, median offset 0.003 s.
- **Sound** (`audio/sound.py`, 49 cues):
  - SFX: the teaser sting (glitch, fans, sub, a suck-in to the white flash), recap door groan, doors shutting, panel power-down, a sub under the figure's voice, a relay clunk into the
    blackout and the stuttering return, a dong on "you're the one facing the wall", tape rewind and stop, a cable
    snap, brake screech and falling rush with beeps racing down to the crash, fans and a chorus of startup chimes as
    every computer wakes, message blips, countdown ticks, the ding, the doors, a sub on "one step closer", the
    stairwell door creak and echoing footsteps climbing.
  - Score: the Part 1 motif and drone, string-cluster stingers, the heartbeat for the choice.
  - Master: -14.1 LUFS, -1.05 dBTP. Whisper recovers all 258 narrated words through the full mix.

## Render
- **Fast, on a GPU machine:** follow `RENDER_ON_YOUR_COMPUTER.md` (composition `FloorZero2`, 2892 frames; mux
  `audio/mix.m4a`).
- **CPU only:** same as Part 1 (`node scripts/stills.mjs FloorZero2 ...`, `scripts/render.mjs FloorZero2 ...`),
  at roughly 3 s per frame with 3 workers on 4 cores.
- To rebuild the sound: `node scripts/dump-timeline.mjs` writes `out/timeline2.json`, then `python audio/sound.py`
  (with `AUDIO_LIB=<repo>/templates/audio`).
