# Burned-in English captions for the Henrietta Lacks short (from the Haber short's caption script): viral style, 1-3 words at a time, hard swaps on the word onsets
# (voice/words.json, aligned 1:1 with the script text), Inter Display Black, white with a black outline, key words in
# yellow, lower-middle (clear of the platform buttons). Also writes an .srt (phrase cues) for platform upload.
# usage: python3 scripts/captions.py  -> out/captions.ass, out/captions.srt
import json, re, os, subprocess
from PIL import ImageFont
FONT = ImageFont.truetype(subprocess.run(["fc-match", "-f", "%{file}", "Inter Display:style=Black"], capture_output=True, text=True).stdout, 120)

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
words = json.load(open(os.path.join(HERE, "voice/words.json")))
text = open(os.path.join(HERE, "SCRIPT.md")).read().split("## Script", 1)[1]
toks = [t for l in text.strip().splitlines() if l.strip() for t in l.split()]
assert len(toks) == len(words)
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
END = 1806 / 30

# display units: numbers spoken as words shown as figures (one unit spans several spoken words)
PHRASES = [(["thirtyyearold"], "30-YEAR-OLD"), (["thirtyone"], "31"), (["a", "hundred", "thousand"], "100,000"), (["twenty"], "20"), (["hela"], "HeLa")]
units, i = [], 0  # each: (display text, start s, end s, ends sentence/clause)
while i < len(toks):
    for seq, disp in PHRASES:
        if [norm(t) for t in toks[i:i + len(seq)]] == seq:
            last = toks[i + len(seq) - 1]
            units.append([disp, words[i]["s"], words[i + len(seq) - 1]["e"], last[-1] in ",.?!", True]); i += len(seq); break
    else:
        t = toks[i]
        disp = re.sub(r"[,.]$", "", t).upper()
        units.append([disp, words[i]["s"], words[i]["e"], t[-1] in ",.?!", False]); i += 1

KEY = {"1951", "ALIVE", "SPACE", "HENRIETTA", "LACKS", "TOBACCO", "JOHNS", "HOPKINS", "CANCER", "ASKING", "GEY'S", "DYING", "NEVER", "STOP",
       "COUNTDOWN", "VIRUS", "HeLa", "POLIO", "VACCINE", "ORBIT", "100,000", "MILLIONS", "20", "CENT", "2023", "SETTLE", "DIVIDING", "NAME"}
QUIET = [(29.3, 31.4), (44.2, 46.1)]  # her death; "nobody ever asked her": no pop, no colour
quiet = lambda t: any(a <= t < b for a, b in QUIET)

# chunks: up to 3 units / ~15 characters, never across a clause break; a figure unit stands alone with at most one more word
# hand-set phrase breaks (a caption editor's reading rhythm); figures like "200 TIMES" are single units
BREAKS = """
THIS WOMAN | DIED IN 1951 | BUT HER CELLS | ARE STILL ALIVE | TODAY | AND THEY'VE EVEN | BEEN TO SPACE
IT'S 1951 | HENRIETTA LACKS | IS A 30-YEAR-OLD | MOTHER OF FIVE | WHO GREW UP | FARMING TOBACCO | IN VIRGINIA
SHE GOES TO | JOHNS HOPKINS | ONE OF THE FEW | HOSPITALS THAT | WILL TREAT | BLACK PATIENTS
DOCTORS FIND | CERVICAL CANCER | AND DURING | TREATMENT | THEY TAKE A PIECE | OF HER TUMOR | WITHOUT | ASKING HER
IT LANDS IN | GEORGE GEY'S LAB | WHERE HUMAN CELLS | KEEP DYING | WITHIN DAYS
HERS DON'T | THEY DOUBLE | ABOUT ONCE A DAY | AND NEVER STOP
YOU SEE | NORMAL CELLS | HAVE A BUILT-IN | COUNTDOWN | BUT A VIRUS | IN HER TUMOR | HAD SWITCHED | HERS OFF
HENRIETTA DIES | THAT OCTOBER | AT 31 | HER CELLS | KEEP GOING
SCIENTISTS | NAME THEM HeLa | MAIL THEM | AROUND THE WORLD | AND USE THEM | TO TEST THE | POLIO VACCINE | FIGHT CANCER | MAP OUR GENES | AND EVEN SEND | HUMAN CELLS | INTO ORBIT
THEY SHOW UP | IN MORE THAN | 100,000 STUDIES
LUCKILY | HER CELLS HELPED | PROTECT MILLIONS | UNLUCKILY | NOBODY EVER | ASKED HER
HER FAMILY | ONLY LEARNS | HER CELLS | ARE ALIVE | MORE THAN | 20 YEARS LATER | AND FOR DECADES | THEY DON'T | SEE A CENT
IN 2023 | THEY FINALLY | SETTLE WITH | A COMPANY | THAT SOLD | HER CELLS
SO RIGHT NOW | SOMEWHERE | IN A LAB | A PIECE OF | HENRIETTA | IS STILL DIVIDING | AND THIS TIME | THE WORLD | KNOWS HER NAME
"""
chunks, ui = [], 0
for phrase in [x.strip() for x in BREAKS.replace("\n", "|").split("|") if x.strip()]:
    cur = []
    while " ".join(u[0] for u in cur) != phrase:
        assert ui < len(units) and len(" ".join(u[0] for u in cur)) < len(phrase), (phrase, " ".join(u[0] for u in cur))
        cur.append(units[ui]); ui += 1
    chunks.append(cur)
assert ui == len(units), "breaks do not cover the script"

LEAD = 2 / 30  # captions land a hair before the word, like the picture reactions
def ts(t):
    t = max(0.0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

ev = []
for k, c in enumerate(chunks):
    a = c[0][1] - LEAD
    nxt = chunks[k + 1][0][1] - LEAD if k + 1 < len(chunks) else END
    b = min(nxt, c[-1][2] + 0.35) if c[-1][3] else nxt  # after a sentence end, clear the screen in the pause
    b = max(b, a + 0.2)
    q = quiet(a)
    parts = []
    for u in c:
        col = "&H004AD8FF&" if (u[0].strip("?!'") in KEY or u[0].rstrip("'S") in KEY) and not q else "&H00FFFFFF&"
        parts.append(f"{{\\c{col}}}{u[0]}")
    w = FONT.getlength(" ".join(u[0] for u in c)) * 1.01 + 20  # spacing 1 + outline
    k = min(100, int(100 * 960 / w))
    anim = f"{{\\fscx{k}\\fscy{k}}}" if q else f"{{\\fscx{int(k * .78)}\\fscy{int(k * .78)}\\t(0,90,\\fscx{int(k * 1.04)}\\fscy{int(k * 1.04)})\\t(90,140,\\fscx{k}\\fscy{k})}}"
    ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{anim}" + " ".join(parts))

ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Display Black,120,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,1,0,1,10,5,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(f"{e.split(',Cap,,0,0,0,,')[0]},Cap,,0,0,0,,{{\\pos(540,1300)}}{e.split(',Cap,,0,0,0,,')[1]}" for e in ev) + "\n"
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
open(os.path.join(HERE, "out/captions.ass"), "w").write(ass)

# SRT: phrase cues (<= 7 words, split at clause breaks), plain text with punctuation
def srt_ts(t):
    t = max(0.0, t); ms = int(round(t * 1000)); return f"{ms // 3600000:02d}:{ms % 3600000 // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}"
cues, cur = [], []
for k, t in enumerate(toks):
    cur.append(k)
    if t[-1] in ",.?!" or len(cur) >= 7:
        cues.append(cur); cur = []
if cur: cues.append(cur)
out = []
for n, c in enumerate(cues):
    a = words[c[0]]["s"]; b = min(words[c[-1]]["e"] + 0.3, words[cues[n + 1][0]]["s"] if n + 1 < len(cues) else END)
    out.append(f"{n + 1}\n{srt_ts(a)} --> {srt_ts(b)}\n{' '.join(toks[k] for k in c)}\n")
open(os.path.join(HERE, "out/captions.srt"), "w").write("\n".join(out))
print(len(chunks), "caption chunks,", len(cues), "srt cues")
for c in chunks[:14]: print(" | ", " ".join(u[0] for u in c))
