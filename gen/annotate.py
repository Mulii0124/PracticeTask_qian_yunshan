"""裁出页面右上角并标注 AI 设置按钮的位置。"""
from PIL import Image, ImageDraw, ImageFont
import os

SRC = r"C:\Users\Mulii\.minimax\v2\assets\2026\11\10\21-11-39-075-asset_20261110-211139-075_098c2c2defee_f68ad673-browser-screenshot.png"
OUT = r"D:\minimax_work\ai-outfit-assistant\gen\where-is-ai-settings.png"
FP = r"C:\Windows\Fonts\msyh.ttc"
FONT = ImageFont.truetype(FP, 30) if os.path.exists(FP) else ImageFont.load_default()
FONT_S = ImageFont.truetype(FP, 22) if os.path.exists(FP) else ImageFont.load_default()

im = Image.open(SRC).convert("RGB")
CROP = (560, 95, 959, 205)          # x0, y0, x1, y1
crop = im.crop(CROP)
SCALE = 3
crop = crop.resize((crop.size[0] * SCALE, crop.size[1] * SCALE), Image.LANCZOS)

d = ImageDraw.Draw(crop)
# 「AI 设置」按钮在裁剪图中的位置
bx0, by0, bx1, by1 = 197 * SCALE, 33 * SCALE, 345 * SCALE, 82 * SCALE
d.rounded_rectangle([bx0 - 10, by0 - 8, bx1 + 10, by1 + 8], radius=14,
                    outline=(226, 189, 118), width=5)

# 箭头 + 标注
ax = (bx0 + bx1) // 2
d.line([(ax, by1 + 26), (ax, by1 + 62)], fill=(226, 189, 118), width=4)
d.polygon([(ax - 11, by1 + 24), (ax + 11, by1 + 24), (ax, by1 + 10)], fill=(226, 189, 118))
d.text((ax + 16, by1 + 30), "点这个 → 打开 AI 配置", font=FONT, fill=(245, 215, 154))

canvas = Image.new("RGB", (crop.size[0], crop.size[1] + 74), (11, 16, 22))
canvas.paste(crop, (0, 0))
d2 = ImageDraw.Draw(canvas)
d2.text((18, crop.size[1] + 18), "页面右上角：搜索框 → 定位 → AI 设置（金色齿轮）", font=FONT_S, fill=(150, 190, 168))
canvas.save(OUT)
print(OUT, canvas.size)
