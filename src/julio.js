// Julio's kit (stroke Q / dash F / sky puddle E / drops R + the golden-ink second branches). Fighter methods are mixed in at the bottom of fighter.js.
import { rk } from './data.js';
import { isWalk, WORLD_H } from './mapdata.js';

const BR = 28, GOLD = 0xffd23f, okAt = (x, y) => y > 70 && y < WORLD_H - 70 && isWalk(x, y);

// Q: ink stroke. `len` = how far the player aimed; the stroke always holds `total` of ink, so a far aim is straight and a near aim coils up.
// It bounces off walls (mirroring the frame of the stroke).
export function inkPath(o, len, total, steps = 70) {
  const L = Math.min(Math.max(len || total, 160), total);
  const arc = amp => { let s = 0, px = 0, py = 0; for (let i = 1; i <= steps; i++) { const u = i / steps, x = L * u, y = Math.sin(u * Math.PI * 2) * amp; s += Math.hypot(x - px, y - py); px = x; py = y; } return s; };
  let amp = 0;
  if (arc(0) < total - 1) { let lo = 0, hi = 260; for (let i = 0; i < 28; i++) { amp = (lo + hi) / 2; arc(amp) > total ? hi = amp : lo = amp; } }
  let x = o.x, y = o.y, fx = o.ax, fy = o.ay, gx = -o.ay, gy = o.ax, px = 0, py = 0;
  const pts = [{ x, y }];
  for (let i = 1; i <= steps; i++) {
    const u = i / steps, lx = L * u, ly = Math.sin(u * Math.PI * 2) * amp, dx = lx - px, dy = ly - py; px = lx; py = ly;
    let wx = fx * dx + gx * dy, wy = fy * dx + gy * dy;
    if (!okAt(x + wx, y + wy)) {   // wall: mirror the stroke's frame on the blocked axis
      const okx = okAt(x + wx, y), oky = okAt(x, y + wy);
      if (okx && !oky) { fy = -fy; gy = -gy; wy = -wy; } else if (oky && !okx) { fx = -fx; gx = -gx; wx = -wx; } else { fx = -fx; fy = -fy; gx = -gx; gy = -gy; wx = -wx; wy = -wy; }
      if (!okAt(x + wx, y + wy)) break;
    }
    x += wx; y += wy; pts.push({ x, y });
  }
  return pts;
}

export const JulioMixin = {
  inkBounces() { const a = this.def.abilities.p3; return a?.v === 'bounce' && this.ranks.p3 ? a : null; },

  fireJulio(k, a, rank) {
    const w = this.w;
    if (k === 'p1' && a.v === 'burst') {   // golden machine gun: keeps the direction aimed when cast
      this.burst = { t: rk(a.time, rank), T: rk(a.time, rank), rate: rk(a.rate, rank), tick: 0, ax: this.ax, ay: this.ay, dmg: rk(a.dmg, rank) + this.ap * a.apScale, speed: a.speed, range: a.range };
      w.float(this.x, this.y - this.def.height - 34, '¡Ráfaga dorada!', '#ffd23f'); return;
    }
    if (k === 'p1') {   // ink stroke (thicker and brighter with rank)
      const len = this.castPoint?.x || a.length; this.castPoint = null;
      const dmg = rk(a.dmg, rank) + this.ap * a.apScale, width = rk(a.width, rank), pts = inkPath(this, len, a.length);
      w.inkTrail(pts, width, rk(a.life, rank), rank - 1);
      w.enemiesOf(this).forEach(t => { if (w.nearPath(pts, t.x, t.y, width / 2 + BR * 0.6)) { w.damage(this, t, dmg, 'magic'); w.applyInk(this, t); } });
      return;
    }
    if (k === 'p2' && a.v === 'shield') return this.inkShield(a, rank);
    if (k === 'p2') {
      const dmg = rk(a.dmg, rank) + this.ap * a.apScale;
      if (rank >= 3) {   // free movement: speed boost + a damaging ink trail for a few seconds
        const t = rk(a.free, rank); this.speedBoost = a.freeSpeed; this.speedT = t; this.inkFree = { t, hit: new Map(), dmg: dmg * 0.6, lx: this.x, ly: this.y, dx: this.ax, dy: this.ay };
        w.vfx('poison_hit', this.x, this.y - 10, { scale: 3.4, tint: 0x6a3cff, below: true }); w.float(this.x, this.y - this.def.height - 34, '¡Ola de tinta!', '#a58cff'); return;
      }
      const dist = rk(a.dashDist, rank), dur = 0.24;
      this.state = 'cast'; this.anim = 'power2'; this.stateT = 0.15; this.stateDur = dur + 0.15; this.fired = true;
      this.dashV = { x: this.ax * dist / dur, y: this.ay * dist / dur };
      this.inkDash = { hit: new Set(), dmg, ox: this.x, oy: this.y, trail: rank >= 2 };
      return;
    }
    if (k === 'p3') {   // puddle falls from the sky
      const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
      const ctx = w.castCtx, r = rk(a.radius, rank);
      w.inkSky(c.x, c.y, r, () => w.zones.push({ ctx, kind: 'puddle', rank, owner: this, x: c.x, y: c.y, r, t: rk(a.life, rank), slow: rk(a.slow, rank), stunAfter: rk(a.stunAfter, rank), stun: rk(a.stun, rank), inside: new Map(), decal: null, pulls: new Map() }));
      return;
    }
    if (k === 'ult' && a.v === 'puddle') return this.startPuddle(a, rank);
  },

  // F (branch): golden ink shield on Julio or an ally + heal; if the ink is destroyed before it times out it explodes and marks the enemies around
  inkShield(a, rank) {
    const w = this.w, cp = this.castPoint; this.castPoint = null;
    let t = this;
    if (cp) { const al = w.fighters.filter(q => q.alive && q.isChamp && q.team === this.team && Math.hypot(q.x - this.x, q.y - this.y) <= a.range + 80).sort((p, q) => Math.hypot(p.x - cp.x, p.y - cp.y) - Math.hypot(q.x - cp.x, q.y - cp.y))[0]; if (al && Math.hypot(al.x - cp.x, al.y - cp.y) < 220) t = al; }
    t.shieldHp = Math.max(t.shieldHp, rk(a.shield, rank) + this.ap * a.apShield); t.shieldT = rk(a.time, rank); t.shieldMaxT = 0;
    t.inkSh = { rank, owner: this, r: a.boomR, dmg: rk(a.dmg, rank) + this.ap * a.apScale };
    const h = Math.min(t.maxHp - t.hp, (rk(a.heal, rank) + this.ap * a.apHeal) * (t.healMult || 1)); if (h > 0) { t.hp += h; w.float(t.x, t.y - t.def.height - 12, `+${Math.round(h)}`, '#5dff8a'); }
    w.markSrc(t, 'shield'); w.vfx('shield', t.x, t.cy, { scale: 2.8, tint: GOLD, alpha: 0.8 }); w.float(t.x, t.y - t.def.height - 34, `Escudo ${Math.round(t.shieldHp)}`, '#ffd23f');
  },

  // R (branch): Julio becomes an ink puddle: untargetable, faster, damages the enemies he slides through, can still cast
  startPuddle(a, rank) {
    const w = this.w;
    this.puddle = { t: rk(a.time, rank), dmg: rk(a.dmg, rank) + this.ap * a.apScale, r: a.radius, hit: new Map(), a };
    this.speedBoost = rk(a.speed, rank); this.speedT = this.puddle.t; this.cds.ult = Math.max(this.cds.ult, 1);
    w.vfx('poison_hit', this.x, this.y - 10, { scale: 4, tint: GOLD, below: true }); w.float(this.x, this.y - this.def.height - 34, '¡Charco viviente!', '#ffd23f');
  },
  endPuddle() {
    if (!this.puddle) return; this.puddle = null; this.speedT = Math.min(this.speedT, 0.01);
    this.w.vfx('poison_hit', this.x, this.y - 10, { scale: 3.4, tint: GOLD, below: true });
    if (this.state === 'idle' && this.w.anims.exists('julio_puddle_out')) this.startAction('puddle_out', 0, 0.5, null);
    else this.playAnim('idle');
  },

  // per-frame: burst bullets, free-ink dash trail, puddle contact damage, shield state cleanup
  julioTick(dt) {
    const w = this.w;
    if (this.inkSh && this.shieldHp <= 0) this.inkSh = null;
    if (!this.alive) { this.burst = null; this.inkFree = null; if (this.puddle) this.puddle = null; return; }
    if (this.burst) {
      const b = this.burst; b.t -= dt; b.tick -= dt;
      while (b.tick <= 0 && b.t > -b.rate) {
        b.tick += b.rate; const sp = (Math.random() - 0.5) * 0.08, c = Math.cos(sp), s = Math.sin(sp), dx = b.ax * c - b.ay * s, dy = b.ax * s + b.ay * c;
        w.castCtx = { f: this, k: 'p1' };
        w.projectile(this, { from: { x: this.x + dx * 40, y: this.y + dy * 40 }, dir: { x: dx, y: dy }, lift: this.puddle ? 12 : this.def.height * 0.55, range: b.range, speed: b.speed, dmg: b.dmg, type: 'magic', obj: 'ink_gold_drop', vfx: 'energy_bolt', tint: GOLD, face: true, scale: 0.04, r: 10 });
        w.castCtx = null;
        if (b.tick > 0) break;
      }
      if (this.burst && this.state === 'idle' && this.hasAnims && !this.puddle && (!this.spr.anims.isPlaying || this.curName !== 'attack2')) this.playAnim('attack2', 0.32);   // keeps the firing pose cycling while the burst lasts
      if (b.t <= 0) { this.burst = null; if (this.state === 'idle') this.playAnim('idle'); }
    }
    const f = this.inkFree;
    if (f) {
      f.t -= dt;
      if (this.stunT > 0 || f.t <= 0) this.inkFree = null;
      else {
        w.enemiesOf(this).forEach(t => { if (Math.hypot(t.x - this.x, t.y - this.y) < 62 && w.gameT - (f.hit.get(t) ?? -9) > 0.7) { f.hit.set(t, w.gameT); w.castCtx = { f: this, k: 'p2' }; w.damage(this, t, f.dmg, 'magic'); w.applyInk(this, t); w.castCtx = null; } });
        if (Math.hypot(this.x - f.lx, this.y - f.ly) > 70) { w.inkTrail([{ x: f.lx, y: f.ly }, { x: this.x, y: this.y }], 34, 2.2, 1); f.lx = this.x; f.ly = this.y; }
      }
    }
    const p = this.puddle;
    if (p) {
      p.t -= dt;
      if (this.stunT > 0) { /* stays a puddle */ }
      w.enemiesNear(this.team, this.x, this.y, p.r).forEach(t => { if (t.isTower || w.gameT - (p.hit.get(t) ?? -9) < 0.8) return; p.hit.set(t, w.gameT); w.castCtx = { f: this, k: 'ult' }; w.damage(this, t, p.dmg, 'magic'); w.applyInk(this, t); w.castCtx = null; w.vfx('poison_hit', t.x, t.cy, { scale: 2.6, tint: GOLD }); });
      if (Math.random() < 0.35) w.vfx('poison_hit', this.x + (Math.random() - 0.5) * 40, this.y - 6, { scale: 1.6, tint: 0x6a3cff, below: true, alpha: 0.7 });
      if (p.t <= 0) this.endPuddle();
    }
  },
};
