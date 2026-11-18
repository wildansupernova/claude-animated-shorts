# Contact sheet: python scripts/sheet.py <dir> <out.jpg> [cols] [labels...]
import sys, glob, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
fs = sorted(glob.glob(os.path.join(d, "*.jpeg")) + glob.glob(os.path.join(d, "*.jpg")))
ims = [Image.open(f) for f in fs]; w, h = 270, 480
rows = (len(ims) + cols - 1) // cols; S = Image.new("RGB", (cols * w, rows * (h + 18)), "white"); D = ImageDraw.Draw(S)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 18); S.paste(im.resize((w, h)), (x, y)); D.text((x + 4, y + h + 2), os.path.basename(f)[:30], fill="black")
S.save(out, quality=82)
