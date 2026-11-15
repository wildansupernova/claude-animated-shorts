# Henrietta Lacks short: build notes

60.2 s, 1080x1920 at 30 fps (1806 frames), with a lanczos-upscaled 1440x2560 copy. English captions are burned in, and `out/captions.srt` is provided as well.
Facts, sources and the script are in `SCRIPT.md`.

## Pipeline
| Step | Files | Notes |
|---|---|---|
| Voice | `voice/voice.wav`, `voice/words.json` | Kokoro `am_fenrir` at 1.33x via `scripts/tts.py`. Token timestamps are used as word timings (checked against faster-whisper, about ±70 ms). |
| Shot plan | `src/story.ts` | 27 shots. Crossfades: 11→12, 12→13, 21→22, 23→24 and 26→27. The events (`EV`) are timed to the words. |
| Scenes and cast | `src/world.ts`, `src/cast.ts`, `src/fx.ts`, `src/toon.ts` | Our own toon cast. The cell shots get a microscope vignette (`Henrietta.tsx`). |
| Sound | `audio/*.py`, `audio/cues.md` | Score and SFX mixed to −14 LUFS and −1 dBTP. |
| Captions | `scripts/captions.py` → `out/captions.ass` and `.srt` | Phrase breaks are hand-set and spoken numbers are written as figures. Key words are yellow. The two solemn lines (her death, "nobody ever asked her") are plain, with no pop and no colour. |
| Render | `scripts/render_all.sh`, `scripts/render_patches.mjs` | CPU SwiftShader at about 4.5 s/frame. Rendered as three segments (A 0–599, B 600–1199, C 1200–1805) plus patch ranges. |
| Assemble | `scripts/assemble.py` | Stitches segments and patches frame-accurately (the later source wins per frame), muxes the mix, upscales to 1440p and burns the captions onto both sizes. |

`src/` is a copy of `src/videos/henrietta` from the Remotion project, where it is registered as `HenriettaShort`.

```bash
COMP=HenriettaShort OUTDIR=out/henrietta/seg scripts/render_all.sh 0 599 A
```

```bash
COMP=HenriettaShort OUTDIR=out/henrietta/seg node scripts/render_patches.mjs 685-732,1685-1739,56-106
```

```bash
python3 shorts/henrietta/scripts/assemble.py
```

## QA fixes
- **Cell division (shots 2, 9, 26):** the first full render had pops. In shot 9 each new generation used a new spiral layout, so every cell teleported. In the background fields a split cell snapped back to one cell. The fixes:
  - The cell card is now a uniform 800x800, so the split card's lobes sit exactly where two 0.75-size daughter cells go.
  - Shot 9 is an H-tree colony (1 → 2 → 4 → 8 → 16 → pinching to 32). Daughters are born on the parent's lobes and glide out to their spot.
  - In the fields, a cell that splits stays split and its halves ease apart.
  - Faces cross-fade from one face to two, so overlapping lobes never show a doubled face.
- **Sensitivity:** her death is shown only as an empty chair on the porch. There is no medical detail on screen, and the tone stays steady.
