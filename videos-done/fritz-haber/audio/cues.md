# Bread and Bombs from Thin Air (Fritz Haber) - sound cue sheet

Original score + SFX, all synthesized in numpy/scipy (`instruments.py`, `sfx_gen.py`, placed by `music.py` / `sfx.py`, mixed by `mix.py`; pipeline adapted from `templates/audio/`). No samples, no vocal sounds in the SFX.

## Output
- `mix.wav`: 48 kHz stereo 16-bit (TPDF dither), 3,281,600 samples = 68.3667 s (2051 frames @ 30 fps), voice from t = 0.
- `stems/voice|music|sfx.wav`: 24-bit, pre-master balance (voice = voice.wav untouched, 24 -> 48 kHz). mix = limiter(+5.43 dB x (voice + music + sfx)), last 0.3 s faded.
- Loudness: **-14.0 LUFS** integrated, **-1.3 dBTP** true peak (own BS.1770-4 meter; ffmpeg ebur128 agrees), LRA 2.2 LU.
- Getting there needs +5.4 dB on the whole mix: the voice alone is -19.3 LUFS with peaks at -1.6 dBTP, so its peaks are limited (ceiling -1.3 dBTP, max 5.0 dB, >0.5 dB on 9 % of samples). Music + SFX alone never reach the limiter.

## Levels (user standard: music +3 dB, SFX -6 dB, voice unchanged; applied the way the template does)
- Music ducked -3 dB under speech (key = words.json), then per section to a target under the voice (LU): hook -8, invent -10, bright -9, war -10, gas -9, somber -13, morning -13, sneaky -11, fanfare -10, dark -14, return -10.
- Music rides under quiet key words: 4.15-4.80 -6 dB, 11.80-12.12 -4 dB, 23.95-24.62 -4 dB, 25.45-26.00 -4 dB, 27.55-28.15 -4 dB, 34.15-35.95 -3 dB, 41.75-42.47 -4 dB, 67.34-67.95 -4 dB.
- SFX events at naive level - 6 dB (LU vs voice, max momentary), beds at their integrated level; SFX stem ducked -2 dB under speech.
- Voice vs bed (music + SFX), LU: hook 8.3 (speech p10 4.2); farm/sea/farm 10.9 (speech p10 6.8); lab 8.2 (speech p10 4.1); flask+crowd 9.4 (speech p10 5.6); factory/sea 9.0 (speech p10 3.1); trench 4.8 (speech p10 2.9); Ypres+gas 11.2 (speech p10 5.0); night 13.0 (speech p10 9.9); morning/Alps 11.6 (speech p10 5.1); Nobel 9.8 (speech p10 3.0); lab2 12.0 (speech p10 7.1); camp/candle 14.4 (speech p10 10.7); ending 10.1 (speech p10 3.8).

## Music map (one piece built on the hook's bell motif D-A-G-F-E | D-A-Bb-A-C#)
| s | frame | music |
|---|---|---|
| 0.00 | 0 | HOOK: low hit + low brass fp + timpani + dark cymbal on frame 0; bell motif D-A-G-F-E | D-A-Bb-A-C# (100 bpm), 3+3+2 synth pulse, tick, low strings |
| 2.40 | 72 | high string tremolo A5/D6 enters (tension) |
| 3.60 | 108 | reverse-cymbal swell + timpani roll into the white flash; music cut at 4.80 (the SFX flash impact owns 4.80-4.93) |
| 4.87 | 146 | invention: clarinet pickup C-D-E into the playful F major tune (pizzicato oom-pah, woodblock) |
| 6.27 | 188 | stop-time 6.27-6.87: room for the 6.53 shock sting |
| 10.27 | 308 | mock-military clarinet + snare on 'war over it', stop at 11.27 for the 11.4 cannon |
| 13.07 | 392 | clarinet glissando up with the 13.07 inhale, lands on a held F5 |
| 15.07 | 452 | 'can't crack it open': chromatic slide down, Bb -> Bb minor, stop at 16.07 for the boing |
| 16.67 | 500 | lab: tune drops to low clarinet, woodblock tick-tock (stubborn) |
| 18.27 | 548 | squeeze: tune climbs in sequence, staccato strings + shaker, pump strokes land on the beats (18.67 + k*0.4) |
| 21.47 | 644 | 'cooks it': soft low brass swell + timpani roll |
| 24.07 | 722 | clarinet run + snare roll + reverse cymbal into 'Fertilizer' |
| 24.67 | 740 | BRIGHT on 'Fertilizer': tune high on clarinet + violins, full F major |
| 25.47 | 764 | small triumphant lift 25.47: trumpets 'ta-daa' (C-F-A), horns, timpani, soft cymbal, glock run |
| 26.27 | 788 | warm 'feeds half the people on Earth': Bb6 - F/A - Gm6 - A7 (melody G-F-E-C#), turning to D minor |
| 27.87 | 836 | WAR (D minor): the hook's pulse returns as machinery, military snare enters light, bass drum |
| 30.27 | 908 | low brass stab + timpani on 'explosives' / shell clank (30.27) |
| 31.07 | 932 | low horns play the motif (D-A-G-F-E | D-A-Bb-A-C#), snare march |
| 35.13 | 1054 | trench tutti: string tremolo, snare drive; brass stabs + timpani + low hits exactly on 35.13 and 35.50 |
| 35.87 | 1076 | Ypres hush: snare dies away, heartbeat bass drum, tremolo Eb/D -> dim7/D; leaves room for the pocket watch |
| 38.67 | 1160 | GAS: low brass cluster D-Eb-A-Bb swells, string cluster D-Eb-E-F slides down 2 semitones |
| 39.07 | 1172 | march + pulse return under the gas, snare drive from 40.67 |
| 41.20 | 1236 | panic: high string tremolo cluster + brass stabs 41.2 / 41.47 / 41.87 / 42.27, final low hit 42.27, cut 42.47 |
| 42.55 | 1276 | SOMBER: low piano D (octave + fifth), motif fragment F-E-D, soft low strings Dm -> Bb |
| 45.20 | 1356 | near silence 45.2-46.2 (everything faded to -26 dB): no music for her death |
| 46.30 | 1389 | hesitant morning: soft strings Bb, solo clarinet F..G-Bb (gaps between phrases) |
| 48.13 | 1444 | Alps / 'wanted': G minor strings, clarinet droops (49.2), hesitant low pizz |
| 49.93 | 1498 | sneaky tiptoe pizzicato (G minor), staccato clarinet on the offbeats; grid hits 50.33 (poof) and 51.13 (tiptoe) |
| 52.33 | 1570 | snare + timpani roll under the footsteps |
| 53.13 | 1594 | ironic little fanfare 53.13: trumpets ta-ta-TAA ta-ta-TAAA (Bb), horns, timpani, cymbal; the last chord droops 1.5 semitones and dies by 54.35 |
| 54.40 | 1632 | DARK: D drones + a faint D/A string fifth (no beats), Eb drone enters with the poison can (56.77) - minor-ninth beating |
| 58.10 | 1743 | camp: cold high strings A/Bb, one far low bell |
| 60.73 | 1822 | candle: drones fade toward silence; one soft piano D (61.45) |
| 62.70 | 1881 | RETURN: the hook's bell motif, soft, over piano + warm strings Dm9 - Bbmaj7 - A - Fmaj7/C - Gm6 - A7, soft pulse |
| 67.30 | 2019 | final low hit on 'warfare' 67.30: sub hit, low brass, timpani, bell D, D minor strings; tail to 68.37, fade from 68.07 |

## SFX (s; naive -> applied LU; beds marked)
- 0.00: soft wind over the farm (hook) (bed) [-26 -> -26]
- 1.68: trench rumble bed, far shelling thuds (hook) (bed) [-22 -> -22]
- 1.68: gas hiss far off, under the rumble (hook) (bed) [-33 -> -33]
- 3.45: lab room tone: air + mains hum (hook) (bed) [-30 -> -30]
- 3.60: sparkle twinkle over the lab bench (3.6-4.6) [-11 -> -17]
- 4.80: white flash 4.80-4.93: reverse swell peaking on the cut + impact (sub thump, crack, sizzle) [-8 -> -14]
- 4.85: farm: birds + light wind (bed) [-25 -> -25]
- 6.53: comic shock sting: farmer looks into the empty sack [-8 -> -14]
- 7.75: sea: waves + sea wind (bed) [-20 -> -20]
- 7.95, 9.05, 10.75: seagull-like synthesized chirps (distant) [-17 -> -23]
- 8.50, 9.40, 10.20, 11.00: small plop drop [-13 -> -19]
- 10.30: rope creak/strain (tug of war) [-11 -> -17]
- 11.40: cannon boom (muzzle crack, blast, boom, echo) [-5 -> -11]
- 11.52: debris puff after the cannon [-14 -> -20]
- 12.01: farm: birds + light wind (bed) [-25 -> -25]
- 13.07: big inhale whoosh: rising airy noise ~1.5 s (noise only, no voice) [-6 -> -12]
- 15.65, 16.15: tiny hammer tink on the molecule [-13 -> -19]
- 16.13: cartoon 'dazed' boing [-12 -> -18]
- 16.23: twinkly stars circling [-17 -> -23]
- 16.55: lab room tone (through the flask shot to 25.9) (bed) [-28 -> -28]
- 17.67: camera whoosh [-10 -> -16]
- 18.67, 19.07, 19.47, 19.87, 20.27, 20.67, 21.07, 21.47, 21.87, 22.27, 22.67, 23.07, 23.47: pump piston stroke (2.5 Hz) [-11 -> -17]
- 18.67: pressure gauge: rising metal creak + hiss (18.67-23.73) [-14 -> -20]
- 20.97: furnace ignition whoomph [-5 -> -11]
- 21.02: roaring furnace fire bed (to 23.4) (bed) [-21 -> -21]
- 22.80: machine clank [-9 -> -15]
- 24.15, 24.77, 25.39, 26.01: liquid drip plink into the flask [-12 -> -18]
- 24.67: flask raised: soft glass clink + swish [-16 -> -22]
- 25.40: sparkle burst chime ('out of thin air') [-11 -> -17]
- 25.88: outdoor crowd scene bed: birds + warm air (no voices) (bed) [-24 -> -24]
- 25.95: warm handbell glissando (F major) [-12 -> -18]
- 28.05: factory conveyor rattle, belt, motor hum (bed) [-21 -> -21]
- 28.37, 28.99, 29.61: fertilizer sack thump [-10 -> -16]
- 30.20: heavy metal shell CLANK + impact [-3 -> -9]
- 31.41: grey sea: heavier waves, wind (bed) [-23 -> -23]
- 31.67: warship steam whistle (three chambers) [-6 -> -12]
- 31.67: steam-engine chug (from 31.67, slowing before the stop) [-13 -> -19]
- 33.73: engine stops with a release hiss [-11 -> -17]
- 34.75: trench rumble (bed) [-25 -> -25]
- 35.13, 35.50: field-gun boom with ground shake + dirt rain [-4 -> -10]
- 36.01: Ypres: wind over the lines (bed) [-24 -> -24]
- 36.35, 37.65, 39.30, 40.40: distant artillery [-18 -> -24]
- 37.03: pocket-watch tick bed (5 Hz) until 38.5 (bed) [-23 -> -23]
- 38.67: many gas valves opening: squeak-clunks, each starting a hiss [-8 -> -14]
- 38.67: hiss swelling into a rolling low cloud rumble (38.67-42.5) (bed) [-21 -> -21]
- 41.20: panic: short pea-whistle alarm blasts (no voice) [-11 -> -17]
- 41.20: boots running through the trench (41.2-42.5) (bed) [-24 -> -24]
- 42.48: night lab: quiet room tone (drops to near silence at 45.2) (bed) [-32 -> -32]
- 42.60: faint wall-clock tick (stops at 45.2) (bed) [-29 -> -29]
- 46.21: golden morning: birds, soft air (bed) [-25 -> -25]
- 46.45, 46.95, 47.45, 47.95: slow footstep (2 per second) [-15 -> -21]
- 46.62, 47.62: suitcase handle creak [-17 -> -23]
- 48.11: Alps: mountain wind (bed) [-24 -> -24]
- 48.11: distant cowbells (bed) [-26 -> -26]
- 50.37: 'poof' puff as the beard appears [-8 -> -14]
- 51.10: sneaky tiptoe pluck + toe tick [-11 -> -17]
- 52.31: hall room tone (bed) [-33 -> -33]
- 52.38, 52.62, 52.86: footsteps to the podium [-15 -> -21]
- 53.13: medal 'ding' [-9 -> -15]
- 53.13: confetti pop + paper flutter [-8 -> -14]
- 54.38: lab room tone (bed) [-31 -> -31]
- 54.40, 54.73, 55.06, 55.39, 55.72, 56.05, 56.38, 56.71: spray-can 'psst' [-13 -> -19]
- 55.87, 55.96, 56.08, 56.23: tiny bug thud [-18 -> -24]
- 56.77: ominous low hit: the poison can appears [-5 -> -11]
- 58.08: night camp: cold wind (bed) [-25 -> -25]
- 58.08: low electric searchlight hum (bed) [-33 -> -33]
- 60.71: soft candle flicker, near silence (bed) [-37 -> -37]
- 62.68: golden ending: soft air, faint birds (bed) [-31 -> -31]
- 63.00: gentle sparkles/chimes as molecules fall (63-65) [-12 -> -18]
- 63.87: soft shock sting [-12 -> -18]
- 65.27: whoosh up toward the sky [-10 -> -16]
- 67.30: final low boom on 'warfare' [-5 -> -11]
