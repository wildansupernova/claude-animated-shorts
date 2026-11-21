# Floor Zero, Part 4: "Never Turn Around"

Episode 4 of **Floor Zero** (Parts 1-3: `videos-done/floor-zero-part-1/` to `floor-zero-part-3/`), built from
`SCRIPT.md`, the audited script, per `videos-done/floor-zero-series/SEASON.md`. It runs 85.33 s (2560 frames) at
1080x1920, 30 fps, with burned-in captions.

## The episode
- **Cold open (3 s):** "The rule on this floor: never turn around." A wall of green security monitors. Every one shows
  you, and right behind you, something with no face. Text: "IT'S RIGHT BEHIND YOU."
- **Recap:** wade or climb. A silent vote banner shows only with real numbers (`VOTES` in `story.ts`).
- **① WADE (loses; new sense: it's in the water):**
  - The water is warm.
  - You take a second step and your reflection stays at the first one.
  - Straight down into the water, your own face smiles up at you.
  - A pale hand comes up and pulls you under.
- **VHS rewind.**
- **② CLIMB:**
  - You walk the dry strip, then hop desk to desk by your phone light.
  - Your badge slips into the water. "The rule says step. It doesn't say reach."
  - You reach in, and your reflection's hand grabs your wrist.
  - You tear free with the badge.
  - A wrist insert shows the grey print on your **right** wrist.
  - You hop to the far door. The last light dies (blackout), and the HUD jumps from 04:45 to 03:12.
- **The stairwell:** −2 is bricked up, under a sign: "−2. IF YOU HEAR TYPING, DON'T STOP WALKING." Unnarrated, and
  very faint behind the bricks, someone is typing.
- **Floor −3:** your office again, phosphor green.
  - Every monitor shows the same live security feed of you; a wall of monitors carries "every one", "Live" and "on
    every screen".
  - The sign: "−3. NEVER TURN AROUND."
  - Then every screen shows it, one step behind you, off your left shoulder.
  - The push-in on one screen: a dark smudge where its face should be, and its badge reads **UOY**.
  - Cut to your own sweater and badge ("Like yours").
- **Choice:** ① TURN AROUND (on you, filmed from where it would stand) / ② KEEP WALKING (on the far door), then the
  face close-up with both pills and "COMMENT 1 OR 2".
- **Unnarrated clues:**
  - On the feed, which isn't mirrored, its badge reads UOY and its hair strand runs the other way.
  - The −2 sign, and the typing.
  - The grey print is on your right wrist (Part 5's copy has it on the left).
  - It's never in the room, only on the screens.

## How it's built (on top of Part 3's engine)
- **`cctv.ts`:** the security feed is drawn in 2D: the elevator wall, you, and the copy, plus phosphor monochrome,
  grain, scanlines and a burn-in.
  - The copy is your own card drawn mirrored (`scale(-1, 1)`), so the badge text "YOU" (new `Outfit.badge` in
    `toon.ts`) reads UOY and the hair strand flips.
  - `world.ts` draws the feed into the shared monitor texture each frame on −3.
  - `Overlay.tsx` draws it full screen: one monitor (shot 15), the wall of monitors (`WALLS`, and the cold open), and
    the push-in (`CCTV_PUSH`, digital zoom onto the face, then the badge).
  - Why 2D and not a second 3D camera: the cast are yaw-only billboards facing the main camera, so a second camera
    would see them edge-on.
- **Reflection-only cards:** they're now pitched toward the water's mirrored camera, so a reflection you look down at
  still reads. The wade shot "your reflection doesn't" uses this. The face looking up (shot 3) is a flat card on the
  water.
- **`flood.ts`:**
  - The rule sign switches its picture per floor (−1 / −3).
  - The far stairs door also stands on −3.
  - The stairwell's bottom landing is bricked up, under the −2 sign.
  - A ceiling security camera hangs on −3.
- **Light:**
  - −1: all rows dead. The lobby row dies at "stairs". Your phone light follows you as you climb, and there's an EXIT
    glow at the far door.
  - −3: a new `cctv` light and grade preset (phosphor green).
- **Sound (`audio/sound.py`, 57 cues):**
  - −1 wet room tone and drips; the water steps; the pull; desk landings.
  - The badge clack and plip; the grab hit; the tear-free splash and gasp.
  - The relay as the last light dies; the push-bar slam.
  - Stairwell steps, with the faint typing behind the bricks.
  - −3: room tone and the monitors' hum; the reveal glitch and hit; the zoom servo; one heartbeat on "Like yours"; a
    breath close behind you on the choice.
- **QA:**
  - Whisper hears 225/229 words. It writes "gray" and "everyone", and hears "waded" as "wade it". The median word
    offset is −0.009 s.
  - The mix is −14.06 LUFS, −1.05 dBTP.
  - Stills are in `preview_frames.jpg`.

## Render
- **On a GPU machine:** `RENDER_ON_YOUR_COMPUTER.md` (composition `FloorZero4`, 2560 frames; mux `audio/mix.m4a`).
- **To rebuild the sound:** `node scripts/dump-timeline.mjs` writes `out/timeline4.json`, then run
  `python audio/sound.py` (with `AUDIO_LIB=<repo>/templates/audio`).

## Post
- **Title:** Floor Zero 4: Never Turn Around
- **Caption:** `Floor Zero Part 4 #series #story #decide #horror`
- **Pinned comment:** "① TURN AROUND or ② KEEP WALKING? The card said NEVER LO… Look at it, or look away?"

## Render record
- **First render** (Mac, `ac8e53c`): 73 s for 2560 frames, 85.33 s; −14.1 LUFS, LRA 1.7. QA passed, with three
  picture notes:
  1. "Right behind you" read as "beside you".
  2. The all-green feed hid the "blue sweater".
  3. A 1.3 s dead hold under "while the dark comes closer".
- **Fix pass** (picture only; same length and sound):
  - On the feed the copy now stands half a step further back, partly behind your left shoulder.
  - The feed keeps a little real colour (a cheap colour camera), so both sweaters read teal-blue.
  - Shot 6 creeps in slowly, and the lobby row behind you stutters and comes back at half strength on "the dark".
