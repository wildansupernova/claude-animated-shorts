# Tile contact frames into sheets: python3 tools/montage.py <dir> <out_prefix> [cols] [per_sheet] [labels.json]
import sys, os, json, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
per = int(sys.argv[4]) if len(sys.argv) > 4 else 12
labels = json.load(open(sys.argv[5])) if len(sys.argv) > 5 else None
fs = sorted(glob.glob(os.path.join(d, "*.jp*g")))
for s in range(0, len(fs), per):
    chunk = fs[s:s + per]
    ims = [Image.open(f) for f in chunk]
    w, h = 270, 480
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * (h + 22)), "#111")
    dr = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * (h + 22)
        sheet.paste(im.resize((w, h)), (x, y))
        idx = s + i
        lab = f"{idx}" + (f"  {labels[idx]}" if labels and idx < len(labels) else "")
        dr.text((x + 4, y + h + 4), lab, fill="#fff")
    p = f"{out}{s // per}.jpg"; sheet.save(p, quality=85); print(p)
