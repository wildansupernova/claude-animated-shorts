# Floor Zero, Part 6: "Only One Clocks Out" (season finale)

Episode 6 of **Floor Zero** (Parts 1-5: `videos-done/floor-zero-part-1/` to `floor-zero-part-5/`), built from
`SCRIPT.md`, the audited script, per `videos-done/floor-zero-series/SEASON.md`. It runs 101.87 s (3056 frames) at
1080x1920, 30 fps, with burned-in captions. It has no vote: it ends on Part 1's first line, so the season loops.

## The episode
- **Cold open (2.8 s):** "You made your choice. Let's see if it was you." G, gold morning through the lobby glass: one
  of you walking out, a silhouette (either branch could end this way). Text: "06:00. ONLY ONE WALKS OUT."
- **Recap:** Part 5's last frame, the two of you with ① ONE / ② TWO.
- **② (loses):**
  - You keep your eyes on ①; nobody watches ②, and it's gone.
  - 05:59: it swipes its badge and the clock takes it.
  - G, morning: it walks out and types home: "On my way."
  - On −7, ① turns to the wall and the blue drains out of it. "You were one. You spent the last minute watching
    yourself." Then black.
- **VHS rewind.**
- **① (wins):**
  - You never look away from ②. Its badge reads UOY, and its hair runs the wrong way (a split frame: YOU | IT).
  - "It learned you from reflections": three flashbacks, the steel (Part 3), the water (Part 4) and a dead screen
    (Part 5).
  - It smiles your smile. "Except it learned you backwards."
  - You back up to the clock without blinking. 05:59:59: your badge (YOU) goes in, *chunk*, a green light.
  - 06:00: it turns to the wall and goes grey.
  - Above the clock, the same card, unscratched. Rule 2 in full, then Rule 3: "THE NIGHT SHIFT ALWAYS KEEPS ONE."
    (its first and only appearance in the season).
  - G, morning; one bar; "Where are you??"; you type "On my way.": the same words it typed.
- **Epilogue (the loop):**
  - Next Friday: someone else (a yellow cardigan) is the last one leaving; the rows die behind them.
  - The car passes G to 0; the jolt; the lights go out.
  - When they come back, someone is standing in the corner, facing the wall: grey sweater, red lanyard strap.
  - In the brushed steel, its badge reflected reads YOU.
  - "Imagine you're the last one leaving the office." The title FLOOR ZERO fades in over the corner shot; no end card.

## How it's built (on top of Part 5's engine)
- **−7:** Part 5's set, now with the full rules card above the clock (`flood.ts` `drawCardFull`); the −7 sign moved
  to the side. The punch clock's LED reads the HUD time.
- **The grey (`cast.ts` `greyed`):** the sweater, skin, trousers and hair are blended toward pale grey in eight steps,
  so the drawing pool keeps each step. Cards are keyed on the outfit colours.
- **The two of you:** ② is your card with `mirror: true`. Its badge shows (UOY) only in the ① branch close-ups.
- **2D inserts (`Overlay.tsx`, canvas, by source frame so the rewind runs them backwards):**
  - gold morning, with a silhouette cut from a toon body;
  - the time-clock slot (05:59 / 05:59:59);
  - both phones (typing "On my way.");
  - YOU | IT hair;
  - the three flashbacks;
  - the full card (rule 2, then 3);
  - the epilogue's brushed steel;
  - the title.
- **Epilogue:** Part 1's office ("office" light, rows dying far to near) and the car ("cab" light, display 1 → G → 0,
  the jolt). Last week's kept one stands in Part 1's corner (`FIGURE`), drawn from behind, mirrored and greyed.
- **Sound (`audio/sound.py`, 58 cues):**
  - −7 hum, the kept ones breathing, the clock ticking.
  - Gold morning air and the glass door.
  - The badge slides and the clock's *chunk*; typing and sends.
  - Sinking tones as the blue drains; the 06:00 hit as every kept one exhales; the low hit on Rule 3.
  - Flashback sounds (steel ring, splash, static).
  - The epilogue's footsteps, relays as the rows die, the motor, the jolt, the corner's breathing.
  - The motif once more under the title.
- **QA:**
  - Whisper hears 255/262 words. It writes "559", "59", "gray" and "o 'clock". The median word offset is +0.005 s.
  - The mix is −14.00 LUFS, −1.34 dBTP.
  - Stills are in `preview_frames.jpg`.

## Render
- **On a GPU machine:** `RENDER_ON_YOUR_COMPUTER.md` (composition `FloorZero6`, 3056 frames; mux `audio/mix.m4a`).
- **To rebuild the sound:** `node scripts/dump-timeline.mjs` writes `out/timeline6.json`, then run
  `python audio/sound.py` (with `AUDIO_LIB=<repo>/templates/audio`).

## Post
- **Title:** Floor Zero 6: Only One Clocks Out
- **Caption:** `Floor Zero Part 6 (finale) #series #story #decide #horror`
- **Pinned comment:** "Watch Part 1 again. At 0:40 the lights go out. That's when it got in. At 1:20 it's standing in
  the corner. Season 2: would you warn them? ① YES / ② NO"
