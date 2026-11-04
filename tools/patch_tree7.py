import pathlib, json
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new):
    assert old in s, old[:100]
    return s.replace(old, new, 1)

# ---------- items.js: 7 new level-3 (purple) items so every green item is the material of a purple one
p = ROOT / 'src/items.js'; s = p.read_text(encoding='utf8')
s = rep(s, "export const PASSIVES = {", """// ---- level 3 (added so that EVERY green item is the material of a purple one) ----
C('exoesqueleto', 'Exoesqueleto', 'ad', ['mancuerna_codigo', 'anillo_vitalidad'], 'Fuerza, vida y resistencia: una armadura que te hace más fuerte al sufrir.');
C('moto_electrica', 'Moto eléctrica', 'ad', ['cadena_bici', 'capa_cifrado'], 'Ataque, velocidad y resistencia a la IA.');
C('botiquin_maestro', 'Botiquín maestro', 'rec', ['antidoto', 'barra_energetica'], 'Consumible: vida y maná al instante y quita aturdimientos, silencios, ralentizaciones y veneno.', { consumable: { hp: 260, mana: 140, time: 3, charges: 3, cleanse: true } });
C('centro_mando', 'Centro de mando', 'util', ['maletin_soldados', 'escudo_emergencia'], 'Activo: invoca soldados reforzados y te da un escudo.', { active: { type: 'multi', cd: 75, m: 1.6, parts: [{ type: 'soldiers', life: 18 }, { type: 'shield', time: 6 }] } });
C('arsenal_artillero', 'Arsenal artillero', 'util', ['mortero_portatil', 'bomba_humo'], 'Activo: despliega un mortero y lanza una cortina de humo que ralentiza.', { active: { type: 'multi', cd: 60, m: 1.5, parts: [{ type: 'mortar', life: 14 }, { type: 'smoke', time: 3 }] } });
C('propulsor_cohete', 'Propulsor cohete', 'util', ['sprint_energia', 'teleport_base'], 'Activo: te lanzas hacia delante y ganas gran velocidad unos segundos.', { active: { type: 'blink', cd: 28, dist: 340, time: 3 } });
C('consola_overclock', 'Consola de overclock', 'ap', ['termo_cafe', 'memoria_ram'], 'Poder de IA, maná, regeneración y recarga de poderes.');

export const PASSIVES = {
  exoesqueleto:        { name: 'Adrenalina de acero', desc: 'Con menos del 50 % de vida ganas un 20 % de ataque físico.' },
  moto_electrica:      { name: 'Carga estática',      desc: 'Tras moverte 2 s seguidos, tu siguiente ataque básico causa 40 de daño de IA extra.' },
  consola_overclock:   { name: 'Overclock',           desc: 'Cada vez que usas un poder recuperas el 8 % de tu maná máximo.' },""")
s = rep(s, "export const MINI_OF = {", "// (the new level-3 items have no level-2 mini passive: their greens keep their stats / actives)\nexport const MINI_OF = {")
p.write_text(s, encoding='utf8')

# ---------- fighter.js: passives
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  get atk() { return (this.grow('atk') + this.it.atk) * (this.buff?.atkMult || 1) * (1 + this.pk('atk')); }",
        "  get atk() { return (this.grow('atk') + this.it.atk) * (this.buff?.atkMult || 1) * (1 + this.pk('atk')) * (this.pas?.has('exoesqueleto') && this.hp < this.maxHp * 0.5 ? 1 + 0.2 * this.pas.get('exoesqueleto') : 1); }")
s = rep(s, "    const ok = this._tryCast(k); if (ok) { this.setupHit();", "    const ok = this._tryCast(k); if (ok) { this.setupHit(); if (this.pas.has('consola_overclock') && this.maxMana) { this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.08 * this.pas.get('consola_overclock')); this.w.vfx('buff', this.x, this.cy, { scale: 2, tint: 0x3b8cff, alpha: 0.7 }); }")
p.write_text(s, encoding='utf8')

# ---------- world.js: static-charge bonus on the basic attack, multi and blink actives
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    if (o?.isChamp && o.pas?.size && this.basicDmg && target.team !== o.team && !target.isTower) {",
"""    if (o?.isChamp && o.pas?.has('moto_electrica') && this.basicDmg && o.moveT > 2 && target.team !== o.team && !target.isTower && target.alive) {   // Moto eléctrica: static charge after running
      o.moveT = 0; this.inPassive = true; this.damage(o, target, 40 * o.pas.get('moto_electrica'), 'magic', true); this.inPassive = false; this.vfx('spark', target.x, target.cy, { scale: 3, tint: 0x66e0ff });
    }
    if (o?.isChamp && o.pas?.size && this.basicDmg && target.team !== o.team && !target.isTower) {""")
s = rep(s, "    w.audio.play('ui_select', { at: f, vol: 0.5, gap: 100 });\n    if (a.type === 'shield')", """    w.audio.play('ui_select', { at: f, vol: 0.5, gap: 100 });
    if (a.type === 'multi') { a.parts.forEach(pt => w.useActive(f, pt, a.m || 1.5)); return; }   // combined actives of the new level-3 items
    if (a.type === 'blink') {   // rocket thruster: a quick dash along the aim (stops at walls) and a speed boost
      let d = 0; while (d < a.dist) { const nd = Math.min(a.dist, d + 20), nx = f.x + f.ax * nd, ny = f.y + f.ay * nd * 0.75; if (!isWalk(nx, ny) || ny < WALK_Y0 || ny > WALK_Y1) break; d = nd; }
      f.x += f.ax * d; f.y += f.ay * d * 0.75; f.speedBoost = 0.3; f.speedT = a.time; w.vfx('shockwave', f.x, f.y - 6, { scale: 2.4, below: true, tint: 0xffaa44 }); w.vfx('buff', f.x, f.cy, { scale: 3, tint: 0xffaa44 }); w.float(f.x, f.y - f.def.height - 34, '¡Propulsor!', '#ffaa44'); return;
    }
    if (a.type === 'shield')""")
p.write_text(s, encoding='utf8')

# ---------- icons: composites of the two ingredient icons (placeholders until Codex draws the real ones)
ex = ROOT / 'art/raw/items_extra'; ex.mkdir(parents=True, exist_ok=True)
pairs = {'exoesqueleto': ('mancuerna_codigo', 'anillo_vitalidad'), 'moto_electrica': ('cadena_bici', 'capa_cifrado'), 'botiquin_maestro': ('antidoto', 'barra_energetica'),
         'centro_mando': ('maletin_soldados', 'escudo_emergencia'), 'arsenal_artillero': ('mortero_portatil', 'bomba_humo'), 'propulsor_cohete': ('sprint_energia', 'teleport_base'), 'consola_overclock': ('termo_cafe', 'memoria_ram')}
for k, (a, b) in pairs.items():
    ia = Image.open(ROOT / f'public/assets/items/{a}.png').convert('RGBA'); ib = Image.open(ROOT / f'public/assets/items/{b}.png').convert('RGBA')
    ic = Image.new('RGBA', (64, 64)); ia = ia.resize((42, 42), Image.NEAREST); ib = ib.resize((40, 40), Image.NEAREST)
    ic.alpha_composite(ia, (1, 1)); ic.alpha_composite(ib, (23, 23)); ic.save(ex / f'{k}.png')
# process_sprites.py: copy art/raw/items_extra/*.png (already transparent, 64 px) into the items folder and the manifest
p = ROOT / 'tools/process_sprites.py'; s = p.read_text(encoding='utf8')
if 'items_extra' not in s:
    s = rep(s, '    extra["items"] = got\n', '    # ready-made icons (transparent, 64 px): art/raw/items_extra/<id>.png\n    for fp in sorted((RAW / "items_extra").glob("*.png")) if (RAW / "items_extra").exists() else []:\n        shutil.copy(fp, pub / "items" / fp.name); got.append(fp.stem)\n    extra["items"] = got\n')
    p.write_text(s, encoding='utf8')
print('patched')
