"""Temporary art for Leandro's second-branch abilities until Codex's real icons / objects arrive (they overwrite these files by name).
art/raw/icons/leandro_*b.png (magenta bg) and art/raw/objects/{comb,hair_dryer,virtual_cage}.png (512x512, magenta bg)."""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAG = (255, 0, 255)

def font(sz):
    for f in ('C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf'):
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()

def icon(path, bg, glyph, label):
    im = Image.new('RGB', (128, 128), MAG); d = ImageDraw.Draw(im)
    d.rounded_rectangle([8, 8, 120, 120], 14, fill=bg, outline=(0, 0, 0), width=4)
    f = font(46); bb = d.textbbox((0, 0), glyph, font=f); d.text((64 - (bb[2] - bb[0]) / 2 - bb[0], 52 - (bb[3] - bb[1]) / 2 - bb[1]), glyph, font=f, fill=(255, 255, 255))
    f2 = font(15); bb = d.textbbox((0, 0), label, font=f2); d.text((64 - (bb[2] - bb[0]) / 2 - bb[0], 100 - bb[1] - (bb[3] - bb[1]) / 2), label, font=f2, fill=(255, 255, 255))
    im.save(path)

def comb(path):
    im = Image.new('RGB', (512, 512), MAG); d = ImageDraw.Draw(im)
    d.rounded_rectangle([90, 190, 420, 250], 18, fill=(240, 120, 60), outline=(0, 0, 0), width=8)
    for i in range(11):
        x = 105 + i * 29; d.rounded_rectangle([x, 245, x + 17, 380], 6, fill=(250, 150, 80), outline=(0, 0, 0), width=6)
    im.save(path)

def dryer(path):
    im = Image.new('RGB', (512, 512), MAG); d = ImageDraw.Draw(im)
    d.rounded_rectangle([110, 160, 360, 270], 40, fill=(235, 70, 130), outline=(0, 0, 0), width=8)
    d.polygon([(360, 175), (440, 200), (440, 230), (360, 255)], fill=(60, 60, 70), outline=(0, 0, 0))
    d.rounded_rectangle([200, 260, 260, 400], 12, fill=(60, 60, 70), outline=(0, 0, 0), width=8)
    im.save(path)

def cage(path):
    im = Image.new('RGB', (512, 512), MAG); d = ImageDraw.Draw(im)
    d.ellipse([60, 60, 452, 452], outline=(0, 0, 0), width=14); d.ellipse([75, 75, 437, 437], outline=(60, 230, 220), width=10)
    for i in range(7):
        x = 110 + i * 48; d.line([(x, 120), (x, 392)], fill=(60, 230, 220), width=8)
    im.save(path)

for k, bg, g, lab in (('leandro_p1b', (60, 150, 130), 'Q', 'PEINE'), ('leandro_p2b', (200, 70, 120), 'F', 'SECADORA'), ('leandro_p3b', (70, 110, 190), 'E', 'LANZAR'), ('leandro_ultb', (40, 170, 190), 'R', 'FILTRA')):
    p = ROOT / f'art/raw/icons/{k}.png'
    if not p.exists(): icon(p, bg, g, lab)
for n, fn in (('comb', comb), ('hair_dryer', dryer), ('virtual_cage', cage)):
    p = ROOT / f'art/raw/objects/{n}.png'
    if not p.exists(): fn(p)
print('placeholders ok')
