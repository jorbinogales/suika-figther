"""Builds the floor of Leandro's virtual arena (ult "Filtraciones") from the CC0 pixel-art tileset "Warped Top-Down Tech Lab" by Luis Zuno (@ansimuz):
https://opengameart.org/content/warped-top-down-tech-lab  (license: use / modify / redistribute freely). Source copy: art/lab_tileset_preview.png (Tileset.png).
Output: public/assets/virtual_floor.png (1024x1024, circular, transparent outside)."""
import pathlib, random, math
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
ts = Image.open(ROOT / 'art/lab_tileset_preview.png').convert('RGBA')
tile = lambda i, j: ts.crop((16 + 32 * i, 64 + 32 * j, 48 + 32 * i, 96 + 32 * j))

def clean(t, cols):   # the tileset's panels carry a hazard stripe on one edge: paint it over with the panel's own colour so the floor is plain metal
    t = t.copy(); px = t.load(); src = {}
    for y in range(32):
        for x in range(32):
            r, g, b, a = px[x, y]
            if a and ((r > 110 and g > 80 and b < 90) or (r < 60 and g < 50 and b < 40 and x in cols)):
                px[x, y] = (0, 0, 0, 0)
    return t

def inpaint(t):   # fill transparent holes from the nearest opaque pixel in the same row
    px = t.load()
    for y in range(32):
        row = [px[x, y] for x in range(32)]
        for x in range(32):
            if row[x][3] == 0:
                for d in range(1, 32):
                    for xx in (x - d, x + d):
                        if 0 <= xx < 32 and row[xx][3]: px[x, y] = row[xx]; break
                    else: continue
                    break
    return t

random.seed(7)
plain = [inpaint(clean(tile(0, 0), set(range(22, 32)))), inpaint(clean(tile(3, 0), set(range(0, 10)))), inpaint(clean(tile(0, 2), set(range(0, 32)))), inpaint(clean(tile(3, 2), set(range(0, 32))))]
plate = ts.crop((48, 80, 80, 112)); vent = ts.crop((48, 112, 112, 128))
S, T = 1024, 64
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
for j in range(S // T):
    for i in range(S // T):
        t = random.choice(plain).resize((T, T), Image.NEAREST)
        if random.random() < 0.5: t = t.transpose(Image.FLIP_LEFT_RIGHT)
        img.paste(t, (i * T, j * T))
# a few service plates and vents scattered on the floor
for _ in range(10):
    i, j = random.randrange(2, S // T - 2), random.randrange(2, S // T - 2)
    if abs(i - 8) + abs(j - 8) < 3: continue
    p = plate.resize((T, T), Image.NEAREST); img.paste(p, (i * T, j * T), p)
for _ in range(5):
    i, j = random.randrange(2, S // T - 3), random.randrange(2, S // T - 2)
    if abs(i - 7) + abs(j - 8) < 3: continue
    v = vent.resize((128, 32), Image.NEAREST); img.paste(v, (i * T, j * T + 16), v)
# centre emblem: a big plate with a glowing cyan ring
c = S // 2
big = plate.resize((256, 256), Image.NEAREST); img.paste(big, (c - 128, c - 128), big)
d = ImageDraw.Draw(img)
for r, col in ((150, (30, 200, 190, 255)), (146, (10, 90, 100, 255)), (92, (30, 200, 190, 255)), (88, (10, 90, 100, 255))):
    d.ellipse([c - r, c - r, c + r, c + r], outline=col, width=4)
for a in range(0, 360, 45):   # cyan studs around the emblem
    x, y = c + math.cos(math.radians(a)) * 120, c + math.sin(math.radians(a)) * 120; d.rectangle([x - 6, y - 6, x + 6, y + 6], fill=(90, 255, 240, 255), outline=(10, 70, 80, 255))
# hazard ring (yellow / black diagonal stripes, tileset palette) + steel rim
ring = Image.new('RGBA', (S, S), (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
rd.ellipse([0, 0, S - 1, S - 1], fill=(120, 126, 168, 255)); rd.ellipse([10, 10, S - 11, S - 11], fill=(58, 62, 96, 255)); rd.ellipse([20, 20, S - 21, S - 21], fill=(0, 0, 0, 0))
stripes = Image.new('RGBA', (S, S), (30, 24, 12, 255)); sd = ImageDraw.Draw(stripes)
for k in range(-S, S * 2, 48): sd.polygon([(k, 0), (k + 24, 0), (k + 24 - S, S), (k - S, S)], fill=(196, 144, 22, 255))
band = Image.new('L', (S, S), 0); bd = ImageDraw.Draw(band); bd.ellipse([20, 20, S - 21, S - 21], fill=255); bd.ellipse([66, 66, S - 67, S - 67], fill=0)
img.paste(stripes, (0, 0), band)
img.alpha_composite(ring)
inner = Image.new('L', (S, S), 0); ImageDraw.Draw(inner).ellipse([0, 0, S - 1, S - 1], fill=255)
img.putalpha(Image.composite(img.getchannel('A'), Image.new('L', (S, S), 0), inner))
out = ROOT / 'public/assets/virtual_floor.png'; img.save(out); print('saved', out)
(ROOT / 'public/assets/virtual_floor_CREDITS.txt').write_text('Floor tiles: "Warped Top-Down Tech Lab" by Luis Zuno (@ansimuz), CC0 - https://opengameart.org/content/warped-top-down-tech-lab\n', encoding='utf-8')
