# Before You Watch Godzilla Minus Zero: animated explainer short

An unofficial fan explainer, made with this repo's cartoon-3D-short skill, of where Godzilla comes from (the 1954
Lucky Dragon No. 5 / Castle Bravo story, the rubber-suit original, 70 years of films) and a full recap of
**Godzilla Minus One** (2023), to catch viewers up before **Godzilla Minus Zero** (in theaters since November 3, 2026
in Japan and November 6, 2026 in North America). It runs 110 s, vertical 1080x1920 at 24 fps, with narration,
subtitle captions (the current word is highlighted), a title chip per chapter, an original synthesized score and SFX.

Everything here is our own: the kaiju design and all cartoon drawings (bean-head cards in the skill's style), the
script, the voice (Kokoro TTS `af_heart`, AI-generated) and the music. No film footage, logos, studio roar or score.
`SCRIPT.md` has the facts with sources, the hook choice and the timed script.

## Hook (v2)
*"Godzilla was born from a real bomb."* with Godzilla roaring on screen from frame 1 and a snap zoom on "bomb" (1.9 s):
an icon plus a curiosity gap inside 2 seconds. The false-sunrise story ("twenty-three fishermen saw the sun rise, in the
west. It wasn't the sun.") is now the retention beat, and the last line still calls back to it. v1's date opening and
why it was replaced: `SCRIPT.md`.

## Camera plan (v2, `.claude/skills/camera-moves`)
One motivated move per beat from `moves.ts` (copied from `experiments/camera-lab`), never the same featured move twice
in a row; the loud moves are budgeted (2 snap zooms, 2 whip pans, 1 dolly zoom, 1 speed ramp, shakes only on impacts),
with camera motion blur (`blur.ts`, 1-frame shutter, never across a cut).

| Beat | Move |
|---|---|
| "born from a real **bomb**" | crisp hold on the roaring head, pull-out, **snap zoom** + kick + flash on "bomb" |
| "In 1954, twenty-three fishermen" | crane down from the night sky onto the deck |
| "saw the sun rise" / "in the west" | fast push-in on the lit faces / pan from the crew to the false sun |
| "It wasn't the sun" / "It was a hydrogen bomb" | slow lens zoom on the horizon / **dolly zoom**: the cloud looms behind the fisherman |
| "Before you watch..." | pedestal down from Godzilla over the cinema roof to the marquee |
| ash / Lucky Dragon / death ash | tilt down through the ash, truck to the hull name, growing dutch roll |
| "Eight months later..." | **whip pan** to Ginza 1954, low angle |
| gorilla / whale / the suit / toy Tokyo | overshoot-and-settle reframes, short orbit, follow the stomping suit |
| friendly / punch / lineup of eras | crane up past the kids, pan with the punch, truck + crane to WORLD RECORD |
| Minus One / 1945 / 0 / −1 | tilt up the rising Godzilla, crane down, push-in, tilt down with the falling sign |
| Koichi / faked trouble / attack / "freezes" / deaths | pull-out from the goggles, pan engine → mechanic, low angle + shake, **snap zoom**, crane away |
| family / Ginza / the blast / reaction | truck past ruins, short arc to the baby, tilt up to the plates, **speed ramp** + orbit, push + roll |
| the plan / ring of gas / pressure | truck along the veterans, high-angle spin over the ships, tilt up the board |
| plane / mouth / ejecting / Noriko / the deep | follow, **cockpit POV** into the jaws, crane out of the blast, pedestal ride down, push to the mark, tilt down |
| Oscar | pull-out from the $15M bag, low angle on the rising statue, spring push onto the toys |
| Minus Zero / ending | **whip pan** to 1949, tilt up to "so is he", growing roll under the lightning, lens zoom, pull out of the screen, crane out |

## Chapters
| # | Chip | Content |
|---|---|---|
| hook | BEFORE YOU WATCH · GODZILLA MINUS ZERO | the false sunrise, the H-bomb, Godzilla rises, the cinema tonight |
| 01 | GODZILLA · 1954 | death ash on the Lucky Dragon No. 5, Ginza 1954, gorilla + whale, the stuntman in the suit, toy Tokyo |
| 02 | 70 YEARS OF GODZILLA | the friendly 60s, a rival monster, the size-chart lineup of eras, world record |
| 03 | GODZILLA MINUS ONE · 2023 | 0 → −1, Koichi the kamikaze pilot, Odo Island, the family, Ginza, the ring-of-gas plan, the Shinden, the parachute, Noriko's mark, the regrowing flesh |
| 04 | THE OSCAR · 2024 | under $15M vs Hollywood, the Oscar, the team's Godzilla toys |
| NOW | GODZILLA MINUS ZERO · 2026 | 1949, the family is back and so is he, golden lightning + a three-headed silhouette, the callback |

## Layout
- `voice/`: `lines.json` (script, one caption unit per line, chapter ids, phoneme hints for the Japanese names),
  `make_voice.py` (Kokoro → `voice.wav` + `words.json`), `voice.wav`, `words.json`, `lines_timed.json`.
- `src/videos/godzilla/`:
  - `kaiju.ts`: our own Godzilla drawing (eras `m1` / `showa` / `heisei` / `shin` / `mv`, the 1954 suit with the
    stuntman's head out, silhouette, sunk) plus gorilla, whale, 60s rival, three-headed silhouette, mushroom cloud,
    fireball, parachute, money bag, statuette and the portrait blackboard.
  - `heroes.ts`: the cast (Koichi as pilot and civilian, Noriko with baby / bandage / neck mark, Akiko, Tachibana,
    Noda, navy veterans, fishermen, 1954 film crew, kids, Ginza crowd, the effects team with Oscars + Godzilla toys,
    today's audience) with the new pilot cap, navy cap, headband, beret, fedora, bandage, glasses, scarf, skirt.
  - `sets.ts`: places `sea` (Lucky Dragon No. 5, destroyers + tug, the Shinden), `studio` (painted-sky cyclorama,
    miniature Tokyo, lights, camera), `island` (Odo Island airbase with hangars and a Zero, the beach), `ruins`
    (burned-out Tokyo, the family shack, the rebuilt 1949 street), `city` (Ginza with the clock tower, tram, the
    modern cinema marquee) and `rooms` (planning hall + blackboard, hospital, Oscar stage, cinema auditorium).
  - `story.ts`: 49 shots cued by word (`cue(line, word)`), cameras, kicks, flashes; exports `TIMELINE` for the sound.
  - `world.ts` engine (kaiju cards, effects), `looks.ts` light presets, `Godzilla.tsx` composition + captions + chips +
    end title, `Contact.tsx` one-frame-per-shot sheet, `ZillaSheet.tsx` / `CastSheet.tsx` flat drawing sheets.
- `audio/score_gz.py`: score, SFX and mix (`audio/out/mix.wav`, about -14.4 LUFS, ≤ -1.4 dBTP); reads
  `audio/timeline.json` (written by `scripts/timeline.mjs`). `dsp.py`, `instruments.py`, `sfx_gen.py` are the shared synths.
- `src/videos/godzilla/moves.ts` + `blur.ts`: camera move helpers and motion blur (from `experiments/camera-lab`).
- `scripts/`: `stills.mjs`, `frames.mjs` (contact sheets), `timeline.mjs`, `bundle.mjs`, `render.mjs`,
  `render_all.sh` (3 resumable workers, 120-frame chunks), `finalize.sh` (concat, mux, share encode), `short_qa.py`.
- `tools/montage.py`: tiles contact frames into labelled sheets.

## Rebuild
```bash
npm ci
python3.12 -m venv ~/tts && ~/tts/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu && ~/tts/bin/pip install kokoro soundfile scipy "misaki[en]"
(cd voice && ~/tts/bin/python make_voice.py af_heart 1.3) && cp voice/words.json src/videos/godzilla/words.json
node scripts/timeline.mjs && ~/tts/bin/python audio/score_gz.py
scripts/render_all.sh && scripts/finalize.sh
```
Checks: `node scripts/frames.mjs out/contact Contact all 0.4 && python3 tools/montage.py out/contact out/sheet_ 7 49`.

## Notes from this build (CPU-only cloud container, 4 cores, SwiftShader WebGL)
- Engine is the `doomsday-recap` one (ink pass, two-tone shading, unlit cards), ~2 s per 1080x1920 frame at dpr 0.6.
- Kaiju are camera-facing cards drawn at 1000x1000 units (soles at 975); height `h` in metres sets the card size.
  A silhouette variant ignores fog (soft material) so it stays dark against a sunrise.
- Billboard characters always face the lens: a "reverse" shot of people looking at something shows their faces, so
  shots are composed with the subject beside them (`facing: -1` + `look: -1`) or from the thing they look at.
- The push-in `D()` dollies toward the look point; when that point is far (the horizon), the camera travels metres
  and passes the actors. `focus: <m>` limits the push to a subject distance.
- Vertical frames are narrow: at 7 m the frame is only ~3.5 m wide, so groups sit within ±1.5 m of the centre.
- Speech-to-text check (faster-whisper base.en) reads the names back correctly (Gojira, Koichi Shikishima, Noriko,
  Akiko, Ginza). Voice-over-bed margin per line ≥ 4 dB (median 12 dB) after ducking SFX 8 dB under speech.
- The MP4s are git-ignored except the share encode when it is under 50 MB.

## Posted (2026-11-19, v2.1, Buffer "My Organization", share now)
| Channel | Buffer post | Sent (Asia/Jakarta) | Link |
|---|---|---|---|
| TikTok @ohmygoshfunfact | `6aff1d4770751782c0cf896c` | 23:03 | https://tiktok.com/@ohmygoshfunfact/video/7709913320194641204 |
| YouTube OhMyGosh Fun Fact (Short, Education) | `6aff20133deb096f739d34fe` | 23:13 | https://www.youtube.com/watch?v=mXRPU3d-Iak |

AI-generated label off at the owner's request. The Tigris copy (`wildan-video/godzilla-minus-zero/godzilla_minus_zero_share.mp4`)
was deleted after both posts were `sent` (public URL now 404).
