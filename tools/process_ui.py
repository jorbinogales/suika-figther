"""Key the magenta holes of the Codex UI panels and locate them.
Input : art/raw/ui/hud_bottom.png, hud_target.png
Output: public/assets/ui/<name>.png (magenta -> transparent) and public/assets/ui/layout.json
        {name: {w, h, holes: {role: [x, y, w, h]}}}   (px of the output image)
Run: python tools/process_ui.py   (needs Pillow + numpy)"""
import json, pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "art/raw/ui", ROOT / "public/assets/ui"

def grid(x0, y0, size, gap, cols, rows):
    return [(x0 + c * (size + gap) + size / 2, y0 + r * (size + gap) + size / 2) for r in range(rows) for c in range(cols)]

# expected hole centers, in px of the spec'd canvas (art/UI_SPEC.md). Holes are matched to the nearest unused one.
SPECS = {
    "hud_hero": {"size": (260, 230), "roles": {"portrait": (84, 100), "name": (84, 184), "help": (182, 54)}},
    "hud_center": {"size": (520, 190), "roles": {
        **{f"ability{i}": (102 + 98 * i, 54) for i in range(4)}, "hp": (260, 126), "mana": (260, 155)}},
    "hud_minimap": {"size": (370, 230), "roles": {"minimap": (185, 114)}},
    "hud_items": {"size": (148, 240), "roles": {f"item{i}": (42 + 64 * (i % 2), 56 + 64 * (i // 2)) for i in range(6)}},
    "hud_enemy": {"size": (504, 72), "roles": {"name": (99, 36), "help": (477, 36), **{f"item{i}": (215 + 42 * i, 36) for i in range(6)}}},
    **{f"hud_banner_{c}": {"size": (800, 140), "roles": {"portrait": (72, 70), "victim": (750, 70)}} for c in ("blue", "red", "gold")},
    **{f"hud_banner_{c}_l": {"size": (800, 140), "roles": {"portrait": (72, 70)}} for c in ("blue", "red", "gold")},
    "hud_banner_gold_plain": {"size": (800, 140), "roles": {}},
    "hud_stats": {"size": (254, 230), "roles": {"stats": (127, 115)}},
    "hud_target": {"size": (768, 300), "roles": {
        "name": (224, 28), "portrait": (84, 116), "stats": (310, 156),
        **{f"item{i}": c for i, c in enumerate(grid(488, 56, 72, 8, 3, 2))}}},
}

def label(mask):
    """4-connected components of a boolean mask -> (labels, count)"""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); n = 0
    for sy, sx in zip(*np.nonzero(mask)):
        if lab[sy, sx]:
            continue
        n += 1; lab[sy, sx] = n; st = [(sy, sx)]
        while st:
            y, x = st.pop()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; st.append((ny, nx))
    return lab, n

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    layout = {}
    for name, spec in SPECS.items():
        src = RAW / f"{name}.png"
        if not src.exists():
            continue
        img = Image.open(src).convert("RGBA")
        W, H = spec["size"]
        if img.size != (W, H):
            print(f"{name}: resizing {img.size} -> {(W, H)}"); img = img.resize((W, H), Image.NEAREST)
        a = np.array(img)
        mask = (a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 90)
        lab, n = label(mask)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        holes = []
        for i in range(1, n + 1):
            if i in border:
                continue
            ys, xs = np.nonzero(lab == i)
            if len(ys) < 150:
                continue
            holes.append((int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)))
        a[mask] = (0, 0, 0, 0)
        Image.fromarray(a).save(OUT / f"{name}.png")
        free, roles = list(holes), {}
        for role, (cx, cy) in spec["roles"].items():
            if not free:
                break
            best = min(free, key=lambda h: (h[0] + h[2] / 2 - cx) ** 2 + (h[1] + h[3] / 2 - cy) ** 2)
            free.remove(best); roles[role] = list(best)
        layout[name] = {"w": W, "h": H, "holes": roles}
        print(name, f"{len(holes)} holes found, {len(spec['roles'])} expected,", "unmatched:", free)
    (OUT / "layout.json").write_text(json.dumps(layout, indent=1))

if __name__ == "__main__":
    main()
