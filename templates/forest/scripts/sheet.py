# contact sheet: python sheet.py out.jpg img1 img2 ... (4 per row, 300 px wide each, frame number labels)
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W, H, C = 300, 533, 4
rows = (len(files) + C - 1) // C
sheet = Image.new("RGB", (W * C, H * rows), "black")
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((W, H))
    x, y = (i % C) * W, (i // C) * H
    sheet.paste(im, (x, y))
    d.rectangle([x, y, x + 60, y + 18], fill="black"); d.text((x + 4, y + 3), f.split("_")[-1].split(".")[0], fill="white")
sheet.save(out, quality=85)
