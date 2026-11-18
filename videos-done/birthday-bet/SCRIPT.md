# "The Birthday Bet" — original script v3, "Would you take this bet?" (2026-11-16)
Format: 54.5 s vertical cartoon-3D short. Three character voices + a narrator, burned-in captions with name tags on dialogue,
on-screen stakes / counter graphics so the story reads with the sound off.

## Facts (with sources)
- 23 people -> P(at least one shared birthday) = 50.73 %; 50 -> 97.0 %; 70 -> 99.9 % (365 equally likely days).
  23 people make 23*22/2 = 253 pairs, each matching with chance 1/365; 1-(364/365)^253 = 50.05 % (pairs-as-independent shortcut).
  https://en.wikipedia.org/wiki/Birthday_problem
- For a coin-flip chance that someone shares ONE GIVEN birthday you need 253 OTHER people (50.05 %; 252 -> 49.91 %). (same)
- One person checking their own birthday against 22 others = 22 comparisons (vs 253 for every pair). (arithmetic)
- 2014 FIFA World Cup: every squad had 23 players; 16 of the 32 squads had at least one pair sharing a birthday.
  https://www.bbc.com/news/magazine-27835311 ; https://en.wikipedia.org/wiki/Birthday_problem
- Hook research: YouTube Shorts "viewed vs swiped away" metric (https://support.google.com/youtube/answer/12220281);
  69 % of US consumers watch with sound off in public (Verizon Media / Publicis 2019,
  https://www.3playmedia.com/blog/verizon-media-and-publicis-media-find-viewers-want-captions/) -> full captions.

## What changed from v1 (and why)
v1 opened on the answer ("Put just 23 people in a room, and it's a coin flip...") and was narrated about the characters.
v3 is built for retention:
- **Opens on a dare, withholds the answer.** Dave dares the camera, and "You'd take that bet, right?" puts the viewer on
  Gary's side. The 50 % answer moves from second 1 to second 37.
- **Stakes both ways, on screen.** "$2,200 AT RISK", then a live "CHECKED n/23 · MATCHES 0" counter during the roll call.
- **A countdown and a payoff gag.** 10 checked, 15, still nothing, Gary counting his money. Guest 17 says "September
  ninth!", a record scratch freezes the frame, and guest 9 (who said it eight people earlier) slowly raises a hand.
  Guest 9's "SEP 9" bubble is visible in the roll call, a plant for rewatches.
- **The mistake is aimed at the viewer.** "Your brain probably did too" lands at ~25 s, where retention usually dips.
- **It ends on an open question and turns the comments into the experiment.** The "253 = 253" twist, then "comment your
  birthday": the audience is bigger than 253, so viewers find their birthday twins in the comments.
- Cut: the September 9 tangent (it suggested the match happened *because* Sep 9 is common), the 50 / 70 people lines.

## Script (exactly as voiced; voice/gen_voice.py LINES)
| # | Who (Kokoro voice) | Line |
|---|---|---|
| 0 | Dave (am_fenrir) | Twenty-three people. I bet two of them share a birthday. |
| 1 | Narrator (am_michael) | You'd take that bet, right? Three sixty-five days in a year. |
| 2 | Narrator | Gary did. So did the whole party. A hundred bucks each. |
| 3 | Narrator | If Dave's wrong, he owes twenty-two hundred. |
| 4 | Gary (am_onyx) | Anyone born on March third? *(crickets)* |
| 5 | Narrator | Ten people. No match. Fifteen. Nothing. |
| 6 | Narrator | Gary's already counting his money. |
| 7 | Guest 17 (af_bella) | September ninth! *(record scratch, freeze-frame)* |
| 8 | Narrator | And guest nine slowly raises a hand. |
| 9 | Narrator | Dave just won twenty-two hundred bucks. |
| 10 | Narrator | Here's what Gary missed. Your brain probably did too. |
| 11 | Narrator | He only checked his own birthday. That's twenty-two chances. |
| 12 | Narrator | Dave bet on any two people. Everyone versus everyone: two hundred fifty-three pairs. |
| 13 | Narrator | Two hundred fifty-three chances. That's a coin flip. |
| 14 | Narrator | At the twenty fourteen World Cup, squads had twenty-three players. Half the squads had a birthday match. |
| 15 | Narrator | The twist: to match your birthday, you'd need two hundred fifty-three people. Same number. |
| 16 | Narrator | Good thing way more than that are watching. Comment your birthday. Find your twin. |

Arithmetic in the story: Dave bets each of the 22 other guests $100, so he risks (and wins) 22 x $100 = $2,200.
The two 253s are not a coincidence: an even chance takes about 253 one-in-365 chances either way (1 - (364/365)^253 = 50 %).

Suggested post caption: "Would you take this bet? 🎂"
