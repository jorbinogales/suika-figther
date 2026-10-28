"""Slice Codex strips (art/raw/<char>/<anim>.png, magenta bg) -> public/assets/sprites/<char>/<anim>.png + manifest.json.
Run: python tools/process_sprites.py   (needs Pillow)"""
import json, pathlib
from PIL import Image

FRAMES = dict(idle=4, walk=6, run=6, attack=5, power1=6, power2=6, power3=6, ult=8, death=6, aim=8, destroy=6, rubble=1, attack3=6, dash=4, power1_virus=6, power1_trojan=6, power1_worm=6, attack2=4, transform=8)
CELL = 256
ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "art/raw", ROOT / "public/assets/sprites"

def key(img, tol=110):
    px = img.convert("RGBA"); d = px.load()
    for y in range(px.height):
        for x in range(px.width):
            r, g, b, _ = d[x, y]
            # magenta-ish: high R and B, low G
            if r > 255 - tol and b > 255 - tol and g < tol + 40:
                d[x, y] = (0, 0, 0, 0)
            elif r > 200 and b > 200 and g < 150:  # despill fringe
                d[x, y] = (0, 0, 0, 0)
    return px

def main():
    manifest = {}
    for cdir in sorted(p for p in RAW.iterdir() if p.is_dir() and p.name not in ("icons", "objects", "aim")):
        for anim, n in FRAMES.items():
            src = cdir / f"{anim}.png"
            if not src.exists():
                continue
            img = Image.open(src).convert("RGB")
            n = max(1, round(img.width / img.height))  # cells are square: frame count comes from the strip itself (per-character counts differ)
            w = img.width // n
            sheet = Image.new("RGBA", (CELL * n, CELL))
            for i in range(n):
                cell = key(img.crop((i * w, 0, (i + 1) * w, img.height)))
                sheet.paste(cell.resize((CELL, CELL), Image.NEAREST), (i * CELL, 0))
            (OUT / cdir.name).mkdir(parents=True, exist_ok=True)
            sheet.save(OUT / cdir.name / f"{anim}.png")
            manifest.setdefault(cdir.name, {})[anim] = n
            print(cdir.name, anim, n, "frames")
    import shutil
    pub = ROOT / "public/assets"
    extra = {}
    for kind in ("icons", "objects", "aim"):
        src = RAW / kind
        names = []
        if src.exists():
            (pub / kind).mkdir(parents=True, exist_ok=True)
            for f in sorted(src.glob("*.png")):
                if f.stem == "lego_brick": continue   # 4-cell strip, split below
                im = key(Image.open(f).convert("RGB"))
                im = im.crop(im.getbbox()) if kind != "aim" and im.getbbox() else im  # tight crop (aim textures keep their canvas)
                im.save(pub / kind / f.name); names.append(f.stem)
        extra[kind] = names
    # xeviche's lego bricks: art/raw/objects/lego_brick.png (4 cells) -> lego_1..4 (tight-cropped)
    lb = RAW / "objects" / "lego_brick.png"
    if lb.exists():
        sh = Image.open(lb).convert("RGB"); cw = sh.width // 4
        for i in range(4):
            im = key(sh.crop((i * cw, 0, (i + 1) * cw, sh.height))); im = im.crop(im.getbbox()) if im.getbbox() else im
            im.save(pub / "objects" / f"lego_{i + 1}.png"); extra["objects"].append(f"lego_{i + 1}")
    # item icons: art/raw/items/sheet_N.png (5x2 cells of 256px) -> public/assets/items/<id>.png (128px, magenta keyed, tight-cropped)
    ids = []
    import re
    ids = (RAW / "items" / "ids50.txt").read_text().split()   # the original 50 icons, in sheet order
    (pub / "items").mkdir(parents=True, exist_ok=True)
    got = []
    for n in range(1, 6):
        src = RAW / "items" / f"sheet_{n}.png"
        if not src.exists(): continue
        sh = Image.open(src).convert("RGB"); cw, ch = sh.width // 5, sh.height // 2
        for c in range(10):
            idx = (n - 1) * 10 + c
            if idx >= len(ids): break
            cell = key(sh.crop(((c % 5) * cw, (c // 5) * ch, (c % 5 + 1) * cw, (c // 5 + 1) * ch)))
            bb = cell.getbbox()
            if not bb: continue
            cell = cell.crop(bb); k = min(56 / cell.width, 56 / cell.height)   # small icons (64px) with a smooth downscale: no shimmering pixels
            icon = Image.new("RGBA", (64, 64)); r = cell.resize((max(1, round(cell.width * k)), max(1, round(cell.height * k))), Image.LANCZOS)
            icon.paste(r, ((64 - r.width) // 2, (64 - r.height) // 2), r); icon.save(pub / "items" / f"{ids[idx]}.png"); got.append(ids[idx])
    # basic (craft component) icons: art/raw/items/basics.png (4x3 cells of 128px) -> 64px
    bids = ["b_pesa", "b_cafe", "b_chip", "b_pila", "b_placa", "b_filtro", "b_vial", "b_zapas", "b_reloj", "b_botiquin", "b_cargador", "b_colmillo"]
    bsrc = RAW / "items" / "basics.png"
    if bsrc.exists():
        sh = Image.open(bsrc).convert("RGB"); cw, ch = sh.width // 4, sh.height // 3
        for i, bid in enumerate(bids):
            cell = key(sh.crop(((i % 4) * cw, (i // 4) * ch, (i % 4 + 1) * cw, (i // 4 + 1) * ch))); bb = cell.getbbox()
            if not bb: continue
            cell = cell.crop(bb); k = min(56 / cell.width, 56 / cell.height)
            icon = Image.new("RGBA", (64, 64)); r = cell.resize((max(1, round(cell.width * k)), max(1, round(cell.height * k))), Image.NEAREST)
            icon.paste(r, ((64 - r.width) // 2, (64 - r.height) // 2), r); icon.save(pub / "items" / f"{bid}.png"); got.append(bid)
    # advantage (stat) icons: art/raw/items/stats.png (4x3 cells of 128px) -> public/assets/stats/<key>.png (48px)
    sids = ["atk", "ap", "armor", "mr", "hp", "mana", "speed", "aspd", "lifesteal", "cdr", "hpRegen", "manaRegen"]; sgot = []
    ssrc = RAW / "items" / "stats.png"
    if ssrc.exists():
        (pub / "stats").mkdir(parents=True, exist_ok=True)
        sh = Image.open(ssrc).convert("RGB"); cw, ch = sh.width // 4, sh.height // 3
        for i, sid in enumerate(sids):
            cell = key(sh.crop(((i % 4) * cw, (i // 4) * ch, (i % 4 + 1) * cw, (i // 4 + 1) * ch))); bb = cell.getbbox()
            if not bb: continue
            cell = cell.crop(bb); k = min(44 / cell.width, 44 / cell.height)
            icon = Image.new("RGBA", (48, 48)); r = cell.resize((max(1, round(cell.width * k)), max(1, round(cell.height * k))), Image.LANCZOS)
            icon.paste(r, ((48 - r.width) // 2, (48 - r.height) // 2), r); icon.save(pub / "stats" / f"{sid}.png"); sgot.append(sid)
    extra["stats"] = sgot
    # extra level-3 items: art/raw/items/lvl3_extra.png (2 cells of 256px side by side)
    xids = ["garras_vampiricas", "botas_hipersonicas"]; xsrc = RAW / "items" / "lvl3_extra.png"
    if xsrc.exists():
        sh = Image.open(xsrc).convert("RGB"); cw = sh.width // 2
        for i, xid in enumerate(xids):
            cell = key(sh.crop((i * cw, 0, (i + 1) * cw, sh.height))); bb = cell.getbbox()
            if not bb: continue
            cell = cell.crop(bb); k = min(56 / cell.width, 56 / cell.height)
            icon = Image.new("RGBA", (64, 64)); r = cell.resize((max(1, round(cell.width * k)), max(1, round(cell.height * k))), Image.LANCZOS)
            icon.paste(r, ((64 - r.width) // 2, (64 - r.height) // 2), r); icon.save(pub / "items" / f"{xid}.png"); got.append(xid)
    # capture flags: art/raw/flags/flag_<name>.png = strip of 6 cells of 256px -> public/assets/flags/<name>.png (6 frames of 128px, no crop so frames stay aligned)
    fgot = []
    if (RAW / "flags").exists():
        (pub / "flags").mkdir(parents=True, exist_ok=True)
        for fp in sorted((RAW / "flags").glob("flag_*.png")):
            sh = Image.open(fp).convert("RGB"); n = max(1, sh.width // sh.height); cw = sh.width // n
            out = Image.new("RGBA", (128 * n, 128))
            for i in range(n): out.paste(key(sh.crop((i * cw, 0, (i + 1) * cw, sh.height))).resize((128, 128), Image.LANCZOS), (i * 128, 0))
            out.save(pub / "flags" / (fp.stem[5:] + ".png")); fgot.append(fp.stem[5:])
    extra["flags"] = fgot
    # static robots: art/raw/statics/<name>.png = strip of N square cells (256px) -> public/assets/statics/<name>.png (N x 192px, keyed, NOT cropped so frames stay aligned)
    stg = {}
    if (RAW / "statics").exists():
        (pub / "statics").mkdir(parents=True, exist_ok=True)
        for fp in sorted((RAW / "statics").glob("*.png")):
            sh = Image.open(fp).convert("RGB"); n = max(1, sh.width // sh.height); cw = sh.width // n; out = Image.new("RGBA", (192 * n, 192))
            for i in range(n): out.paste(key(sh.crop((i * cw, 0, (i + 1) * cw, sh.height))).resize((192, 192), Image.LANCZOS), (i * 192, 0))
            if fp.stem == "flame_jet":   # the jet starts as a point: triangular wedge over the first 30 % of every frame (no cut-off start)
                px = out.load()
                for i in range(n):
                    for x in range(192):
                        if x >= 58: break
                        half = 96 * (x / 58) ** 1.0
                        for y in range(192):
                            if abs(y - 96) > half: px[i * 192 + x, y] = (0, 0, 0, 0)
            out.save(pub / "statics" / fp.name); stg[fp.stem] = n
    extra["statics"] = stg
    # fist progress: art/raw/objects/fist_progress.png (4 cells) -> public/assets/objects/fist_progress_sheet.png (4 x 128, aligned frames)
    fpx = RAW / "objects" / "fist_progress.png"
    if fpx.exists():
        sh = Image.open(fpx).convert("RGB"); cw = sh.width // 4; out = Image.new("RGBA", (512, 128))
        for i in range(4): out.paste(key(sh.crop((i * cw, 0, (i + 1) * cw, sh.height))).resize((128, 128), Image.LANCZOS), (i * 128, 0))
        out.save(pub / "objects" / "fist_progress_sheet.png")
    extra["items"] = got
    # class icons: art/raw/classes/sheet.png (3x2 cells) -> public/assets/classes/<id>.png
    cls_ids = ["todos", "ai", "hacker", "cyber", "soporte", "programador"]; cgot = []
    csrc = RAW / "classes" / "sheet.png"
    if csrc.exists():
        (pub / "classes").mkdir(parents=True, exist_ok=True)
        sh = Image.open(csrc).convert("RGB"); cw, ch = sh.width // 3, sh.height // 2
        for i, cid in enumerate(cls_ids):
            cell = key(sh.crop(((i % 3) * cw, (i // 3) * ch, (i % 3 + 1) * cw, (i // 3 + 1) * ch))); bb = cell.getbbox()
            if not bb: continue
            cell = cell.crop(bb); k = min(112 / cell.width, 112 / cell.height)
            icon = Image.new("RGBA", (128, 128)); r = cell.resize((max(1, round(cell.width * k)), max(1, round(cell.height * k))), Image.NEAREST)
            icon.paste(r, ((128 - r.width) // 2, (128 - r.height) // 2), r); icon.save(pub / "classes" / f"{cid}.png"); cgot.append(cid)
    extra["classes"] = cgot
    (OUT / "manifest.json").write_text(json.dumps({"sprites": manifest, **extra}, indent=1))

if __name__ == "__main__":
    main()
