import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
def rep(s, old, new):
    assert old in s, old[:90]
    return s.replace(old, new, 1)

# ---------- netgame: the host tells everybody who is aboard; a guest builds a local mirror of the ship state (reticle, gating, aerial camera)
p = ROOT / 'src/netgame.js'; s = p.read_text(encoding='utf8')
s = rep(s, "const TYPES = ['physical', 'magic', 'true'];", "const TYPES = ['physical', 'magic', 'true'];\nconst BPH = ['', 'arrive', 'board', 'fly', 'land', 'leave'];   // Yonaiker's ship phases as sent in snapshots (o.bm = [phase, total time, elapsed])")
s = rep(s, "if (f.gun) o.gn = 1;   // Yonaiker", "if (f.gun) o.gn = 1; if (f.bomber && !f.bomber.mirror) o.bm = [Math.max(0, BPH.indexOf(f.bomber.phase)), r1(f.bomber.T), r1(f.bomber.t)];   // Yonaiker")
s = rep(s, "f.gun = !!o.gn; f.potions", """f.gun = !!o.gn;
      if (o.bm) {   // aboard Yonaiker's ship (the host runs it): keep a local mirror so the guest gets the reticle, the aerial view and the abilities that work aboard
        const B = f.bomber?.mirror ? f.bomber : (f.bomber = { mirror: true, o: f, a: f.def.abilities.p3, rank: f.ranks.p3, pt: { x: f.x, y: f.y }, fire: false, cd: 0 }), ph = BPH[o.bm[0]];
        if (B.phase !== ph) w.bomberMirrorPhase(B, ph);
        B.T = o.bm[1]; B.t = o.bm[2]; B.rank = f.ranks.p3;
      } else if (f.bomber?.mirror) { w.bomberMirrorPhase(f.bomber, null); f.bomber = null; }
      f.potions""")
p.write_text(s, encoding='utf8')

# ---------- world: reticle drawing shared by the real ship and the guest mirror, R zone preview, mirror update
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
a = s.index("        if (human) {   // bomber reticle: missile area, or the red-tipped crosshair of the machine gun")
b = s.index("        o.charge = 100 * Math.max(0, 1 - B.t / B.T);   // the bar drains while aboard")
s = s[:a] + "        if (human) this.drawBomberReticle(g, B, o);   // bomber reticle: missile area, or the red-tipped crosshair of the machine gun, plus the zone of the smoke screen\n" + s[b:]
s = rep(s, "  endBomber(B) {", """  // reticle of the ship (also used by the online guest's mirror): E = missile area (green), Q on = machine gun area with a red-tipped pointer, R ready = the purple zone the smoke screen will cover
  drawBomberReticle(g, B, o) {
    const p = B.pt, r = 46 + 4 * Math.sin(this.time.now / 90), gunShape = o.gun && o.ranks.p1 && this.time.now - (B.lastMissile || 0) > 700;
    const ua = o.def.abilities.ult;
    if (o.ranks.ult && o.cds.ult <= 0 && ua) {   // R is ready: the zone it would cover (dashed purple ring + faint fill) follows the reticle
      const R = ua.radius, n = 36, pu = 0.5 + 0.5 * Math.sin(this.time.now / 260);
      g.fillStyle(0x9b4dff, 0.06 + 0.03 * pu).fillEllipse(p.x, p.y, R * 2, R * 2 * YR);
      g.lineStyle(3, 0xc58bff, 0.55 + 0.25 * pu);
      for (let i = 0; i < n; i += 2) { const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283; g.beginPath().arc(p.x, p.y, R, a0, a1).strokePath(); }
      g.save?.();
    }
    if (gunShape) {
      const R = o.def.abilities.p1.area, rr = R * (1 + 0.03 * Math.sin(this.time.now / 70));
      g.lineStyle(3, 0xff4a3a, 0.9).strokeEllipse(p.x, p.y, rr * 2, rr * 2 * YR).lineStyle(1, 0xffd2c8, 0.5).strokeEllipse(p.x, p.y, rr * 1.2, rr * 1.2 * YR);
      g.lineStyle(2, 0xffffff, 0.85).lineBetween(p.x - R * 0.35, p.y, p.x + R * 0.35, p.y).lineBetween(p.x, p.y - R * 0.35 * YR, p.x, p.y + R * 0.35 * YR);
      g.fillStyle(0xff2a1a, 1).fillTriangle(p.x, p.y - R * 0.6 * YR, p.x - 7, p.y - R * 0.28 * YR, p.x + 7, p.y - R * 0.28 * YR);   // red-tipped pointer
      B.ret?.setVisible(false);
    } else if (this.textures.exists('bomber_reticle')) { B.ret ||= this.add.image(p.x, p.y, 'bomber_reticle').setDepth(99996).setBlendMode('ADD'); B.ret.setPosition(p.x, p.y).setDisplaySize(r * 3.2, r * 3.2 * YR).setVisible(true); }
    else { g.lineStyle(3, 0x66ff88, 0.95).strokeEllipse(p.x, p.y, r * 2, r * 2 * YR).strokeEllipse(p.x, p.y, r * 1.1, r * 1.1 * YR).lineBetween(p.x - r * 1.3, p.y, p.x + r * 1.3, p.y).lineBetween(p.x, p.y - r * 1.3 * YR, p.x, p.y + r * 1.3 * YR); }
  }
  // online guest: the host runs the ship; here we only mirror its phase to drive the camera, move our own reticle (WASD) and read the trigger (sent to the host with the inputs)
  bomberMirrorPhase(B, ph) {
    const o = B.o, mine = o === this.pc, was = B.phase; B.phase = ph;
    if (!mine) return;
    if (ph === 'board') this.cameras.main.fadeOut(800, 0, 0, 0);
    else if (ph === 'fly') { B.pt = { x: o.x, y: o.y }; this.snapZoom = true; this.cameras.main.fadeIn(1100, 0, 0, 0); }
    else if (ph === 'land') this.cameras.main.fadeOut(600, 0, 0, 0);
    else if (was === 'land' || was === 'fly' || ph === null) { B.ret?.destroy(); B.ret = null; this.snapZoom = true; this.cameras.main.resetFX(); this.cameras.main.fadeIn(700, 0, 0, 0); }
  }
  updateBomberMirror(dt) {
    const o = this.pc, B = o?.bomber; if (!B?.mirror) return;
    const g = this.bomberG; if (!g) return;
    if (B.phase !== 'fly') { B.ret?.setVisible(false); return; }
    const K = this.k, dn = (a, b) => (a.isDown || b.isDown ? 1 : 0), mx = dn(K.right, K.right2) - dn(K.left, K.left2), my = dn(K.down, K.down2) - dn(K.up, K.up2), sp = 520 * dt / (Math.hypot(mx, my) || 1);
    B.pt = { x: Phaser.Math.Clamp(B.pt.x + mx * sp, 60, WORLD_W - 60), y: Phaser.Math.Clamp(B.pt.y + my * sp, WALK_Y0, WALK_Y1) };
    const ptr = this.input.activePointer;
    B.fire = (K.p3.isDown || ptr.leftButtonDown()) && !(this.uiRects || []).some(r => ptr.x >= r.x && ptr.x <= r.x + r.w && ptr.y >= r.y && ptr.y <= r.y + r.h);
    if (o.gun && o.ranks.p1) B.gunT = 0;
    this.drawBomberReticle(g, B, o);
  }
  endBomber(B) {""")
s = rep(s, "this.updateBomber(dt); this.updateSupport(dt);", "this.updateBomber(dt); this.updateBomberMirror(dt); this.updateSupport(dt);")
p.write_text(s, encoding='utf8')
print('ok')
