---
name: camera-moves
description: Picking and building camera moves for this repo's animated shorts (three.js + Remotion story.ts). Lists 26 moves (push-in, pull-out, pan, tilt, truck, pedestal, crane, orbit, follow, lens zoom, snap zoom, dolly zoom, whip pan, fly-through, dutch roll, impact shake, rack focus, foreground wipe, low angle, top-down, POV, speed ramp, overshoot, spin transition) with which situation, story beat and emotion each suits, what to avoid, house timing numbers and ready-made helpers. Use when planning shots or CAMS keys, when a short feels flat or static, when choosing a transition between places, or when asked which camera move fits a moment.
---

# Camera moves for our shorts

A short feels flat when every shot uses the same move. In our past shorts that move was a slow straight push-in from eye height. This
skill helps pick a **different, motivated move for each beat**, and then build it.

- **Catalogue with numbers and sources:** `references/CAMERA_MOVES.md`.
- **Helpers:** `experiments/camera-lab/src/videos/camlab/moves.ts`. These are pure functions on `{pos, look, fov, roll}`
  and they stack, e.g. `roll(dolly(pan(base, 20), 0.3), 4)`. Copy the file next to a short's `story.ts`.
- **Working examples:** `experiments/camera-lab/src/videos/camlab/variants.ts` has one camera plan per move. Every move
  is demonstrated on the same 14 s story in the lab reel, `experiments/camera-lab/camera_moves_reel.mp4` (6:56); the
  `#` numbers below are its clip numbers.

## How to plan the camera for a short
1. **Write the beats first.** Use the script formula: hook, setting, escalation, mystery, "You see," pivot, explanation,
   snap, consequence, twist.
2. **For each beat, name what the viewer should feel or notice** in a few words: "how tall it is", "uh-oh", "this
   causes that", "we're somewhere else now".
3. **Pick the move** from the tables below. If no feeling is worth a move, use the quiet default: a creep push-in
   (`creep`, 0.15-0.35 %/f).
4. **Check the variety rules.** Never put the same featured move on two beats in a row. Aim for 4-6 different moves per minute.
   Keep the loud ones (whip, snap, spin, dolly zoom, shake) to 1-2 each.
5. **Time it to words.** The move's fastest frame or its arrival lands 0-3 frames before its word
   (`cue(line, "word")`). For a glide, start about `dur/2` early.
6. **Render stills at the key frames** and check that the subject stays in frame through the whole move.

## Which move for which situation

### By what happens on screen
| Situation | Best moves | Why |
|---|---|---|
| Something **falls or drops** | Tilt down with it (#04), pedestal down beside it (#06), follow it (#09), speed ramp the key moment (#22) | The eye rides the fall. In 9:16 a vertical move covers the tall side of the frame. |
| Something **rises, grows or is tall** | Tilt up (#04), pedestal or crane up (#06, #07), low angle (#19) | Height reads best when the camera has to travel to see the top. |
| **Scale** reveal ("it was 3 m tall", "the whole town") | Pull-out from a detail (#02), crane up and back (#07), lens zoom out | The payoff arrives as the frame widens. |
| **Two things linked** (cause and effect, before and after) | Rack focus from one to the other (#17), pan or tilt between them (#03, #04) | It joins both in one frame and tells the viewer where to look next. |
| A **process** in steps (machine, recipe, body) | Follow the moving part (#09), top-down (#20), a short arc per step (#08) | The camera moves with the step; top-down makes it a readable diagram. |
| **Place or time jump** (another city, "50 years later") | Whip pan (#13), fly-through a window or door (#14), foreground wipe (#18), spin (#24) | Moves the viewer without a hard cut. Save one for the biggest jump. |
| **Going inside** something (microscope, body, building) | Fly-through (#14), push-in that keeps going (#01) | The camera physically enters. |
| A **hit, crash, landing, slam** | Impact shake (#16) + snap zoom (#11); speed ramp into it (#22) | Physical punctuation; the shake must be on the impact frame. |
| A **reaction** (shock, realisation) | Snap zoom on the face (#11), dolly zoom (#12), fast push-in (#01) | The face is the story. |
| **Looking down from a height**, danger of falling | Dolly zoom (#12), top-down (#20), POV (#21) | Vertigo and point of view sell the drop. |
| A **map, layout or diagram** | Top-down with a slow spin (#20), crane over (#07) | Flat, readable, graphic. |
| A **crowd or "everyone"** | Crane up or orbit (#07, #08); hold the crowd still and move the camera | The camera supplies the motion; extras stay calm. |
| A **character introduced** | Pull-out from a detail (#02), low angle push (#19), crane down to eye level (#07) | Gives them an entrance. |
| An **object that matters** (the clue, the invention) | Orbit (#08), push-in (#01), low angle (#19) | Circling it says "study this". |
| **Two characters talking** | Over-the-shoulder holds with creep; truck slightly on the speaker change; rack focus between them (#17) | Keep it calm; the words carry it. |
| **Travel or a chase** | Truck alongside (#05), follow (#09), whip at the turn (#13) | Parallax gives speed. |
| **"Imagine you're..."** (second person) | POV (#21), push-in (#01) | Puts the viewer inside. |
| **The single most important frame** of the video | Speed ramp (#22) with an orbit or creep running at normal speed | Time slows; everything else keeps it alive. |

### By story beat
| Beat | First choice | Also good | Avoid |
|---|---|---|---|
| Hook (absurd fact, first 3 s) | Pull-out from a detail ending in a snap zoom on the hook word (#02 + #11) | Fly-in (#14), spring settle (#23), low angle (#19) | A static wide, a slow pan (too slow for the first 1.5 s) |
| Setting (year, place, pride) | Crane down into the scene (#07) or truck past foreground (#05) | Pan (#03), long-lens zoom (#10) | Repeating the hook's move |
| Escalation (3-4 beats, each bigger) | Push-ins that grow per beat (#01), roll that grows (#15) | Short arcs (#08), one POV (#21) | Five identical pushes |
| Mystery ("Wait...?") | Slow push-in or a slight roll, then hold | Rack focus to the clue (#17) | Loud moves (they answer before the question lands) |
| "You see," pivot | A clean reframe: whip or wipe to the explanation set (#13, #18) | Top-down cut (#20) | Shake |
| Explanation / analogy | Orbit (#08) or rack focus (#17) | Top-down diagram (#20), tilt (#04) | Whips, shakes, spins |
| Snap (it breaks) | Shake + snap zoom (#16 + #11) | Speed ramp (#22), spin (#24) | Slow glides |
| Deadpan double line | Hold with a creep | Slow lens zoom (#10) | Any big move (it kills the deadpan) |
| Consequence / rule | Push-in on the rule (#01) | Pedestal (#06) | |
| Twist ending | Pull-out or crane out (#02, #07) | Dolly zoom (#12), low angle (#19) | Ending mid-move or on a blur |

### By feeling
| Feeling | Moves |
|---|---|
| Awe, grandeur | Slow crane up (#07), slow orbit (#08), tilt up (#04), low angle (#19) |
| Tension, dread | Growing roll (#15), slow push-in (#01), dolly zoom (#12) |
| Comedy | Snap zoom (#11), overshoot and settle (#23), whip (#13), spin (#24) |
| Shock | Snap zoom (#11), shake (#16), dolly zoom (#12) |
| Sad, small, alone | Slow pull-out (#02), high angle, top-down (#20) |
| Triumph | Crane up (#07), low angle (#19), orbit (#08) |
| Confusion | Dutch roll (#15), spin (#24), POV (#21) |
| Calm, explaining | Creep, slow pan (#03), rack focus (#17) |

## Each move in one line: best when / avoid when
| # | Move | Best when | Avoid when |
|---|---|---|---|
| 01 | Push-in | A word or a face matters | Every shot (the old flat default) |
| 02 | Pull-out | The context is the payoff | The surroundings are empty or unbuilt |
| 03 | Pan | Something sits beside the subject | You need depth (no parallax); fast in 9:16 |
| 04 | Tilt | Height, falls, rises | The subject moves sideways |
| 05 | Truck | Depth on a flat beat; travelling with someone | Nothing in the foreground (no parallax to see) |
| 06 | Pedestal | Measuring a height, riding a lift or fall | Characters are cut by tables or rails at the passing heights |
| 07 | Crane | Openings and endings | Inside small rooms (ceiling) |
| 08 | Orbit | A hero object or turning point | Flat card characters filling the frame (they turn edge-on) |
| 09 | Follow | Anything that travels | The path is too fast to keep framed |
| 10 | Lens zoom | Spotting from afar; a documentary feel | You want the viewer to feel they move |
| 11 | Snap zoom | Punchlines, hook words | More than 2 per video |
| 12 | Dolly zoom | One shock or vertigo moment | Repeated; anything comic |
| 13 | Whip pan | The biggest place or time jump | Without motion blur and a whoosh |
| 14 | Fly-through | Entering a new space through an opening | No opening is on screen to fly through |
| 15 | Dutch roll | Growing tension; comic wobble | Calm explanation beats |
| 16 | Shake | A real impact frame | Speech-only beats; more than about 6 per video |
| 17 | Rack focus | Cause and effect in one frame | Wide shots (no blur to pull) |
| 18 | Wipe | Hidden cuts, reveals | No near object at the lens |
| 19 | Low angle | Power, scale, the tall thing | The face must read (looking up the nose) |
| 20 | Top-down | Maps, diagrams, impact on the floor | Long shots of card characters (they foreshorten) |
| 21 | POV | One short immersive or comic moment | Long stretches (dizzying) |
| 22 | Speed ramp | The money frame | Lip-synced dialogue (it would drift) |
| 23 | Overshoot | Comedy reframes, snappy energy | Serious or sad beats |
| 24 | Spin | A spinning subject, a high-energy change | Twice in a row |
| 25 | Mixed | A whole short | |

## House numbers (keep these)
- Glides: smootherstep, 18-40 f, peak ≤ 25 px/f at 720p (peak = 1.875 x distance / duration). Bigger moves are cuts,
  or whips with blur.
- Holds creep 0.15-0.35 %/f (`creep(c, f, f0, 0.0025)`). A punch is 0.6 %/f for ~35 f.
- Rolls are degrees in `roll()` but radians in a raw `roll:` field: 4° = 0.07 rad. Moves of 4-8°, glided over at least 18 f.
- Kicks: 7 frames, the sign flips every frame (`kickAt`/`applyKick`). Stop any push at the hit.
- Whips: about 9 f in (ease-in cubic), cut at peak blur, about 9 f out (ease-out). Motion blur shutter 1 frame. Add a whoosh.
- Snap zoom: 4-6 f, `out5` easing, +40-70 % size, zoom blur, a "zip" SFX.
- Speed ramp: `ramp(f, a, b, 0.22-0.3)`. Story time slows to 22-30 % and catches up by `b`, so the voice stays in sync.
- Camera height: default 0.7-1.0 x character height. Low angles (#19) and top-downs (#20) are accents.
- Clamp easing input: `prog()` clamps it. Raw `u => u ** 3` on an unclamped `u` runs the move before its cue.

## Building it
```ts
import { cam, mixCam, creep, dolly, pan, tilt, truck, pedestal, arc, crane, zoom, dollyZoom, roll, swing, spline, follow, prog, glide, out5, spring, ramp, kickAt, applyKick } from "./moves";
// BUTTER_CU, EDGE, objAt and fall0 below stand for your own framings, object path and cue frame
const HOOK = cam({ pos: [0.32, 1.18, 1.05], look: [0.08, 0.9, -1.45], fov: 40 });
// hook: pull out from the butter, spring-settle, snap zoom on "down"
(f) => zoom(mixCam(BUTTER_CU, HOOK, prog(f, 0, 30, spring)), 40 - 12 * prog(f, cue(0, "down") - 2, 5, out5));
// fall: tilt down after the falling object (camera stays put)
(f) => swing(EDGE, { ...EDGE, look: follow(objAt, f, [0, 0, 0], 3).look }, prog(f, fall0, 16));
```
Motion blur for whips, snaps and spins is computed from the camera path (`blur.ts`: `MotionBlur`, `camMotion`);
add it to the composer after the lens blur. Characters seen from above need the card lean in
`experiments/camera-lab/src/videos/camlab/world.ts`.
