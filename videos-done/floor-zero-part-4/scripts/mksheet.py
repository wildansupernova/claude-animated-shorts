# usage: python3 mksheet.py out.jpg cols label1=path1 ...  (labels drawn top-left)
import sys
from PIL import Image, ImageDraw, ImageFont
out, cols, items = sys.argv[1], int(sys.argv[2]), [a.split("=", 1) for a in sys.argv[3:]]
ims = [(l, Image.open(p).convert("RGB")) for l, p in items]
w, h = ims[0][1].size
rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (w * cols, h * rows), "black")
d = ImageDraw.Draw(S)
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
except Exception: font = None
for i, (l, im) in enumerate(ims):
    x, y = (i % cols) * w, (i // cols) * h
    S.paste(im, (x, y)); d.rectangle([x, y, x + 120, y + 38], fill="black"); d.text((x + 6, y + 4), l, fill="yellow", font=font)
S.save(out, quality=85)
