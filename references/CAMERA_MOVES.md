# Camera moves: the catalogue

Every camera move we can use in a short, what each one does to the viewer, which story beat it suits, and the numbers
and code to build it. The numbers come from our measurements of the reference channel (`reports/motion.md`, 20 shorts,
32,337 frames) and from standard film and animation practice (sources at the end).

Each move has a demo in the camera lab: the same 14 s explainer ("Butter Side Down") filmed 26 times, once per move,
with a numbered card before each clip. Code and build notes: `experiments/camera-lab/`. The move helpers live in
`experiments/camera-lab/src/videos/camlab/moves.ts`. They are plain functions on `{pos, look, fov, roll}`, so they drop into any
`story.ts` and they stack: `roll(dolly(pan(base, 20), 0.3), 4)`.

## Why our shorts feel flat
- **One move, repeated.** In `videos-done/henrietta-lacks/src/story.ts`, 24 of 27 shots use the same slow straight
  push-in from about 1.5 m high, with a 38-44° lens. Fritz Haber is built the same way.
- **Rolls are half the spec.** `SKILL.md` asks for 4-5° but the code uses `roll: 0.03-0.04` (radians), which is about 2°.
  The reference's roll moves are 3.6° median and 8° at p75.
- **Hard cuts where the reference moves.** The reference almost never hard-cuts. It joins places with whip pans, by
  following an object, or by flying through an opening. Our videos cut or crossfade.
- **Few angles.** Most shots sit at eye height. Low angles, top-downs, vertical moves and lens tricks are missing.

The fix is not "more movement". It is **a different move for each beat**, picked for what the beat means (see the beat
table below), with the push-in kept as the quiet default between them.

## House rules (all moves)
- **Motivate every move.** Before you key a move, name what the viewer should feel or notice. If you can't, use the
  creep (01 at 0.15-0.35 %/f) and keep the attention on the acting.
- **Land moves on words.** The fastest frame of a move, or its arrival, lands 0-3 frames before the word it serves
  (`cue(line, "word")`). Start a glide about `dur/2` early.
- **Ease everything.** Glides are symmetric smootherstep, 18-40 frames, peak ≤ 25 px/f at 720p (peak = 1.875 x
  distance / duration). Anything bigger is a cut, or a whip with motion blur.
- **No dead holds.** Every hold creeps in 0.15-0.35 %/f. Flat holds read as freezes in QA.
- **Vary by beat.** Never use the same featured move on two beats in a row. Aim for 4-6 different moves per minute.
- **Use the tall frame.** In 9:16, vertical moves (tilt, pedestal, crane) travel the long side of the frame and show
  off height. Sideways moves cross the narrow side fast, so slow them down or add foreground for parallax.
- **Budget the loud ones.** Whip pans, snap zooms, spins and dolly zooms are punctuation: 1-2 of each per video at most.
  Shakes only on real impacts.
- **Characters are flat cards.** Above ~45° (top-down, crane over) a yaw-only card goes edge-on. The lab leans cards
  back toward a high camera (`world.ts`); keep steep angles short or keep characters out of them.

## The moves

Columns: **Demo** = number in the lab reel (`experiments/camera-lab/camera_moves_reel.mp4`). **Feel** = what it does to the viewer. **Beat** = where it fits in our script
formula (hook, setting, escalation, snap, explanation, consequence, twist). **Build** = the helper and the numbers.

### Moving the whole camera

| Demo | Move | What it is | Feel | Beat | Build |
|---|---|---|---|---|---|
| 01 | **Push-in** (dolly in) | The body travels toward the subject. | Emphasis, realisation, "look at this". | Hook word, the key line of the explanation. | `dolly(c, k)` with `k` 0.2-0.5 over 24-36 f; creep with `creep(c, f, f0, 0.0025)`. A punch is 0.6 %/f for ~35 f. |
| 02 | **Pull-out** (reveal) | Start tight on a detail, back away to show the context. | The catch, scale, isolation. | Setting, twist ("it was standing on a 3 m table"). | `mixCam(tight, wide, glide)` over 34-50 f. |
| 05 | **Truck** (slide) | The body slides sideways, the view direction stays. Near things pass faster than far ones. | Depth, travelling with someone. | Setting, walk-and-talk, revealing a set. | `truck(c, m)` 0.8-1.4 m over 40-70 f; put a prop within 1 m of the lens for parallax. |
| 06 | **Pedestal** (boom) | The body rises or sinks, the lens stays level. | Climbing a height, an elevator. | Measuring height, matching a fall or a lift. | `pedestal(c, m)`; ride a falling object by setting the height from it. |
| 07 | **Crane / jib** | Rise or swoop + swing + tilt in one arm move. | Grandeur, the whole picture, an ending. | Opening, final line, "meanwhile everyone...". | `crane(c, up, swingDeg, back)` over 50-60 f. Reference crane pull-backs reach 4.6 %/f. |
| 08 | **Arc / orbit** | The body circles the subject, which stays centred. | Study, heroism, a turning point. | Explanation, the object everything depends on. | `arc(c, deg)` 30-100°, constant speed for orbits, glide for short arcs. |
| 09 | **Follow / tracking** | Locked onto a moving subject, trailing a few frames. | Being inside the action. | Falls, chases, anything that travels. | `follow(target, f, offset, lag = 4)`. One continuous shot replaces 2-3 cuts. |
| 14 | **Fly-through** | The camera flies through an opening into the next space. | "Come with me", a seamless change of place. | Opening, place change instead of a cut. | `spline(points, u)` + look ahead along the path, ~40-66 f; motion blur 0.75 frame. |

### Turning the camera on the spot

| Demo | Move | What it is | Feel | Beat | Build |
|---|---|---|---|---|---|
| 03 | **Pan** | Turns left or right in place, like turning your head. No parallax. | Looking around, following sideways action. | Setting, revealing what is beside the subject. | `pan(c, deg)` or `swing(a, b, t)` over 26-40 f. |
| 04 | **Tilt** | Pivots up or down in place. | Height, scale, things falling or rising. | Measuring, falls, "it's taller than you think". | `tilt(c, deg)` / `swing(a, b, t)`. Best fit for 9:16. |
| 13 | **Whip pan** | A pan so fast it smears; cut inside the blur. | Energy, a jump in place or time. | Place change, 1-2 per video. | Ease-in cubic into the cut (9 f), ease-out from it (9-10 f); 45-93 px/f with blur, shutter 1 frame; whoosh SFX. |
| 15 | **Dutch roll** | The horizon tilts; rolling back to level resolves it. | Unease, wrongness, comic wobble. | Escalation, the teeter before the snap. | `roll(c, deg)` 5-15°, glided ≥ 18 f. Return to level on the resolution. |
| 24 | **Spin transition** | A half roll into the cut, the other half after it. | Energy, a spinning subject. | Place change, a flip or spin in the story. | Roll 0→180° in 10 f (ease-in) into the cut, -180→0° in 10 f after; shutter 1 frame. |

### The lens

| Demo | Move | What it is | Feel | Beat | Build |
|---|---|---|---|---|---|
| 10 | **Lens zoom** | Only the focal length changes. The picture flattens; nothing passes anything. | Watched, observed, documentary. | Spotting something from afar; telephoto squeeze. | `zoom(c, fov)` 46→22 over 60-80 f. Compare with 01: a dolly moves, a zoom magnifies. |
| 11 | **Snap / crash zoom** | A zoom in 4-6 frames, usually with a whoosh. | Punchline, sudden realisation. | Hook word, the snap, the twist word. | `zoom` with `out5` over 5 f, +40-70 % size, zoom blur, "zip" SFX. Reference: +38 % in 14 f. |
| 12 | **Dolly zoom** (vertigo) | Push in while zooming out (or the reverse): subject same size, background stretches. | Shock, dread, vertigo, "oh no". | The snap reaction, looking down from a height. | `dollyZoom(c, k)` k 0.5-0.65 over 20-50 f. Once per video. |
| 17 | **Rack focus** | Focus moves from one depth to another while the camera holds. | Connection, cause and effect, "now look here". | Explanation: the cause in front, the effect behind. | DOF `cInf` 18-22 px, focus point glided over ~14 f. Needs a near and a far subject in one frame. |

### Angles, transitions and time

| Demo | Move | What it is | Feel | Beat | Build |
|---|---|---|---|---|---|
| 16 | **Impact shake** | 7-frame jolt, offset flips sign every frame. | A physical hit. | Snap, landings, stomps. | `kickAt` / `applyKick`, gain 0.6-2.4; stop any push at the hit. |
| 18 | **Foreground wipe** | Something near the lens fills the frame and clears: a reveal, or a hidden cut. | A reveal; two shots joined without a visible cut. | Openings, place change. | Truck behind a near prop (chair, leg, tree) over 13-46 f; cut when it fully covers the frame; swish SFX. |
| 19 | **Low angle** | Camera low, looking up. | Power, scale, importance. | Setting the stakes, the hero, "this is tall". | Lens 0.05-0.5 m high, fov 44-50, slow creep. |
| 20 | **Top-down** | Straight down: a flat graphic map. | Overview, clarity, the impact moment. | Explanation diagrams, the landing. | Look straight down, roll 90° so the long side of the subject runs down the 9:16 frame, slow spin 10-25°. |
| 21 | **POV** | Through someone's (or something's) eyes. | Empathy, immersion, comedy. | Escalation; riding the object that falls. | Camera at the eye or on the object, lens 50-66°, near plane 0.012. Keep it short; hide the owner's card. |
| 22 | **Speed ramp** | Time slows for the key frames, then catches up; the camera keeps normal speed. | The money shot. | The snap, the flip, the catch. | `ramp(f, a, b, slow = 0.22-0.3)`: story time slows to 22-30 % and catches up by `b`, so the voice stays in sync. |
| 23 | **Overshoot & settle** | Moves land past the mark and spring back. | Weight, bounce, cartoon energy. | Any reframe in a comedy beat. | `spring` easing (+13 % at 40 %, lands at 1); 16-26 f. |
| 25 | **Mixed** | Our suggested recipe across one video. | Variety with purpose. | All beats. | See the next section. |

## Which move for which beat
A starting point, not a rule. Each row lists a first choice and alternatives.

| Beat | First choice | Also good | Avoid |
|---|---|---|---|
| Hook (absurd fact, 0-3 s) | 02 pull-out from a detail, ending in 11 snap zoom on the hook word | 14 fly-in, 23 spring settle, 19 low angle | A static wide |
| Setting (year, place) | 07 crane down or 05 truck past foreground | 03 pan, 10 long-lens zoom | Repeating the hook's move |
| Escalation (3-4 beats) | 01 push-in per beat, growing; 15 roll that grows | 08 short arcs, 21 POV once | Five identical pushes |
| Snap (it breaks) | 16 shake + 11 snap zoom | 22 speed ramp into it, 24 spin | Slow glides |
| Deadpan line | Hold with a slow creep | 10 slow zoom | Big moves (they kill the deadpan) |
| Explanation (the analogy) | 08 orbit or 17 rack focus | 20 top-down diagram, 04 tilt | Whips and shakes |
| Consequence / rule | 01 push-in on the rule | 06 pedestal | |
| Twist ending | 02 pull-out or 07 crane out | 12 dolly zoom, 19 low angle | Ending on a cut to black mid-move |
| Place change | 13 whip pan or 14 fly-through | 18 wipe, 24 spin, 09 follow an object across | Hard cut + crossfade every time |

## The mixed recipe (demo 25)
Pull-out from the butter with a spring settle → snap zoom on "down" → slight roll on "luck" → whip-tilt down into the
table leg → tilt down the ruler and follow the marker up, push on "seventy-five" → slow orbit while the toast teeters,
speed ramp through the half turn → kick on "Splat" → fly-through out of the window into the garden → crane up and back
while the toast falls, kick on the landing.

## Sources
- Our own measurements: `references/reports/motion.md` (speeds, ease shapes, pushes, kicks, whips) and
  `references/reports/depth.md` (shot mix, camera height, FOV, foreground).
- [Wolfcrow: 100 camera angles, shots and movements](https://wolfcrow.com/100-camera-angles-shots-and-movements-in-filmmaking/)
- [CG Wire: camera work in animation, 10 basic techniques](https://blog.cg-wire.com/camera-work-in-animation/)
- [StudioBinder: push-in shot and the camera-movement index](https://www.studiobinder.com/camera-shots/camera-movements/push-in-shot/)
- [MasterClass: 13 types of camera movement](https://masterclass.com/articles/guide-to-camera-moves)
- [Vidpros: transitions for short-form video](https://vidpros.com/best-transitions-for-short-form-videos/)
- [Vidpros: camera movements every creator should know](https://vidpros.com/camera-movements/)
- [Toon Boom: ease-in and ease-out on camera moves](https://docs.toonboom.com/help/storyboard-pro-20/storyboard/camera/add-ease.html)
