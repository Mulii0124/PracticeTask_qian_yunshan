"""裁掉透明边、压缩体积，并生成总览拼图。"""
from PIL import Image, ImageDraw
import os

BASE = r"D:\minimax_work\ai-outfit-assistant\assets\img"
CH   = os.path.join(BASE, "characters")
SC   = os.path.join(BASE, "scenes")
OUT  = r"D:\minimax_work\ai-outfit-assistant\gen"

MAX_H = 1200

def trim_char(path):
    im = Image.open(path).convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        pad = 6
        x0 = max(0, bbox[0] - pad); y0 = max(0, bbox[1] - pad)
        x1 = min(im.size[0], bbox[2] + pad); y1 = min(im.size[1], bbox[3] + pad)
        im = im.crop((x0, y0, x1, y1))
    if im.size[1] > MAX_H:
        s = MAX_H / im.size[1]
        im = im.resize((max(1, int(im.size[0] * s)), MAX_H), Image.LANCZOS)
    # 透明区域做轻度羽化，避免硬边
    im.save(path, optimize=True)
    print(f"  {os.path.basename(path)}: {im.size[0]}x{im.size[1]}  {os.path.getsize(path)//1024} KB")

for f in sorted(os.listdir(CH)):
    if f.endswith(".png"):
        trim_char(os.path.join(CH, f))

# ---------- 总览拼图 ----------
tiles = []
for f in ["scene-sunny.jpg", "scene-cloudy.jpg", "scene-rain.jpg", "scene-snow.jpg"]:
    im = Image.open(os.path.join(SC, f)).convert("RGB")
    im = im.resize((640, int(im.size[1] * 640 / im.size[0])), Image.LANCZOS)
    tiles.append((f, im))
for f in ["char-summer.png", "char-mild.png", "char-autumn.png", "char-winter.png", "char-rain.png"]:
    im = Image.open(os.path.join(CH, f)).convert("RGBA")
    bg = Image.new("RGBA", im.size, (24, 30, 38, 255))
    bg.alpha_composite(im)
    bg = bg.convert("RGB")
    bg = bg.resize((int(bg.size[0] * 300 / bg.size[1]), 300), Image.LANCZOS)
    tiles.append((f, bg))

pad, lab = 12, 26
cols = 4
rows = (len(tiles) + cols - 1) // cols
tw = 640
rowh = []
for r in range(rows):
    rowh.append(max(tiles[c][1].size[1] for c in range(r * cols, min((r + 1) * cols, len(tiles)))))
W = cols * (tw + pad) + pad
H = sum(h + lab + pad for h in rowh)
sheet = Image.new("RGB", (W, H), (18, 20, 24))
d = ImageDraw.Draw(sheet)
y = pad
for r in range(rows):
    x = pad
    for c in range(r * cols, min((r + 1) * cols, len(tiles))):
        name, img = tiles[c]
        d.text((x + 4, y + 6), name, fill=(255, 210, 90))
        sheet.paste(img, (x, y + lab))
        x += tw + pad
    y += rowh[r] + lab + pad
p = os.path.join(OUT, "sheet-all.png")
sheet.save(p)
print(p, sheet.size)
