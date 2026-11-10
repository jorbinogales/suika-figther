def sub(s, a, b, cnt=1):
    assert a in s, a[:90]
    return s.replace(a, b, cnt)

# ================= world.js =================
p = 'src/world.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "this.fighters = []; this.projs = []; this.obstacles = [];", "this.fighters = []; this.projs = []; this.obstacles = []; this.cages = []; this.tireShots = [];")
# zoom out while aiming wide abilities
s = sub(s, "z = aboard ? zn / 1.5 : zn * this.zoomK;", "ab = this.aimKey && this.pc.def.abilities[this.aimKey], far = ab?.wide && (ab.v !== 'leak' || this.pc.leakRe), z = aboard ? zn / 1.5 : far ? zn * 0.5 : zn * this.zoomK;")
# ESC closes the branch window first
s = sub(s, "if (hs?.shopOpen) { hs.shopOpen = false; } else if (this.aimKey)", "if (hs?.branchSel) { hs.branchSel = null; } else if (hs?.shopOpen) { hs.shopOpen = false; } else if (this.aimKey)")
# ctrl+key spend -> choice window
s = sub(s, "k.ctrl.isDown ? this.player.spend(a) :", "k.ctrl.isDown ? this.askSpend(a) :")
s = sub(s, "  beginAim(a) {", """  askSpend(k) {   // learning a slot with two branches opens the choice window first
    const p = this.player; if (!p.canSpend(k)) return;
    if (p.def.alt?.[k] && !p.ranks[k]) { const hs = this.scene.get('hud'); if (hs) { hs.shopOpen = false; hs.branchSel = k; return; } }
    p.spend(k);
  }
  beginAim(a) {""")
# instant casts + phase 2 of the leak
s = sub(s, "(p.key === 'diosa' && (a === 'p2' || a === 'ult' || (a === 'p1' && p.qRe)))) { p.tryCast(a); return; }",
        "(p.key === 'diosa' && (a === 'p2' || a === 'ult' || (a === 'p1' && p.qRe))) || (p.key === 'leandro' && (d.v === 'comb' || (d.v === 'leak' && !p.leakRe)))) { p.tryCast(a); return; }")
s = sub(s, "    if (p.key === 'jorbi' && a === 'p2') {   // instant dash", """    if (p.key === 'leandro' && d.v === 'dryer') {   // instant: F pulls, Shift + F pushes (carried to the host in the cast point)
      if (!rank || !p.free || p.cds[a] > 0) return; const m = this.mouseGround(); if (!this.hoverKey) p.setAim(m.x - p.x, m.y - p.y);
      p.castPoint = { x: this.k.shift?.isDown ? 1 : 0, y: 0 }; if (!p.tryCast(a)) p.castPoint = null; return;
    }
    if (p.key === 'jorbi' && a === 'p2') {   // instant dash""")
s = sub(s, "(p.mana < rk(d.mana, rank) && !this.debugFree)) { if (rank) this.audio.play('ui_error'", "(p.mana < (p.leakRe && a === 'ult' ? 0 : rk(d.mana, rank)) && !this.debugFree)) { if (rank) this.audio.play('ui_error'")
# AI branch choice + hash
s = sub(s, "e.spend(open.includes('ult') ? 'ult' : open[Math.random() * open.length | 0]);", "e.spend(open.includes('ult') ? 'ult' : open[Math.random() * open.length | 0], Math.random() < 0.5 ? 1 : 0);")
s = sub(s, "ABILITY_KEYS.forEach(a => { while (p.canSpend(a) && p.ranks[a] < (+h.get('rank') || 1)) p.spend(a); });", "const brs = h.get('br') || '';   // #br=1010: second branch for p1 / p2 / p3 / ult\n    ABILITY_KEYS.forEach((a, i) => { while (p.canSpend(a) && p.ranks[a] < (+h.get('rank') || 1)) p.spend(a, brs[i] === '1' ? 1 : 0); });")
# cages / tires: logic + drawing
s = sub(s, "  resolveSolids(f) {\n", """  // virtual cage (Leandro's leaks): whoever was inside when it closed cannot leave, nobody else can come in
  makeCage(owner, target, r, life) {
    this.cages.push({ x: target.x, y: target.y, r, t: life, T: life, inside: new Set([owner, target]) });
    this.zoneDecal(target.x, target.y, r, 0x66ffcc, 1.6); this.audio.play('ui_announce', { vol: 0.7, gap: 0 });
  }
  cageClamp(f) {
    for (const c of this.cages) {
      const dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy) || 1, ins = c.inside.has(f), lim = ins ? c.r - 16 : c.r + 16;
      if (ins ? d <= lim : d >= lim) continue;
      const nx = c.x + dx / d * lim, ny = c.y + dy / d * lim; if (isWalk(nx, ny)) { f.x = nx; f.y = ny; }
    }
  }
  updateCages(dt) {
    this.cages = this.cages.filter(c => (c.t -= dt) > 0 || (this.cageG?.clear(), false));
    if (this.bot) return; const g = (this.cageG ||= this.add.graphics().setDepth(99980)); g.clear(); const tt = this.time.now / 1000;
    for (const c of this.cages) {
      const fade = Math.min(1, c.t * 2, (c.T - c.t) * 3), pulse = 0.5 + 0.5 * Math.sin(tt * 6);
      g.fillStyle(0x66ffcc, 0.07 * fade).fillCircle(c.x, c.y, c.r).lineStyle(4, 0x66ffcc, (0.7 + 0.25 * pulse) * fade).strokeCircle(c.x, c.y, c.r);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + tt * 0.3, x = c.x + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r; g.lineStyle(3, 0x9fffe8, 0.55 * fade).lineBetween(x, y, x, y - 60); }
      g.lineStyle(2, 0xffffff, 0.35 * fade).strokeCircle(c.x, c.y - 60, c.r);
    }
  }
  // Leandro's tire throw: every tire flies in a straight line to the target distance, then bounces back and out again (2 bounces), hurting what it crosses
  throwTires(owner, c, a, dmg) {
    const dx0 = c.x - owner.x, dy0 = c.y - owner.y, D = Math.min(a.range, Math.max(250, Math.hypot(dx0, dy0))), base = Math.atan2(dy0, dx0), px = -Math.sin(base), py = Math.cos(base);
    for (let i = 0; i < a.count; i++) {
      const o = (i - (a.count - 1) / 2) * a.spacing, ang = base + (i - (a.count - 1) / 2) * 0.05, s = this.add.image(owner.x + px * o, owner.y + py * o, 'tire').setOrigin(0.5, 0.85);
      s.setScale(54 / s.height);
      this.tireShots.push({ owner, s, x: owner.x + px * o, y: owner.y + py * o, dx: Math.cos(ang), dy: Math.sin(ang), left: D, D, leg: 0, legs: a.bounces + 1, speed: a.speed, dmg, hit: new Set() });
    }
    this.audio.play('explosion', { at: owner, vol: 0.5, gap: 100 });
  }
  updateTireShots(dt) {
    this.tireShots = this.tireShots.filter(q => {
      let mv = q.speed * dt; const nx = q.x + q.dx * mv, ny = q.y + q.dy * mv;
      if (!isWalk(nx, ny)) q.left = 0; else { q.x = nx; q.y = ny; q.left -= mv; }
      for (const t of this.enemiesOf(q.owner)) if (!q.hit.has(t) && !t.isTower && !t.def?.lane && eDist(t.x, t.y, q.x, q.y) < t.br + 24) { q.hit.add(t); this.damage(q.owner, t, q.dmg, 'magic'); this.vfx('spark', t.x, t.cy, { scale: 3, tint: 0x9ad7ff }); }
      if (q.left <= 0) { q.leg++; if (q.leg >= q.legs) { q.s.destroy(); return false; } q.dx = -q.dx; q.dy = -q.dy; q.left = q.D; q.hit.clear(); this.vfx('shockwave', q.x, q.y - 4, { scale: 1.4, below: true, tint: 0x9ad7ff }); this.audio.play('hit_metal', { at: q, vol: 0.4, gap: 60 }); }
      q.s.setPosition(q.x, q.y).setDepth(q.y).setRotation(q.s.rotation + dt * 14); return true;
    });
  }
  resolveSolids(f) {
    if (this.cages.length) this.cageClamp(f);
""")
s = sub(s, "    this.updateProjectiles(dt);\n", "    this.updateProjectiles(dt); this.updateTireShots(dt); this.updateCages(dt);\n")
# fog: revealed champions
s = sub(s, "    // explore the ground around every unit of ours", "    for (const f of this.fighters) if (f.revealT > 0 && f.alive && f.team !== team && f.revealBy === team) src.push({ x: f.x, y: f.y, team, sight: f.revealSight || 230, reveal: true });   // Leandro's leaks: a small circle of sight around each revealed enemy\n    // explore the ground around every unit of ours")
open(p, 'w', encoding='utf-8').write(s)

# ================= netgame.js =================
p = 'src/netgame.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "d.op === 'spend') f.spend(d.a);", "d.op === 'spend') { const [kk, bb] = String(d.a).split(':'); f.spend(kk, bb ? 1 : 0); }")
s = sub(s, "      if (f.hen) o.hen = [r1(f.henHp), r1(f.henMax)];", "      if (f.hen) o.hen = [r1(f.henHp), r1(f.henMax)];\n      if (f.def.alt) o.br = ABILITY_KEYS.map(a => f.branch[a] || 0); if (f.comb) o.cb = r1(f.comb.t); if (f.leakRe) o.lk = r1(f.leakRe.t);   // Leandro: branch choices, comb and leak windows")
s = sub(s, "ABILITY_KEYS.forEach((a, i) => { f.ranks[a] = o.rk[i]; if (cd) f.cds[a] = o.cd[i]; });", "ABILITY_KEYS.forEach((a, i) => { f.ranks[a] = o.rk[i]; if (cd) f.cds[a] = o.cd[i]; }); if (o.br) ABILITY_KEYS.forEach((a, i) => f.setBranch(a, o.br[i])); f.comb = o.cb ? { t: o.cb, atkCd: f.def.abilities.p1.atkCd, reach: f.def.abilities.p1.reach } : null; f.leakRe = o.lk ? { t: o.lk } : null;")
open(p, 'w', encoding='utf-8').write(s)

# ================= ai.js =================
p = 'src/ai.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "  'leandro:p3': (f, c) => c.target && c.d < 230 && c.hpR < 0.65,", """  'leandro:p3': (f, c) => c.target && c.d < 230 && c.hpR < 0.65,
  'leandro:p1:comb': (f, c) => c.target && c.d < 300 && !f.comb,
  'leandro:p2:dryer': (f, c) => c.target && c.d < 480,
  'leandro:p3:throw': (f, c) => c.target && c.d > 300 && c.d < 1300,
  'leandro:ult:leak': (f, c) => f.leakRe ? !!c.target || c.anyChampAlive : c.anyChampAlive && c.hpR > 0.4,""")
s = sub(s, "const key = f.key + ':' + k, spec = aimSpec(f.key, k, rank, f);", "const key = f.key + ':' + k + (a.v ? ':' + a.v : ''), spec = aimSpec(f.key, k, rank, f);")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
