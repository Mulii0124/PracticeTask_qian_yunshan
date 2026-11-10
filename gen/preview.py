"""生成素材预览图：场景带 + 人物带（带中文标注与穿搭对应关系）。"""
from PIL import Image, ImageDraw, ImageFont
import os

BASE = r"D:\minimax_work\ai-outfit-assistant\assets\img"
OUT  = r"D:\minimax_work\ai-outfit-assistant\gen"

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    r"C:\Windows\Fonts\simsun.ttc",
    r"C:\Windows\Fonts\Deng.ttf",
]
FP = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
print("font:", FP)

def F(size):
    if FP:
        try: return ImageFont.truetype(FP, size)
        except Exception: pass
    return ImageFont.load_default()

f_title = F(46)
f_scene = F(26)
f_char  = F(26)
f_sub   = F(19)

W = 1680
PAD = 34

scenes = [
    ("scene-sunny.jpg",  "场景 · 晴",   "晨光 / 暖金"),
    ("scene-cloudy.jpg", "场景 · 多云", "云海 / 冷灰"),
    ("scene-rain.jpg",   "场景 · 雨",   "湿石 / 青碧"),
    ("scene-snow.jpg",   "场景 · 雪",   "雪岭 / 冷白"),
]
chars = [
    ("char-summer.png", "夏衫", "体感 ≥ 24°C", "单层透气"),
    ("char-mild.png",   "春秋", "体感 16–24°C", "叠穿两层"),
    ("char-autumn.png", "深秋", "体感 8–16°C",  "夹棉加护腕"),
    ("char-winter.png", "冬裘", "体感 < 8°C",    "厚袍加披风"),
    ("char-rain.png",   "雨行", "雨天且 ≥ 14°C", "蓑衣斗笠"),
]

# ---- 计算行高 ----
SC_W = (W - PAD * 2 - 24 * (len(scenes) - 1)) // len(scenes)
SC_H = round(SC_W * 9 / 16)
CH_W = 236
CH_H = 620

top = 118
row1_h = 54 + SC_H + 26
row2_top = top + row1_h + 74
total_h = row2_top + 40 + CH_H + 62

sheet = Image.new("RGB", (W, total_h), (13, 18, 24))
d = ImageDraw.Draw(sheet)

# 标题
d.text((PAD, 22), "云山行 · AI 素材总览", font=f_title, fill=(236, 229, 214))
d.text((PAD + 560, 44), "全部图像由 AI 生成（MiniMax）", font=f_sub, fill=(120, 190, 165))
d.line([(PAD, 100), (W - PAD, 100)], fill=(226, 189, 118), width=1)

# ---- 场景行 ----
x = PAD
for fname, label, sub in scenes:
    im = Image.open(os.path.join(BASE, "scenes", fname)).convert("RGB")
    im = im.resize((SC_W, SC_H), Image.LANCZOS)
    sheet.paste(im, (x, top))
    d.rectangle([x, top, x + SC_W - 1, top + SC_H - 1], outline=(255, 255, 255), width=1)
    d.text((x + 4, top + SC_H + 6), label, font=f_scene, fill=(226, 189, 118))
    d.text((x + 4, top + SC_H + 34), sub, font=f_sub, fill=(150, 158, 165))
    x += SC_W + 24

d.text((PAD, row2_top - 46), "人物立绘（透明背景，随体感温度自动切换）", font=f_scene, fill=(236, 229, 214))

# ---- 人物行 ----
x = PAD
CH_GAP = (W - PAD * 2 - CH_W * len(chars)) // (len(chars) - 1)
for fname, tier, temp, note in chars:
    # 中性渐变底板，保证白衣与深色衣都能看清
    panel = Image.new("RGB", (CH_W, CH_H))
    pd = ImageDraw.Draw(panel)
    for yy in range(CH_H):
        t = yy / CH_H
        r = int(96 + (150 - 96) * t)
        g = int(112 + (160 - 112) * t)
        b = int(126 + (150 - 126) * t)
        pd.line([(0, yy), (CH_W, yy)], fill=(r, g, b))
    ch = Image.open(os.path.join(BASE, "characters", fname)).convert("RGBA")
    scale = (CH_H - 60) / ch.size[1]
    ch = ch.resize((max(1, int(ch.size[0] * scale)), CH_H - 60), Image.LANCZOS)
    # 接地阴影
    sh = Image.new("RGBA", ch.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([ch.size[0] * 0.15, ch.size[1] * 0.93, ch.size[0] * 0.85, ch.size[1] * 1.0],
               fill=(20, 26, 34, 90))
    sh = sh.filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).GaussianBlur(9))
    px = (CH_W - ch.size[0]) // 2
    panel.paste(sh, (px, 24), sh)
    panel.paste(ch, (px, 24), ch)
    sheet.paste(panel, (x, row2_top + 40))
    d.rectangle([x, row2_top + 40, x + CH_W - 1, row2_top + 40 + CH_H - 1],
                outline=(255, 255, 255), width=1)
    d.text((x + 4, row2_top + 44), tier, font=f_char, fill=(226, 189, 118))
    d.text((x + 4, row2_top + 40 + CH_H + 6), temp, font=f_sub, fill=(150, 190, 168))
    d.text((x + 4, row2_top + 40 + CH_H + 28), note, font=f_sub, fill=(140, 148, 155))
    x += CH_W + CH_GAP

p = os.path.join(OUT, "preview-assets.png")
sheet.save(p)
print(p, sheet.size)
