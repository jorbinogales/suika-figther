"""Texture-atlas packer for character sprite frames (Phaser multiatlas JSON).
pack(name, anims, out_dir): anims = {anim: [PIL RGBA 256x256 frames]}  ->  out_dir/atlas.json + atlas-<n>.png
Frames are trimmed to their opaque bounding box (the JSON keeps the original 256x256 source size + offset, so anchors/origins do not change),
identical frames are stored once, and everything is shelf-packed into pages of at most 4096x4096 with 2 px of transparent padding."""
import hashlib, json, pathlib
from PIL import Image

PAGE_W, PAGE_MAX_H, PAD = 4096, 4096, 2

def pack(name, anims, out_dir):
    out = pathlib.Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    items = {}   # hash -> dict(img, trim box, size) (identical frames are packed once)
    names = []   # (frame name, hash, source size, offset)
    for anim, frames in anims.items():
        for i, im in enumerate(frames):
            bb = im.getchannel("A").getbbox()
            if bb is None: crop = Image.new("RGBA", (1, 1)); ox = oy = 0
            else: crop = im.crop(bb); ox, oy = bb[0], bb[1]
            h = hashlib.md5(crop.tobytes() + bytes(crop.size)).hexdigest()
            items.setdefault(h, dict(img=crop))
            names.append((f"{anim}/{i}", h, im.size, (ox, oy)))
    # shelf packing, tallest first
    order = sorted(items.items(), key=lambda kv: -kv[1]["img"].height)
    pages = []   # each: dict(w, h_used, shelves)
    def place(img):
        w, h = img.width + PAD * 2, img.height + PAD * 2
        for pi, pg in enumerate(pages):
            for sh in pg["shelves"]:
                if h <= sh["h"] and sh["x"] + w <= PAGE_W:
                    pos = (sh["x"] + PAD, sh["y"] + PAD); sh["x"] += w; return pi, pos
            if pg["y"] + h <= PAGE_MAX_H:   # new shelf on this page
                sh = dict(y=pg["y"], h=h, x=w); pg["shelves"].append(sh); pg["y"] += h; return pi, (PAD, sh["y"] + PAD)
        pages.append(dict(y=0, shelves=[])); return place(img)
    for h, it in order: it["page"], it["pos"] = place(it["img"])
    sizes = []
    for pi, pg in enumerate(pages):
        w = max((it["pos"][0] + it["img"].width + PAD for it in items.values() if it["page"] == pi), default=4)
        hh = max((it["pos"][1] + it["img"].height + PAD for it in items.values() if it["page"] == pi), default=4)
        sizes.append(((w + 3) // 4 * 4, (hh + 3) // 4 * 4))
    sheets = [Image.new("RGBA", s) for s in sizes]
    for it in items.values(): sheets[it["page"]].paste(it["img"], it["pos"])
    # content hash in the file name: browsers re-download only when the art changed
    tex = []
    for pi, sh in enumerate(sheets):
        digest = hashlib.md5(sh.tobytes()).hexdigest()[:8]; fn = f"atlas-{pi}.png"
        sh.save(out / fn, optimize=True)
        tex.append(dict(image=f"{fn}?v={digest}", format="RGBA8888", size=dict(w=sh.width, h=sh.height), scale=1, frames=[]))
    for fname, h, src, (ox, oy) in names:
        it = items[h]; w, hh = it["img"].size
        tex[it["page"]]["frames"].append(dict(filename=fname, rotated=False, trimmed=True, sourceSize=dict(w=src[0], h=src[1]),
                                              spriteSourceSize=dict(x=ox, y=oy, w=w, h=hh), frame=dict(x=it["pos"][0], y=it["pos"][1], w=w, h=hh)))
    (out / "atlas.json").write_text(json.dumps(dict(textures=tex, meta=dict(app="tools/atlas.py", name=name, version="1.0")), separators=(",", ":")), encoding="utf8")
    return dict(pages=len(sheets), sizes=sizes, frames=len(names), unique=len(items))
