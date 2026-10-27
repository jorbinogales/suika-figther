"""Pick the sounds the game uses from resources/sounds/* and copy them to public/assets/sfx + sfx.json (name -> [files]).
Run: python tools/build_sfx.py"""
import json, pathlib, shutil, glob, wave, contextlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SND = ROOT.parent / "resources/sounds"
OUT = ROOT / "public/assets/sfx"
K = lambda pack, pat: sorted(glob.glob(str(SND / f"Kenney_kenney_{pack}/Audio/{pat}")))
RV = lambda pat: sorted(glob.glob(str(SND / f"RuneVault/**/{pat}"), recursive=True))
RP = lambda pat: sorted(glob.glob(str(SND / f"RPG_Essentials/**/{pat}"), recursive=True))
OG = lambda pat: sorted(glob.glob(str(SND / f"OpenGameArt/{pat}")))

def short_yells(pat, maxs=1.8, n=8):
    out = []
    for f in sorted(glob.glob(str(SND / f"OpenGameArt/yelling/yelling sounds/{pat}"))):
        with contextlib.closing(wave.open(f)) as w:
            if w.getnframes() / w.getframerate() <= maxs: out.append(f)
    return out[:n]

import sys; sys.path.insert(0, str(pathlib.Path(__file__).parent))
from sfx_map import build
S = build(K, RV, RP, OG, SND, short_yells)
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)
man = {}
for name, files in S.items():
    for i, f in enumerate(files):
        ext = pathlib.Path(f).suffix
        shutil.copy(f, OUT / f"{name}_{i}{ext}")
        man.setdefault(name, []).append(f"{name}_{i}{ext}")
    if name not in man: print("MISSING:", name)
(OUT / "sfx.json").write_text(json.dumps(man, indent=0))
print(len(man), "sounds,", sum(len(v) for v in man.values()), "files,", round(sum(f.stat().st_size for f in OUT.iterdir()) / 1e6, 1), "MB")
