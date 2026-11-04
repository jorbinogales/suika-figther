import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new):
    assert old in s, old[:90]
    return s.replace(old, new, 1)

# ---- process_sprites.py: pack every character's frames into one atlas instead of one sheet per animation
p = ROOT / 'tools/process_sprites.py'; s = p.read_text(encoding='utf8')
s = rep(s, "from PIL import Image\n", "from PIL import Image\nfrom atlas import pack as pack_atlas\n")
s = rep(s, """            sheet = Image.new("RGBA", (CELL * n, CELL))
            for i in range(n):
                cell = key(img.crop((i * w, 0, (i + 1) * w, img.height)))
                sheet.paste(cell.resize((CELL, CELL), Image.NEAREST), (i * CELL, 0))
            (OUT / cdir.name).mkdir(parents=True, exist_ok=True)
            sheet.save(OUT / cdir.name / f"{anim}.png")
            manifest.setdefault(cdir.name, {})[anim] = n""", """            cells = [key(img.crop((i * w, 0, (i + 1) * w, img.height))).resize((CELL, CELL), Image.NEAREST) for i in range(n)]
            atlas_frames.setdefault(cdir.name, {})[anim] = cells
            manifest.setdefault(cdir.name, {})[anim] = n""")
s = rep(s, "    manifest = {}\n", "    manifest = {}; atlas_frames = {}\n")
s = rep(s, "    import shutil\n    pub = ROOT / \"public/assets\"", """    # one texture atlas per character (trimmed, de-duplicated, packed) replaces the old one-sheet-per-animation files
    for ch, anims in atlas_frames.items():
        d = OUT / ch; d.mkdir(parents=True, exist_ok=True)
        for old in d.glob("*.png"): old.unlink()
        info = pack_atlas(ch, anims, d)
        print(f"atlas {ch}: {info['frames']} frames ({info['unique']} unique) in {info['pages']} page(s) {info['sizes']}")
    import shutil
    pub = ROOT / "public/assets\"""")
p.write_text(s, encoding='utf8')

# ---- world.js: load the atlases and build the animations from frame names
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, """    for (const ch in sprites) for (const a in sprites[ch])
      this.load.spritesheet(`${ch}_${a}`, `assets/sprites/${ch}/${a}.png?${t}`, { frameWidth: 256, frameHeight: 256 });""", """    for (const ch in sprites) this.load.multiatlas(ch, `assets/sprites/${ch}/atlas.json?${t}`, `assets/sprites/${ch}/`);   // one atlas per character/unit: frames are named <anim>/<index>""")
s = rep(s, "const [base, dir] = splitDir(a), frames = this.anims.generateFrameNumbers(`${ch}_${a}`);", "const [base, dir] = splitDir(a), frames = this.anims.generateFrameNames(ch, { prefix: `${a}/`, start: 0, end: sprites[ch][a] - 1 });")
s = rep(s, "frames: [{ key: `${ch}_walk`, frame: 0 }], frameRate: 1, repeat: -1 });", "frames: [{ key: ch, frame: 'walk/0' }], frameRate: 1, repeat: -1 });")
p.write_text(s, encoding='utf8')

# ---- fighter.js: textures are now atlas frames
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "this.dirFrames = this.isTower && s.textures.exists(`${this.key}_aim`);", "this.dirFrames = this.isTower && !!s.sprites[this.key]?.aim;")
s = rep(s, "    const tex = this.dirFrames ? `${this.key}_aim` : this.hasAnims ? (s.textures.exists(`${this.key}_idle`) ? `${this.key}_idle` : `${this.key}_walk`) : (this.def.ref || this.key);", "    const sp = s.sprites[this.key], tex = this.dirFrames ? this.key : this.hasAnims ? this.key : (this.def.ref || this.key), fr = this.dirFrames ? 'aim/0' : this.hasAnims ? (sp.idle ? 'idle/0' : 'walk/0') : undefined;   // atlas frame for towers / animated units")
s = rep(s, "    this.spr = s.add.sprite(this.x, this.y, tex);", "    this.spr = s.add.sprite(this.x, this.y, tex, fr);")
s = rep(s, "spr.setFrame(((Math.round(Math.atan2(this.ay, this.ax) / (Math.PI / 4)) % 8) + 8) % 8).setPosition(this.x, this.y);", "spr.setFrame(`aim/${((Math.round(Math.atan2(this.ay, this.ax) / (Math.PI / 4)) % 8) + 8) % 8}`).setPosition(this.x, this.y);")
s = rep(s, "if (this.w.textures.exists(`${this.key}_rubble`)) this.spr.stop().setTexture(`${this.key}_rubble`, 0);", "if (this.w.sprites[this.key]?.rubble) this.spr.stop().setTexture(this.key, 'rubble/0');")
p.write_text(s, encoding='utf8'); print('patched')
