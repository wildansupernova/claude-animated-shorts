# usage: python scripts/sheet.py out.jpg prefix f1,f2,... [cols]  -> contact sheet of stills with frame labels
import sys
from PIL import Image, ImageDraw
out, prefix, frames = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(",")]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 5
ims = [Image.open(f"{prefix}{f}.jpg") for f in frames]
w, h = ims[0].size; w2, h2 = w * 2 // 3, h * 2 // 3
rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (w2 * cols, h2 * rows), "black"); d = ImageDraw.Draw(S)
for i, (f, im) in enumerate(zip(frames, ims)):
    x, y = (i % cols) * w2, (i // cols) * h2
    S.paste(im.resize((w2, h2)), (x, y)); d.rectangle([x, y, x + 44, y + 14], fill="black"); d.text((x + 3, y + 2), str(f), fill="yellow")
S.save(out, quality=85)
