SPECS 1080x1920 30/1 fps, 1648 frames, 54.933 s; audio: aac 48000 Hz 2ch
LOUDNESS I:         -14.2 LUFS | LRA:         1.6 LU | Peak:       -1.1 dBFS
SILENCES none
FRAMES 1648; black []; unplanned white []; frozen spans >=12f []
POPS (unplanned frame-diff spikes > 3x local median): [31, 32, 197, 539, 662, 663, 664, 665, 703, 990, 1234, 1297, 1323, 1324, 1326, 1385, 1479, 1480, 1481, 1482, 1596]
MOTION mean diff 7.29; frames with diff<0.3 (held): 1 (0%)

PER SHOT  (luma mean / std / p2 / p98 / saturation mean, medians over the shot)
  shot  1 f0-25: 0.534 / 0.229 / 0.072 / 0.969 / 0.585
  shot  2 f26-81: 0.446 / 0.276 / 0.024 / 0.893 / 0.596
  shot  3 f82-177: 0.512 / 0.241 / 0.047 / 0.969 / 0.554
  shot  4 f178-268: 0.579 / 0.219 / 0.085 / 0.969 / 0.642
  shot  5 f269-344: 0.464 / 0.260 / 0.026 / 0.896 / 0.597
  shot  6 f345-404: 0.531 / 0.232 / 0.036 / 0.934 / 0.601
  shot  7 f405-428: 0.567 / 0.225 / 0.097 / 0.965 / 0.486
  shot  8 f429-512: 0.582 / 0.225 / 0.074 / 0.977 / 0.645
  shot  9 f513-569: 0.481 / 0.266 / 0.024 / 0.996 / 0.559
  shot 10 f570-615: 0.501 / 0.245 / 0.026 / 0.969 / 0.579
  shot 11 f616-679: 0.562 / 0.240 / 0.036 / 0.993 / 0.600
  shot 12 f680-749: 0.454 / 0.273 / 0.024 / 0.888 / 0.612
  shot 13 f750-832: 0.442 / 0.264 / 0.024 / 0.902 / 0.578
  shot 14 f833-934: 0.310 / 0.146 / 0.057 / 0.784 / 0.655
  shot 15 f935-1086: 0.411 / 0.193 / 0.107 / 0.918 / 0.553
  shot 16 f1087-1175: 0.525 / 0.260 / 0.122 / 0.934 / 0.600
  shot 17 f1176-1359: 0.599 / 0.179 / 0.054 / 0.937 / 0.601
  shot 18 f1360-1559: 0.324 / 0.185 / 0.061 / 0.855 / 0.636
  shot 19 f1560-1647: 0.368 / 0.259 / 0.023 / 1.000 / 0.655

## Review notes (checked by eye)
Every flagged POP is planned:
- **The hook:** Dave's $100 bill slaps the lens, with a camera kick (31-32). Gary's bills fan out on "Gary did" (197).
- **Caption chunk pop-ins:** 539, 1323-1326, 1385.
- **The match:** guest 9's burst, the counter's "MATCHES 1" and the kick (662-665). The confetti cannons fire on "won" (703).
- **The math:** every guest's lines fan out at the start of the web build (990), and the link joins the two World Cup players (1297). On "Same", "253 PAIRS =" slides in beside "253 PEOPLE", with a kick (1479-1482).
- **Hard cuts inside a shot:** from the World Cup wide to two players (1234), and from the party to Dave's wink for the call to action (1596).

The freeze on "September ninth!" (598-616) is a white flash at 598, followed by a desaturated still with a slow push. Because the push keeps the frame moving, the frozen-span check doesn't count it.

The share encode `birthday_paradox_short.mp4` (x264 crf 21, `-tune animation`, max 7 Mb/s, AAC 192k, 41 MB) measures mean SSIM 0.988 against the crf 16 master. Its lowest frame, 0.931, is the 253-person crowd under the twist card (f1544). Loudness is unchanged at -14.2 LUFS / -1.1 dBFS.
