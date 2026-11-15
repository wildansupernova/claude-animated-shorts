# The Birthday Bet: a birthday-paradox short made with this skill

A 68 s vertical short (1080x1920, 30 fps) about the birthday paradox: "Put just 23 people in a room, and it's a coin
flip that two of them share a birthday." It is built from `templates/bridge/` and `templates/audio/`, with these additions:
- **Burned-in captions** (`Captions.tsx`) so the short works with the sound off. They show 1-4 word chunks, numbers as
  digits, and key words in yellow, timed to `words.json`.
- **Every cue comes from the voice.** `story.ts` looks shots, camera keys and acting beats up by word (`cue(line, "word")`),
  so re-voicing a line moves its pictures with it. `scripts/dump-timeline.mjs` exports the same timeline for the sound.
- **New world** (`world.ts`, `build.ts`):
  - a town square around a party lawn: table, cake with candles, balloons, bunting, string lights and a banner;
  - the glowing web of birthday pairs, which shows Gary's 22 lines, then all 253 pairs, then 50 and 70 people;
  - a 3D gold coin, confetti, and a football stadium for the 2014 World Cup fact.
- **New cast pieces** (`toon.ts`, `cast.ts`):
  - party hats, glasses, jersey numbers;
  - wink, sad and talk faces;
  - handshake, cheer, cash and palm poses;
  - number tags, speech bubbles, calendar pages, "?" marks, cricket chirps and sparkles.
- **Narration with timings:** the voice is Kokoro-82M TTS (`voice/gen_voice.py`, Apache-2.0 model). Word timings come from
  the TTS itself and were checked against Whisper (median offset 0.01 s).
- **Sound** (`audio/sound.py`):
  - an original score whose sections follow the picture, ducked under the voice;
  - about 80 synthesized SFX cues;
  - a master at -14.5 LUFS and -1 dBTP.
  `audio/levels.py` is an objective level check, for containers where nobody can listen.

## Facts and sources
See `SCRIPT.md`. In short:
- 23 people give a 50.7 % chance of a match, from 253 pairs. 50 people give 97 % and 70 give 99.9 %.
- For a coin-flip chance that someone shares one given birthday, you need 253 other people.
- In 2014, 16 of the 32 World Cup squads of 23 had a shared birthday (BBC).
- 9 September is the most common US birthday.

## Build (Linux, no GPU)
```bash
npm install && npm run fonts                                # Remotion 4 + R3F 9 + postprocessing, fonts into public/
python voice/gen_voice.py am_michael 1.2                    # needs `pip install kokoro soundfile` (Python <= 3.12)
cp voice/words.json src/videos/birthday/words.json
node scripts/dump-timeline.mjs                              # out/timeline.json
python audio/sound.py && python audio/levels.py             # out/audio/mix.wav (+ stems, cues.md)
node scripts/stills.mjs BirthdayShort out/look/s_ 120,700,1090,1900 0.5
node scripts/render-chunks.mjs 3 0-143,144-294,...          # parallel chunks, resumable
scripts/finish.sh                                           # concat + mux + frame QA -> out/birthday_bet.mp4
```
Chromium uses software WebGL (`gl: "swangle"`), about 7.5 s per 1080p frame on 4 CPU cores. Render the chunks in
parallel and check stills before the full render.
