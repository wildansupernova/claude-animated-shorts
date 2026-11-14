# writes out/haber/shots.json for short_qa.py from story.ts (shots, crossfades, flash, cuts and kicks)
import json, re
src = open("src/videos/haber/story.ts").read()
total = int(re.search(r"TOTAL = (\d+)", src).group(1))
shots = [{"id": int(i), "a": int(a), "b": int(b) if b != "TOTAL" else total} for i, a, b in re.findall(r"\{ id: (\d+), a: (\d+), b: (\w+),", src)]
xf = {int(k): int(v) for k, v in re.findall(r"(\d+): (\d+)", re.search(r"XFADE[^=]*= \{([^}]*)\}", src).group(1))}
flash = int(re.search(r"FLASH_AT = (\d+)", src).group(1))
xfade = [[s["a"] - xf[s["id"]] // 2, s["a"] + xf[s["id"]] // 2] for s in shots if s["id"] in xf]
cuts = [[int(f), int(f)] for f in re.findall(r"\{ f: (\d+), cut: true", src)]
ev = {k: float(v) / 30 for k, v in re.findall(r"(\w+): T\((\d+)\)", re.search(r"export const EV = \{(.*?)\};", src, re.S).group(1))}
kicks = []
for name, _ in re.findall(r"\[EV\.(\w+), ([\d.]+)\]", re.search(r"const KICKS[^=]*= \[(.*?)\];", src, re.S).group(1)):
    f0 = round(ev[name] * 30); kicks.append([f0, f0 + 8])
import os; os.makedirs("out/haber", exist_ok=True)
json.dump({"shots": shots, "xfade": xfade, "flash": [flash, flash + 4], "planned": cuts + kicks}, open("out/haber/shots.json", "w"), indent=1)
print(len(shots), "shots", len(xfade), "xfades", len(cuts), "cuts", kicks)
