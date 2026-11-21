# Floor Zero, Part 5: "There Are Two of You"

Episode 5 of **Floor Zero** (Parts 1-4: `videos-done/floor-zero-part-1/` to `floor-zero-part-4/`), built from
`SCRIPT.md`, the audited script, per `videos-done/floor-zero-series/SEASON.md`. It runs 84.07 s (2522 frames) at
1080x1920, 30 fps, with burned-in captions.

## The episode
- **Cold open (2.3 s):** "Only one of you gets to clock out." Red dark on −7: two of you side by side, the time clock
  at 05:57 between you, badges turned. Text: "05:57. THERE ARE TWO OF YOU."
- **Recap:** turn around or keep walking (Part 4's choice frame, filmed from where it would stand). A silent vote
  banner shows only with real numbers (`VOTES` in `story.ts`).
- **① TURN AROUND (loses; new sense: its breath):**
  - You turn. Nothing there.
  - On every screen it's still behind you (now between you and the camera).
  - You turn again: nothing; then it breathes on your neck.
  - The monitors go dark one by one, then black.
- **VHS rewind.**
- **② KEEP WALKING:**
  - You walk the rows, watching the screens. On one monitor it's exactly one step behind you, and its legs never move
    while yours stride (the picture settles Rule 2; it isn't narrated).
  - The desk monitors die, far to near, and the HUD drops to 00:03:30.
  - One dead screen holds your reflection for half a second.
  - You run; down the stairs past "−4".
- **−5:** the door stands open onto a sepia wall of photos, one for every Friday, each someone from behind facing a
  wall. The push lands on two plates: "D. HALE · 14 NOV" (a tall grey suit) and "YOU · 21 NOV" (empty).
- **−7:** red emergency light. The kept ones stand facing the walls; you stand among them at the time clock. The sign:
  "−7. ONLY ONE OF YOU CAN CLOCK OUT."
  - The phone: No Service, 1 %. "Home": a sent "Leaving now" (05:41) and the reply "OK. See you soon ♥". You never
    sent that. (Your face in the phone light, the phone in your right hand.)
  - 05:57. The light dies; in the dark only the clock's red digits; something takes your wrist.
  - The light stutters back: two of you.
  - The shell game: two flickers, each a swap, then a third. In the last one ②'s lanyard spins and its badge reads
    **UOY** for 8 frames.
- **Choice:** "Look closely before you answer." ① ONE / ② TWO on the two of you, then "COMMENT 1 OR 2".
- **Unnarrated clues (① is you):**
  - ② is your card mirrored: its hair strand runs the other way.
  - ② has the grey print on its left wrist; yours (Part 4) is on the right.
  - ②'s badge flashes UOY in the last flicker.
  - The −5 plate "D. HALE · 14 NOV" (the one facing the wall in Part 1).
  - It never moves on the screens while you watch.

## How it's built (on top of Part 4's engine)
- **`toon.ts`:**
  - `Outfit.print` draws a pale grey handprint round a wrist (the wearer's right or left; it flips with view and
    mirror).
  - `Outfit.badgeBack` turns the badge to its blank back.
  - `FrontOpts.propLeft` puts the phone in the wearer's right hand.
- **`cctv.ts`:**
  - `turned`: you with your back to the camera and it in front of you.
  - `walk`: you stride toward the camera while it glides one step behind, legs still.
- **`Overlay.tsx` 2D inserts (canvas, drawn per frame; keyed on the source frame, so the rewind plays them
  backwards):**
  - the monitor wall, including the dying monitors;
  - one monitor, with the push onto the feet;
  - the dead screen with your reflection;
  - the −5 door and the photo wall (bodies drawn from `toon.ts`, sepia; Friday dates computed back from 21 NOV);
  - the phone;
  - the clock in the dark.
- **`flood.ts`:**
  - −7's punch clock (its LED face redrawn from the HUD clock) and the sign.
  - The stairwell's "−4" stencil (Part 4's −2 landing is gone).
  - A black cover per desk monitor, so they can die one at a time.
- **`cast.ts`:**
  - The kept ones (34 cards facing the side walls and the elevator wall).
  - The two of you: ② is the same card with `mirror: true`.
  - The swaps (`swapsAt`) and the badge spin (`SPIN`).
- **Sound (`audio/sound.py`, 59 cues):**
  - Cloth turns; the breath at your neck; a power-down per dying monitor.
  - Only your footsteps; the cascade of desk monitors; the dead-screen note.
  - Running and the stairs; the −5 door creak and the hit on "your name".
  - −7: a low hum, the kept ones breathing all around, the time clock ticking.
  - The phone buzz and message chime; the dread note on "your number".
  - Heartbeats on "you never sent that"; the 05:57 flip; the light dying.
  - The grip in the dark; the light stuttering back; flickers with cloth swaps; a lanyard click on UOY.
- **QA:**
  - Whisper hears 212/215 words. It writes "okay" and "557". The median word offset is +0.002 s.
  - The mix is −14.00 LUFS, −1.11 dBTP.
  - Stills are in `preview_frames.jpg`.

## Render
- **On a GPU machine:** `RENDER_ON_YOUR_COMPUTER.md` (composition `FloorZero5`, 2522 frames; mux `audio/mix.m4a`).
- **To rebuild the sound:** `node scripts/dump-timeline.mjs` writes `out/timeline5.json`, then run
  `python audio/sound.py` (with `AUDIO_LIB=<repo>/templates/audio`).

## Post
- **Title:** Floor Zero 5: There Are Two of You
- **Caption:** `Floor Zero Part 5 #series #story #decide #horror`
- **Pinned comment:** "① or ②? Which one is you? Look closely. The answer is in the video."

## Render record
- **First render** (Mac, `8ca5d3c`): 70 s for 2522 frames, 84.07 s; −14.1 LUFS, LRA 2.5. QA passed, and every clue
  frame was confirmed (UOY at 2274–2278, the mirrored strands and outer-wrist prints at 2330, the still legs at 845).
  Three notes:
  1. The second elevator's display read "3" on −7.
  2. The photo wall showed only two columns, so dates jumped between rows.
  3. The grey prints read red under the red light.
- **Fix pass:**
  - Both elevator displays show the current floor.
  - The photo wall opens wide on all five columns, so the dates read on week by week, then pushes in.
  - Note 3 is left as is: the prints are lit by the red lamp like everything else, and their position carries the
    clue.
- **Second fix pass:**
  - The photo wall has 45 different names (no one repeats on the wide shot).
  - The re-render from `178e2d5` passed QA: 88 s; −14.1 LUFS; both elevator displays at −7 read "−7"; five columns of
    consecutive dates at 1160.
