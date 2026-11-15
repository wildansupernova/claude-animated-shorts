# The Woman Who Never Stopped (Henrietta Lacks) - sound cue sheet

Original score + SFX, all synthesized in numpy/scipy (`instruments.py`, `sfx_gen.py`, placed by `music.py` / `sfx.py`, mixed by `mix.py`; pipeline adapted from the Haber short). No samples; no vocal sounds (no voices, laughter or coughs).

## Output
- `mix.wav`: 48 kHz stereo 16-bit (TPDF dither), 2,889,600 samples = 60.2000 s (1806 frames @ 30 fps), voice from t = 0.
- `stems/voice|music|sfx.wav`: 48 kHz 32-bit float, pre-master balance (voice = voice.wav untouched, 24 -> 48 kHz). mix = limiter(+5.58 dB x (voice + music + sfx)), last 0.3 s faded.
- Loudness: **-14.0 LUFS** integrated, **-1.3 dBTP** true peak (own BS.1770-4 meter; ffmpeg ebur128 cross-check), LRA 2.0 LU.
- Voice alone -19.4 LUFS, peaks 0.2 dBTP: with +5.6 dB its peaks hit the limiter (ceiling -1.3 dBTP, max 7.0 dB, >0.5 dB on 10 % of samples), as in the Haber mix.

## Levels
- Music ducked -3 dB under speech (key = words.json), then set per section to a target under the voice (LU): hook -8.5, americana -11.0, exam -14.0, lab -10.5, explain -11.0, death -19.0, montage -11.0, rocket -11.0, papers -10.5, swell -10.5, lownote -21.0, sober -13.5, relief -12.0, ending -11.0.
- Music rides under quiet words: 3.50-4.35 -3.0 dB, 4.35-4.90 -6.0 dB, 22.20-22.75 -3.0 dB, 22.78-23.05 -3.0 dB, 28.55-29.35 -3.0 dB, 39.50-40.30 -3.0 dB, 41.65-42.30 -4.0 dB, 51.00-51.42 -3.0 dB, 53.80-54.75 -3.0 dB, 57.85-59.85 -3.0 dB, 59.15-59.82 -7.0 dB.
- SFX events at naive level - 6 dB (LU vs voice, max momentary), beds at their integrated level; SFX stem ducked -2 dB under speech.
- Voice vs bed (music + SFX), LU: hook 7.9; farm 11.5; street 8.4; exam 13.0; lab 8.6; explain 10.3; death 18.6; montage 9.5; rocket 8.1; papers 10.6; protected 10.2; unluckily 20.9; porch 12.6; court 12.2; ending 11.1.

## Music map (one piece on the hook motif (A) F-E-D-A | G-F-E-C# -> D)
| s | music |
|---|---|
| 0.00 | HOOK (D minor): pickup A4 on chime bell + piano with a soft low bloom (felt sub hit, low piano D) on frame 0; motif F-E-D-A | G-F-E-C# -> D over soft pulse + heartbeat lub-dub, low strings Dm |
| 1.87 | lift 1 (microscope): reversed-cymbal breath into the cut, Bb - A strings open up, timpani touch |
| 3.57 | lift 2 (space): Dm(add9), high string shimmer, the figure floats up A5-D6-E6 (bell, celesta A6) |
| 4.25 | reversed cymbal + timpani roll into the white flash; music out at 4.88 (the flash whoosh owns 4.90) |
| 5.03 | 1951 AMERICANA (G major, 98.6 bpm): fingerpicked steel-string guitar G | C G | Em C D | G C, piano tune B-A-G-D (the motif in major), soft brushes |
| 11.11 | strings rise C - D into the hospital |
| 12.33 | SWELL 12.33 (hospital revealed): strings G major, piano chord, timpani, cymbal breath, glock |
| 14.70 | EXAM ROOM (hushed): low strings Cm/G over a G pedal, thin high G5, piano semitone sighs Eb-D, Ab-G, C-B |
| 16.30 | harmony slips to Abmaj7/G (G against Ab), high string G5 -> Ab5 |
| 18.50 | thins out on 'without asking her': only a faint high D6 and a low G remain |
| 19.43 | GEY'S LAB (100 bpm): curious pizzicato + marimba pickup D-G-B |
| 20.47 | dying cells: G - D/F# - Gm/F - A7/E (bass walks down G-F#-F-E on the beats, pops sit on the 8ths) |
| 22.83 | BRIGHTENS on 'Hers don't' (D major, 93.75 bpm): marimba + glock + pizz climb with the rising bloops |
| 24.43 | stop-time 24.40-25.09 for the surprised sting |
| 25.11 | WONDER (explanation): celesta arpeggios + vibes + strings, Gmaj7 - A/G - F#m7 - Bm7 (the tick bed shares the 8th grid) |
| 28.67 | Em9 held through the hourglass shatter, A7sus4 ebbs out by 29.38 |
| 29.45 | NEAR SILENCE (her death): one soft low D minor chord, piano + faint low strings, gone by 31.3 |
| 31.40 | MONTAGE (150 bpm, D major): pulse starts on 'Her cells keep going' (Asus4 - A pickup), heartbeat every half bar |
| 33.80 | piano 8th ostinato + violin line rising D | Bm | G | A, chords climbing in register |
| 37.00 | build: string tremolo crescendo, timpani roll, reversed cymbal into the ignition |
| 38.60 | PEAK 38.6 (ignition): horns + trumpets A-F#-D6 (on the 39.0 liftoff), tuba, timpani, cymbal, low hit, pulse in 8ths |
| 40.20 | 40.2 paper tower: G, marimba, horns ease; celesta cascade down with the 41.2 paper avalanche |
| 42.30 | WARM SWELL (millions protected): D major strings + soft horns + piano, violin F#-G-A; gone by 44.25 |
| 44.27 | 44.27 'Unluckily': a single low piano D2, very quiet, nothing else until 46.0 |
| 46.00 | SOBER (D minor, slow): piano Dm - Bb/D - Gm/D - A/C#, low strings, lone violin F-E-D-C# |
| 51.20 | RELIEF: Bb - C - D, violin D-E-F# (minor turns major) |
| 52.83 | soft hopeful D major chord on 'settle' 52.83: strings, piano, soft horns, celesta D-F#-A; G/D 53.88 |
| 54.70 | RETURN: Dsus2 pad, soft pulse + heartbeat back (modern lab) |
| 55.66 | the hook motif in D major, chime bell + piano: (A) F#-E-D-A | G-F#-E-C#, D - Bm7 - G - A7 |
| 59.23 | FINAL CHORD on 'name' 59.23: D(add9) strings swell, rolled piano, bell D5/A5, soft horns, celesta up; tail to 60.2, faded over the last 0.3 s |

## SFX (s; naive -> applied LU vs voice; beds marked)
- 0.00: farm ambience: soft wind + birds (hook) (bed) [-20 -> -20]
- 1.87: soft microscope whoosh into the cell bed [-3 -> -9]
- 1.87: bubbly cell bed under the microscope (1.87-3.57) (bed) [-19 -> -19]
- 2.30, 2.90, 3.30: cell division bloop (D4, F4, A4) [-2 -> -8]
- 3.55: space: deep soft hum + dark air (3.57-4.9) (bed) [-20 -> -20]
- 3.57: gentle satellite beep pattern (D6) until 4.9 [-10 -> -16]
- 4.90: flash whoosh: short airy swell peaking on the white flash 4.90, shimmer, soft low bloom (speech band carved) [-8 -> -14]
- 4.98: farm: birds, light breeze (bed) [-18 -> -18]
- 6.45, 8.95: porch creak [-7 -> -13]
- 10.90: 1951 city street: distant traffic rumble, a few far cars (bed) [-18 -> -18]
- 10.95, 11.41, 11.87, 12.28: footsteps on cobbles (10.93-12.3) [-6 -> -12]
- 14.68: exam room: quiet room tone (60 Hz hum, air) (bed) [-27 -> -27]
- 15.00: wall-clock tick (1 per second) (bed) [-23 -> -23]
- 17.40: tiny metal instrument clink (sample taken) [-6 -> -12]
- 17.49: glass sample tube clink [-6 -> -12]
- 19.41: 1951 lab hum (60 Hz) + air (bed) [-24 -> -24]
- 19.43: slow motor whir of the roller drum (19.43-20.83) (bed) [-19 -> -19]
- 20.78: faint cell bed under the dying / dividing cells (20.83-24.43) (bed) [-27 -> -27]
- 21.40, 21.70, 22.00, 22.30, 22.60: dying-cell 'bwomp' pop, descending (A4 G4 F4 E4 C#4), each softer [-3 -> -9]
- 22.87, 23.19, 23.51, 23.83, 24.15: dividing-cell bloop, each higher (D4 E4 F#4 A4 B4) [-2 -> -10]
- 24.43: short surprised sting: upward 'bwip' + two bright pings (D6/A6) [-9 -> -15]
- 25.13: hourglass / countdown tick bed (8ths, 0.32 s, as the music) + fine sand trickle (stops at the shatter) (bed) [-20 -> -20]
- 27.43: cartoon zip: the virus flies in [-5 -> -11]
- 28.67: glass shatter: the hourglass breaks (crack, shard cascade, sand) [-4 -> -10]
- 28.79: sparkle after the shatter [-7 -> -13]
- 29.00: happy bloop (E5) + tiny ping [-8 -> -14]
- 29.38: October dusk: soft wind (bed) [-29 -> -29]
- 29.40: rustling leaves (gusty, very soft) (bed) [-30 -> -30]
- 31.37: roller drum whirring with glass tubes clinking (31.37-32.6) (bed) [-19 -> -19]
- 32.53: sparkle chime: the cells are named HeLa (D major, A6-D8) [-5 -> -11]
- 32.53: lab tone (bed) [-27 -> -27]
- 33.71: town street: light distant traffic (bed) [-22 -> -22]
- 33.78, 34.28, 34.78: footstep (2 per second) [-5 -> -11]
- 33.78: glass tubes rattling in a carried crate (with every step) [-6 -> -12]
- 35.25: vaccine clinic: room tone (bed) [-27 -> -27]
- 36.00: tiny 'pinch' pop (vaccine) [-4 -> -10]
- 36.10: bright little chime after the pinch (G7 B7 D8) [-4 -> -10]
- 36.78: lab tone (bed) [-27 -> -27]
- 36.80: microscope focus click [-3 -> -9]
- 37.57: DNA twinkle: pings spiralling up (A major, A6-E8) [-4 -> -10]
- 38.28: launch pad: venting hiss + wind before ignition (bed) [-33 -> -33]
- 38.60: rocket ignition: sputtering crackle + low rumble catching [-4 -> -10]
- 39.00: HUGE liftoff roar, swelling, to 40.17 [-3 -> -9]
- 40.17: paper tower: sheets shuffling (40.17-42.3) (bed) [-21 -> -21]
- 41.20: avalanche of falling paper: rush of sheets + stack thuds [-6 -> -12]
- 42.28: warm outdoor bed: soft air, birds (no voices) (bed) [-20 -> -20]
- 44.27: near silence: a faint night breeze (bed) [-33 -> -33]
- 45.98: family porch: soft breeze, far birds (bed) [-23 -> -23]
- 46.80: paper letter rustle [-7 -> -13]
- 46.90: soft shock sting: airy swell into a soft low thump + glassy A/Bb shimmer [-8 -> -14]
- 49.43: slow clock ticks (decades passing) to 51.2 (bed) [-22 -> -22]
- 49.43: wind rising (decades passing) (bed) [-24 -> -24]
- 51.18: city outdoors (2023): light traffic wash (bed) [-22 -> -22]
- 51.18: birds at the courthouse steps (bed) [-23 -> -23]
- 54.68: modern lab hum (fans, 60 Hz) (bed) [-24 -> -24]
- 54.90: microscope click [-6 -> -12]
- 56.15: faint cell bed (bed) [-26 -> -26]
- 56.35, 56.80, 57.25, 57.65: gentle cell bloop (A4 F#4 D5 B4) [-5 -> -11]
- 57.85: golden evening breeze, faint birds (bed) [-25 -> -25]
- 58.60: soft sparkle chime 58.6-59.6 (D major, F#7-F#8) [-11 -> -17]
