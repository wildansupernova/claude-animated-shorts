SPECS 1080x1920 30/1 fps, 2049 frames, 68.300 s; audio: aac 48000 Hz 2ch
LOUDNESS I:         -14.6 LUFS | LRA:         2.3 LU | Peak:       -1.1 dBFS
SILENCES none
FRAMES 2049; black []; unplanned white []; frozen spans >=12f []
POPS (unplanned frame-diff spikes > 3x local median): [163, 164, 204, 234, 451, 470, 664, 706, 707, 708, 710, 860, 1151, 1158, 1595, 1663, 1701, 1702, 1704, 1796, 1797, 1816, 1817, 1818, 1819]
MOTION mean diff 7.72; frames with diff<0.3 (held): 1 (0%)

PER SHOT  (luma mean / std / p2 / p98 / saturation mean, medians over the shot)
  shot  1 f0-143: 0.591 / 0.211 / 0.104 / 0.965 / 0.673
  shot  2 f144-294: 0.468 / 0.256 / 0.030 / 0.911 / 0.595
  shot  3 f295-397: 0.510 / 0.235 / 0.040 / 0.962 / 0.502
  shot  4 f398-473: 0.448 / 0.235 / 0.024 / 0.883 / 0.579
  shot  5 f474-502: 0.567 / 0.220 / 0.101 / 0.964 / 0.493
  shot  6 f503-538: 0.436 / 0.271 / 0.024 / 0.899 / 0.536
  shot  7 f539-637: 0.579 / 0.225 / 0.081 / 0.969 / 0.650
  shot  8 f638-686: 0.571 / 0.219 / 0.038 / 0.903 / 0.626
  shot  9 f687-729: 0.501 / 0.221 / 0.038 / 0.938 / 0.553
  shot 10 f730-817: 0.602 / 0.202 / 0.113 / 0.945 / 0.688
  shot 11 f818-842: 0.445 / 0.258 / 0.024 / 0.942 / 0.592
  shot 12 f843-962: 0.308 / 0.144 / 0.057 / 0.777 / 0.659
  shot 13 f963-1125: 0.387 / 0.169 / 0.113 / 0.854 / 0.585
  shot 14 f1126-1292: 0.337 / 0.211 / 0.028 / 0.868 / 0.670
  shot 15 f1293-1394: 0.528 / 0.261 / 0.126 / 0.934 / 0.595
  shot 16 f1395-1533: 0.552 / 0.300 / 0.104 / 0.947 / 0.490
  shot 17 f1534-1737: 0.599 / 0.175 / 0.052 / 0.904 / 0.612
  shot 18 f1738-1935: 0.348 / 0.256 / 0.022 / 0.868 / 0.645
  shot 19 f1936-2048: 0.346 / 0.196 / 0.042 / 0.911 / 0.640

## Review notes (checked by eye)
Every flagged POP is planned:
- **Caption chunk pop-ins:** 163-164, 204, 234, 860, 1158, 1701-1702.
- **Speech-bubble pops:** 451, 470, 664, 706, 1796-1797.
- **Camera beats:** the kick on "seventeen" (707-710), the coin shake (1151), and the cuts inside shot 17 on "every" (1595) and "and" (1663).
- **Character beats:** the cake pop (1704) and Gary's blink (1816-1819).

The share encode `birthday_paradox_short.mp4` (x264 crf 21, `-tune animation`, max 7 Mb/s, AAC 192k, 49 MB) measures mean SSIM 0.988 against the crf 16 master. Its lowest frame, 0.944, is the crossfade into the stadium crowd (f1537). Loudness is unchanged at -14.6 LUFS / -1.1 dBFS.
