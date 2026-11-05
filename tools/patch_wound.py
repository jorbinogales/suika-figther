import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
def rep(s, old, new):
    assert old in s, old[:90]
    return s.replace(old, new, 1)

# ---------- items.js: 3 purple anti-heal items (AI / physical / cybersecurity tank)
p = ROOT / 'src/items.js'; s = p.read_text(encoding='utf8')
s = rep(s, "export const PASSIVES = {", """// ---- anti-heal ("herida"): -40 % healing, regeneration, shields-by-heal and life steal on the target ----
C('cuarentena_digital', 'Cuarentena digital', 'ap', ['pantalla_holo', 'amuleto_logico'], 'Poder de IA y resistencia a la IA. Tus habilidades aplican Herida (cortacuración).');
C('ransomware', 'Ransomware', 'ad', ['martillo_debug', 'mancuerna_codigo'], 'Ataque, recarga y resistencia. Tus ataques básicos aplican Herida (cortacuración).');
C('espinas_firewall', 'Espinas de firewall', 'arm', ['escudo_firewall', 'rodilleras_pro'], 'Armadura, vida y regeneración. Quien te golpea con ataques básicos recibe Herida (cortacuración).');

export const PASSIVES = {
  cuarentena_digital:  { name: 'Cuarentena',          desc: 'Tus habilidades que hacen daño aplican Herida durante 3 s: el objetivo recibe un 40 % menos de curación, regeneración y robo de vida.' },
  ransomware:          { name: 'Secuestro de datos',  desc: 'Tus ataques básicos aplican Herida durante 3 s: el objetivo recibe un 40 % menos de curación, regeneración y robo de vida.' },
  espinas_firewall:    { name: 'Contraataque',        desc: 'Cuando un enemigo te golpea con un ataque básico recibe Herida durante 3 s (-40 % de curación, regeneración y robo de vida) y un poco de daño de IA.' },""")
p.write_text(s, encoding='utf8')

# ---------- fighter.js: wound state
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  heal(n) {\n    if (this.isTower) return;\n    const h = Math.min(n, this.maxHp - this.hp);",
 "  // anti-heal: while wounded every source of healing is reduced (wound(pct, t) keeps the strongest pct and the longest time)\n  wound(pct, t) { if (this.isTower || !this.alive) return; this.woundPct = Math.max(this.woundT > 0 ? this.woundPct : 0, pct); this.woundT = Math.max(this.woundT || 0, t); this.w.markSrc?.(this, 'wound'); }\n  get healMult() { return this.woundT > 0 ? 1 - this.woundPct : 1; }\n  heal(n) {\n    if (this.isTower) return;\n    const h = Math.min(n * this.healMult, this.maxHp - this.hp);")
s = rep(s, "      this.hp = Math.min(this.maxHp, this.hp + this.it.hpRegen * dt);", "      this.hp = Math.min(this.maxHp, this.hp + this.it.hpRegen * dt * this.healMult);")
s = rep(s, "    this.slows = this.slows.filter(s => (s.t -= dt) > 0);", "    this.slows = this.slows.filter(s => (s.t -= dt) > 0);\n    if (this.woundT > 0) this.woundT -= dt;")
s = rep(s, "this.stunT = 0; this.slows = []; this.poisons = []; this.rootT = 0;", "this.stunT = 0; this.slows = []; this.poisons = []; this.rootT = 0; this.woundT = 0;")
s = rep(s, "    if (this.slows.length) add('slow',", "    if (this.woundT > 0) add('wound', 'Herida', this.woundT, true, `Recibes un ${Math.round(this.woundPct * 100)} % menos de curación, regeneración y robo de vida.`, { icon: 'icon_wound', name: 'Herida', tint: 0xff5a5a });\n    if (this.slows.length) add('slow',")
p.write_text(s, encoding='utf8')

# ---------- world.js: application, lifesteal reduction, robot heal, icon
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "o.hp = Math.min(o.maxHp, o.hp + dmg * o.it.lifesteal * (o.pas.has(", "o.hp = Math.min(o.maxHp, o.hp + o.healMult * dmg * o.it.lifesteal * (o.pas.has(")
s = rep(s, "      const h = Math.min(s.heal, who.maxHp - who.hp);   // instant heal", "      const h = Math.min(s.heal * who.healMult, who.maxHp - who.hp);   // instant heal")
s = rep(s, "    if (o?.isChamp && o.pas?.has('moto_electrica')", """    if (o?.isChamp && o.pas?.size && target.team !== o.team && !target.isTower && target.alive && target !== o) {   // anti-heal items: the wound is applied by abilities (AI), by basic attacks (physical)
      if (o.pas.has('cuarentena_digital') && !this.basicDmg) target.wound(0.4, 3);
      if (o.pas.has('ransomware') && this.basicDmg) target.wound(0.4, 3);
    }
    if (target.isChamp && target.pas?.has('espinas_firewall') && this.basicDmg && o && o.alive && !o.isTower && o !== target && o.team !== target.team) {   // Espinas de firewall: whoever hits you with a basic attack is wounded and takes a little damage back
      o.wound(0.4, 3); this.inPassive = true; this.damage(target, o, 12 + target.armor * 0.12, 'magic', true); this.inPassive = false; this.vfx('spark', o.x, o.cy, { scale: 1.8, tint: 0xff5a5a });
    }
    if (o?.isChamp && o.pas?.has('moto_electrica')""")
s = rep(s, "    mk('icon_slow', 48, 48, g => {", """    mk('icon_wound', 48, 48, g => {   // wound (anti-heal): a bandaged red heart with a crack on a dark tile
      g.fillStyle(0x1a0808).fillRect(0, 0, 48, 48).lineStyle(2, 0xff5a5a).strokeRect(1, 1, 46, 46);
      g.fillStyle(0xd62828).fillCircle(17, 19, 10).fillCircle(31, 19, 10).fillTriangle(8, 24, 40, 24, 24, 41);
      g.fillStyle(0xff7a7a).fillCircle(15, 16, 4);
      g.lineStyle(3, 0x1a0808).lineBetween(26, 10, 22, 21).lineBetween(22, 21, 28, 27).lineBetween(28, 27, 24, 38);
      g.lineStyle(4, 0xf4ead0).lineBetween(8, 35, 40, 14); g.lineStyle(1.5, 0xb9a98a).lineBetween(8, 35, 40, 14);
    });
    mk('icon_slow', 48, 48, g => {""")
s = rep(s, "f.slowIc?.setVisible(false); continue; }", "f.slowIc?.setVisible(false); f.woundIc?.setVisible(false); continue; }")
s = rep(s, "si.setVisible(true).setPosition(x + sx, sy); } else f.slowIc?.setVisible(false);", "si.setVisible(true).setPosition(x + sx, sy); sx += 17; } else f.slowIc?.setVisible(false);\n      if (champ && f.woundT > 0) { const wi = (f.woundIc ||= this.add.image(0, 0, 'icon_wound').setDepth(100001).setDisplaySize(14, 14)); wi.setVisible(true).setPosition(x + sx, sy); } else f.woundIc?.setVisible(false);")
p.write_text(s, encoding='utf8')

# ---------- recommend.js: anti-heal items are a counter to enemies that heal / steal life
p = ROOT / 'src/recommend.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  if (item.consumable?.cleanse) {", "  if (['cuarentena_digital', 'ransomware', 'espinas_firewall'].includes(item.id)) { const l = E.filter(e => e.heals); return { names: names(l.map(e => e.f)), reason: 'rivales que se curan (cortacuración)', k: 1.4 * l.length / E.length }; }\n  if (item.consumable?.cleanse) {")
p.write_text(s, encoding='utf8')
print('ok')
