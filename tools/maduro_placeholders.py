"""Temporary art for Maduro until Codex's real sprites / portraits / icons arrive (they overwrite these files by name).
- public/assets/ref_maduro.png, ref_superbigote.png : static figures (the game scales them by height / 1330)
- public/assets/concept/maduro.webp, maduro_face.webp : selection art
- art/raw/icons/maduro_*.png : magenta-background icons (process_sprites.py keys them and copies them to public/assets/icons)
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / 'public/assets'
OUT = (0, 0, 0, 255)

def figure(sb):
    W, H, S = 64, 133, 10
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    R = lambda x0, y0, x1, y1, c: d.rectangle([x0, y0, x1, y1], fill=c)
    skin, skin2 = (196, 140, 104, 255), (160, 108, 78, 255)
    if sb:
        red, blue, yel, gray = (214, 40, 40, 255), (40, 70, 170, 255), (255, 210, 40, 255), (150, 156, 168, 255)
        R(14, 40, 50, 96, blue)                      # cape behind
        R(20, 108, 29, 130, red); R(34, 108, 43, 130, red); R(18, 128, 30, 132, blue); R(33, 128, 45, 132, blue)   # legs + boots
        R(18, 74, 46, 110, red)                      # torso / hips
        R(18, 90, 46, 95, gray); R(29, 89, 35, 96, yel)   # belt
        R(24, 54, 40, 76, yel); R(24, 54, 40, 56, OUT); R(26, 58, 30, 72, red); R(33, 58, 38, 72, red)   # SB patch
        R(10, 52, 20, 90, red); R(10, 88, 20, 98, blue)   # left arm + glove
        R(44, 52, 54, 78, red); R(46, 30, 58, 56, gray); R(44, 24, 60, 34, gray)   # right arm up with a metal fist
        R(25, 28, 39, 48, skin); R(23, 17, 41, 22, red); R(21, 22, 43, 30, red); R(26, 33, 38, 38, blue)   # head, helmet, visor
        R(27, 41, 37, 44, OUT)                       # moustache
        R(28, 17, 36, 19, yel)
    else:
        suit, white, tie = (28, 28, 34, 255), (240, 240, 240, 255), (170, 24, 32, 255)
        R(20, 112, 29, 130, suit); R(34, 112, 43, 130, suit); R(18, 128, 30, 132, OUT); R(33, 128, 45, 132, OUT)   # legs + shoes
        R(16, 54, 48, 114, suit)                     # jacket
        R(28, 54, 36, 76, white); R(31, 58, 33, 72, tie)   # shirt + tie
        R(8, 56, 17, 100, suit); R(47, 56, 56, 100, suit); R(8, 98, 17, 104, skin); R(47, 98, 56, 104, skin)   # arms + hands
        for i in range(0, 34):                       # tricolour sash from the right shoulder to the left hip
            x, y = 40 - i * 0.55, 54 + i
            col = [yel_c for yel_c in ((255, 210, 40, 255), (40, 90, 200, 255), (214, 40, 40, 255))][min(2, i // 3 % 3)]
            R(int(x) - 1, int(y), int(x) + 5, int(y) + 1, col)
        R(24, 62, 28, 64, (255, 210, 40, 255)); R(30, 64, 33, 67, (255, 210, 40, 255))   # medals
        R(25, 30, 39, 52, skin); R(23, 24, 41, 31, (20, 20, 24, 255)); R(26, 28, 38, 30, (20, 20, 24, 255))   # head + hair
        R(27, 44, 37, 47, OUT); R(27, 36, 29, 37, OUT); R(35, 36, 37, 37, OUT)   # moustache + eyes
    im = im.crop((0, 15, W, H)); return im.resize((int(W * 1330 / (H - 15)), 1330), Image.NEAREST)   # head at the top like the other refs (the HUD crops the face from the top)

def diosa_figure():
    W, H, S = 64, 133, 10
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    R = lambda x0, y0, x1, y1, c: d.rectangle([x0, y0, x1, y1], fill=c)
    skin, hair, dress, pink = (206, 150, 110, 255), (16, 14, 20, 255), (24, 22, 30, 255), (236, 64, 150, 255)
    R(19, 26, 45, 96, hair)                           # long black hair behind the body
    R(24, 24, 40, 40, hair); R(26, 30, 38, 46, skin)    # fringe + face
    R(28, 36, 30, 37, (60, 30, 20, 255)); R(34, 36, 36, 37, (60, 30, 20, 255)); R(30, 42, 35, 43, (200, 70, 90, 255))
    R(29, 46, 35, 52, skin)                           # neck
    R(22, 52, 42, 82, dress); R(24, 50, 40, 54, dress)   # black stage dress (long sleeves + knee-length skirt)
    R(20, 80, 44, 108, dress); R(18, 100, 46, 108, dress)
    R(22, 66, 42, 68, pink); R(30, 66, 34, 72, pink)    # pink sash / bow
    R(18, 54, 23, 90, dress); R(41, 54, 46, 90, dress); R(18, 88, 23, 93, skin); R(41, 88, 46, 93, skin)   # arms with sleeves
    R(24, 108, 29, 128, skin); R(35, 108, 40, 128, skin); R(23, 127, 30, 132, pink); R(34, 127, 41, 132, pink)   # legs + pink heels
    R(46, 60, 48, 128, (170, 176, 188, 255)); R(43, 50, 51, 60, (180, 184, 150, 255))   # vintage microphone stand
    im = im.crop((0, 15, W, H)); return im.resize((int(W * 1330 / (H - 15)), 1330), Image.NEAREST)

def tinted_bg(size, c0, c1):
    w, h = size; im = Image.new('RGB', size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h; d.line([(0, y), (w, y)], fill=tuple(int(c0[i] * (1 - t) + c1[i] * t) for i in range(3)))
    return im

def font(sz):
    for f in ('C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf'):
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()

def icon(path, bg, glyph, label):
    im = Image.new('RGB', (128, 128), (255, 0, 255)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([8, 8, 120, 120], 14, fill=bg, outline=(0, 0, 0), width=4)
    f = font(46); bb = d.textbbox((0, 0), glyph, font=f); d.text((64 - (bb[2] - bb[0]) / 2 - bb[0], 52 - (bb[3] - bb[1]) / 2 - bb[1]), glyph, font=f, fill=(255, 255, 255))
    f2 = font(15); bb = d.textbbox((0, 0), label, font=f2); d.text((64 - (bb[2] - bb[0]) / 2 - bb[0], 100 - bb[1] - (bb[3] - bb[1]) / 2), label, font=f2, fill=(255, 255, 255))
    im.save(path)

def main():
    for name, sb in (('ref_maduro', False), ('ref_superbigote', True)):
        figure(sb).save(PUB / f'{name}.png')
    diosa_figure().save(PUB / 'ref_diosa.png')
    (PUB / 'concept').mkdir(exist_ok=True)
    fg = figure(False); f = fg.crop((int(fg.width * 0.22), 0, int(fg.width * 0.78), int(fg.width * 0.56))).resize((256, 256), Image.NEAREST)
    bg = tinted_bg((256, 256), (255, 205, 60), (40, 70, 170)); bg.paste(f, (0, 0), f); bg.save(PUB / 'concept/maduro_face.webp', quality=90)
    fg = figure(False); big = fg.resize((int(fg.width * 1050 / 1330), 1050), Image.NEAREST); bg = tinted_bg((768, 1152), (255, 205, 60), (30, 50, 130)); bg.paste(big, ((768 - big.width) // 2, 40), big); bg.save(PUB / 'concept/maduro.webp', quality=90)
    fg = diosa_figure(); f = fg.crop((int(fg.width * 0.22), 0, int(fg.width * 0.78), int(fg.width * 0.56))).resize((256, 256), Image.NEAREST)
    bg = tinted_bg((256, 256), (255, 120, 190), (60, 30, 90)); bg.paste(f, (0, 0), f); bg.save(PUB / 'concept/diosa_face.webp', quality=90)
    big = fg.resize((int(fg.width * 1050 / 1330), 1050), Image.NEAREST); bg = tinted_bg((768, 1152), (255, 120, 190), (40, 20, 70)); bg.paste(big, ((768 - big.width) // 2, 40), big); bg.save(PUB / 'concept/diosa.webp', quality=90)
    raw = ROOT / 'art/raw/icons'
    for k, bgc, g, lab in (('maduro_passive', (150, 120, 20), '$', 'PASIVA'), ('maduro_p1', (190, 140, 20), 'Q', 'DECRETO'), ('maduro_p2', (30, 80, 140), 'F', 'ESCOLTAS'),
                           ('maduro_p3', (140, 90, 40), 'E', 'CESTA'), ('maduro_ult', (190, 30, 30), 'SB', 'SÚPER'), ('maduro_p1_sb', (170, 40, 40), 'Q', 'PUÑO'),
                           ('maduro_p2_sb', (40, 90, 190), 'F', 'ESCUDO'), ('maduro_p3_sb', (90, 96, 110), 'E', 'MANO'),
                           ('diosa_passive', (150, 40, 100), 'P', 'TABÚ'), ('diosa_p1', (200, 50, 120), 'Q', 'PORTADA'), ('diosa_p2', (170, 60, 160), 'F', 'BAILE'),
                           ('diosa_p3', (190, 40, 70), 'E', 'TACÓN'), ('diosa_ult', (230, 170, 40), 'R', 'SHOW')):
        if not (raw / f'{k}.png').exists() or process_is_placeholder(raw / f'{k}.png'):
            icon(raw / f'{k}.png', bgc, g, lab)

def process_is_placeholder(p):   # keep Codex's icon if it already delivered one (it is bigger than our 128x128 placeholder or has a different size)
    return Image.open(p).size == (128, 128) and p.stat().st_size < 4000

main()
print('placeholders written')
