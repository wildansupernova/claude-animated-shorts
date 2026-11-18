# Bread and Bombs from Thin Air (Fritz Haber), production notes, 2026-11-14

Final: `out/haber_1080x1920.mp4` (native render) and `out/haber_1440x2560.mp4` (lanczos upscale). Both are 68.37 s, 30 fps,
2051 frames, AAC 48 kHz at −14.1 LUFS. The mp4 files are git-ignored (they are larger than the GitHub file limit).

## Pipeline as run
- Facts: verified by a research agent (sources at the top of `SCRIPT.md`). The wording keeps the documented record:
  - "helped kill millions" covers explosives from Haber-Bosch nitrates plus gas;
  - "his institute's pest-killing research leads to a gas called Zyklon. A later version...";
  - "by some estimates" for the body-nitrogen figure;
  - Clara's death is shown only as an empty bench, never the method.
- Voice: Kokoro-82M, voice `am_fenrir` at speed 1.33 (`scripts/tts.py`), 3.74 words/s. The word times come from Kokoro token
  timestamps and are cross-checked with faster-whisper (median offset −2 ms) in `voice/words.json`.
- Picture: built from `templates/bridge/`. The look modules are unchanged: ink, lens blur, grade, two-tone shading, card shading,
  painted textures. What is new:
  - `toon.ts`: bald/pince-nez Haber, beards, pickelhaube/kepi/peaked/flat caps, a hair bun, held props;
  - `fx.ts`: N2 molecules, chlorine fog, birds, sprout, poster, bugs, confetti;
  - `world.ts`: five sets (farm + factory, lab, sea, trench + night camp, Alps), each its own group, shown only in its own shots;
  - `story.ts`: 22 shots timed to the words;
  - `cast.ts`: staging;
  - `lights.ts`/`grade.ts`: a `night` preset.
- Sound: the template audio pipeline adapted by an agent (`audio/`). Synthesized SFX and an original score; the voice is limited
  ~5 dB on its peaks to reach −14 LUFS.

## Environment notes (cloud container, no GPU)
- WebGL ran through SwiftShader (`gl: "swangle"`, Playwright's chrome-headless-shell).
  - Full quality (MSAA 4, ink, lens, bloom) took ~4.5 s per frame at 1080x1920.
  - Concurrency 2 was slower than 1 on 4 cores.
  - A native 2K render would have been ~2x longer, so the 2K file is an upscale.
- The render ran in 3 segments of ~45 min, plus patch ranges (`scripts/render_patches.mjs`).
  - `scripts/assemble2.py` stitches them frame-accurately (later sources win) and muxes the mix.
- Card canvases are sized for the 1080 render (`tier()` in `cast.ts`). Raise them back (x1.33) for a native 1440 render.

## Review history
- Verifier round 1 scores: colour 6, lighting 6, ink 7, characters 7, depth 7, composition 5, clarity 5. The fixes applied:
  - chlorine as see-through, ground-hugging fog (it had looked like bushes);
  - a limp empty sack;
  - rope + sack for the tug of war;
  - the ships separated;
  - Ypres side-lit, with less purple;
  - faces kept inside the frame;
  - a pest scientist who no longer looks like Haber.
- QA (`out/qa_report.md`): no black, white, frozen or pop frames after the fixes.
- One cause of pops: characters vanished 2 frames before their cut, because the expression lead (LEAD) was also applied to scene changes.
  Rule: LEAD is only for expressions and actions inside a shot, never for appear/disappear at a cut.

## Captions (added on request, 2026-11-15)
- `scripts/captions.py` → `out/captions.ass` (burned in) + `out/captions.srt` (platform upload / translation).
- Viral style: Inter Display Black 120 px at 1080, white with a 10 px black outline, key words yellow, centred at y 1300/1920
  (clear of the platform UI), hard swaps 2 frames before each phrase, a small pop-in scale.
  Clara's line and the camps line are plain white with no pop.
- Phrase breaks are hand-set (`BREAKS`); spoken numbers are shown as figures (78%, 200 TIMES, 500 DEGREES, 168 TONS);
  each phrase is scaled to fit 960 px, measured with the real font.
- Burned with ffmpeg `ass=` onto the finished renders (no 3D re-render): `out/haber_*_captions.mp4`.
