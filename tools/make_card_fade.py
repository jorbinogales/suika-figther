"""Alpha mask for the champion selection card: the picture dissolves toward its borders with an irregular (non-uniform) edge.
Output: public/assets/ui/card_fade.png (white + alpha, used as CSS mask-image).   Run: python tools/make_card_fade.py"""
import numpy as np, pathlib
from scipy.ndimage import zoom, gaussian_filter
from PIL import Image

W, H = 448, 672
rng = np.random.default_rng(7)

def noise(octaves=((6, 1.0), (14, 0.55), (34, 0.28))):   # fractal value noise in [-1, 1]
    out = np.zeros((H, W))
    for n, amp in octaves:
        g = rng.standard_normal((n, max(2, int(n * H / W))))
        out += amp * zoom(g, (H / g.shape[0], W / g.shape[1]), order=3)[:H, :W]
    return out / np.abs(out).max()

y, x = np.mgrid[0:H, 0:W]
d = np.minimum.reduce([x / W, (W - 1 - x) / W, (H - 1 - y) / H]) / 0.5          # only the left, right and bottom edges dissolve; the top edge stays solid
d = np.clip(d, 0, 1)
v = d + 0.22 * noise()                                                                   # irregular: some sides eat more, some less
a = np.clip((v - 0.04) / 0.34, 0, 1); a = a * a * (3 - 2 * a)                             # smoothstep
a *= np.clip(d / 0.06, 0, 1)                                                              # always fully transparent right at the edge
a = gaussian_filter(a, 1.2)
img = np.zeros((H, W, 4), np.uint8); img[..., :3] = 255; img[..., 3] = (a * 255).astype(np.uint8)
out = pathlib.Path(__file__).resolve().parent.parent / "public/assets/ui/card_fade.png"
Image.fromarray(img, "RGBA").save(out); print("ok", out, f"{out.stat().st_size // 1024} KB")
