import Phaser from 'phaser';
import { net as conn } from './net.js';
import { Fighter } from './fighter.js';
import { ABILITY_KEYS } from './data.js';

// Online match, host-authoritative. Every room member runs the same Arena:
//  host   : simulates everything (AI, waves, damage, rewards, shop) and applies the inputs of remote players.
//  client : renders. It sends its own inputs / casts / shop requests to the host and receives
//           snapshots (state of every unit, ~15 Hz) plus events (casts, hits, deaths) that it replays visually.
// Messages travel through the server's `relay` channel: {k:'in'|'cast'|'op'} client->host, {k:'snap'|'ev'} host->clients.
const SNAP = 1 / 15, INP = 1 / 30;
const r1 = v => Math.round(v), r2 = v => Math.round(v * 100) / 100;
const TYPES = ['physical', 'magic', 'true'];

export class NetGame {
  constructor(w, role, hostId) {
    this.w = w; this.role = role; this.hostId = hostId; this.live = false; this.replaying = false;
    this.snapDt = (w.cfg.roster || []).filter(r => r.pid != null).length >= 7 ? 1 / 10 : SNAP;   // big rooms: fewer, compressed snapshots (the client keeps simulating between them)
    this.ev = []; this.snapT = 0; this.inT = 0; this.atkT = 0; this.clock = 0; this.remote = new Map(); this.mortarImgs = [];
    for (const f of w.champs) if (f.pid != null && f.pid !== conn.user.id && role === 'host') this.remote.set(f.pid, { f, in: { mx: 0, my: 0, run: false }, ax: f.ax, ay: f.ay, atk: 0, at: 0 });
    this.off = conn.on(m => this.onMsg(m));
  }
  destroy() { this.off?.(); this.mortarImgs.forEach(i => i.destroy()); }
  send(to, data) { conn.send('relay', { to, data }); }
  fighter(nid) { return this.w.byNid.get(nid); }

  /* ---------- messages ---------- */
  onMsg(m) {
    if (m.t === 'go') { this.live = true; return; }
    if (m.t === 'room') return this.onRoom(m);
    if (m.t === '_offline' && this.role === 'client') return this.hostLost();
    if (m.t !== 'relay' || !m.data) return;
    if (this.role === 'host') this.onClientData(m.from, m.data); else if (m.from === this.hostId) this.onHostData(m.data);
  }
  onRoom(m) {
    const ps = m.players || [];
    if (this.role === 'host') {   // a player who left is replaced by the AI
      for (const [pid, r] of this.remote) { const p = ps.find(x => x.id === pid); if (!p || p.connected === false) { r.f.ai = true; r.f.in = { mx: 0, my: 0, run: false }; this.remote.delete(pid); this.w.float(r.f.x, r.f.y - 120, 'jugador desconectado', '#ff9a7a'); } }
    } else { const h = ps.find(x => x.id === this.hostId); if (!h || h.connected === false) this.hostLost(); }
  }
  hostLost() {
    const w = this.w; if (this.lost || w.over) return; this.lost = true;
    w.showBanner({ title: 'EL ANFITRIÓN SE DESCONECTÓ', sub: 'Volviendo al launcher...', team: 2 }, 3500);
    w.time.delayedCall(3500, () => w.scene.get('hud')?.leave());
  }

  /* ======================= HOST ======================= */
  onClientData(from, d) {
    const r = this.remote.get(from); if (!r) return; const f = r.f, w = this.w;
    if (d.k === 'in') { r.in = { mx: d.mx, my: d.my, run: !!d.run }; r.ax = d.ax; r.ay = d.ay; r.at = this.clock; r.atk = d.atk ? this.clock + 0.12 : 0; }
    else if (d.k === 'cast') { const c = w.control; if (c?.mode === 'remote' && c.target === f) return; const a = this.actor(r); if (!a.alive) return; a.setAim(d.ax, d.ay); a.castPoint = d.cp ? { x: d.cp[0], y: d.cp[1] } : null; if (!a.tryCast(d.c)) a.castPoint = null; }
    else if (d.k === 'op') {
      if (['buy', 'sell'].includes(d.op) && !w.canShop(f)) return;   // the shop only works in the base
      if (d.op === 'buy') f.buyItem(d.a); else if (d.op === 'sell') f.sellItem(d.a); else if (d.op === 'use') f.useItem(d.a); else if (d.op === 'spend') f.spend(d.a);
    }
  }
  // the unit a remote player is driving: his own champion, or the enemy he is mind-controlling with Luis' ultimate
  actor(r) { const c = this.w.control; return c && c.mode === 'remote' && c.luis === r.f && c.target.alive ? c.target : r.f; }
  pre(dt) {
    this.clock += dt;
    if (this.role !== 'host') return;
    const ctl = this.w.control;
    for (const r of this.remote.values()) {
      if (ctl?.mode === 'remote' && ctl.target === r.f) { r.f.in = { mx: 0, my: 0, run: false }; continue; }   // being mind-controlled: its own player cannot move it
      if (ctl?.mode === 'remote' && ctl.luis === r.f) r.f.in = { mx: 0, my: 0, run: false };
      const f = this.actor(r); if (!f.alive || f.charmT > 0) continue;
      const stale = this.clock - r.at > 1;
      f.in = stale ? { mx: 0, my: 0, run: false } : r.in;
      if (f.state !== 'cast') f.setAim(r.ax, r.ay);
      if (r.atk > this.clock && f.free) f.tryBasic();
    }
  }
  post(dt) {
    if (this.role === 'host') { this.snapT += dt; if (this.snapT >= this.snapDt) { this.snapT = 0; this.flush(); this.sendSnap(); } }
    else this.sendInput(dt);
  }
  sendCast(f, k) { this.ev.push(['c', f.nid, k, r2(f.ax), r2(f.ay), f.castPoint ? r1(f.castPoint.x) : null, f.castPoint ? r1(f.castPoint.y) : null]); }
  sendBasic(f) { this.ev.push(['b', f.nid, r2(f.ax), r2(f.ay)]); }
  onDmg(src, t, dmg, type, dot) { if (this.role === 'host' && !dot) this.ev.push(['d', t.nid, r1(dmg), Math.max(0, TYPES.indexOf(type)), t.isNexus ? 2 : t.isTower ? 1 : 0]); }
  onDie(v, killer) { if (this.role === 'host') this.ev.push(['k', v.nid, killer?.nid ?? -1]); }
  onWave(n) { if (this.role === 'host') this.ev.push(['w', n]); }
  onRewind(lines, dur, owner, back) { if (this.role === 'host') this.ev.push(['r', r2(dur), owner.nid, back, lines.map(l => [l.team, l.pts.filter((p, i) => i % 3 === 0 || i === l.pts.length - 1).flat()])]); }
  onShell(sx, sy, tx, ty) { if (this.role === 'host') this.ev.push(['s', r1(sx), r1(sy), r1(tx), r1(ty)]); }
  flush() { if (this.ev.length) { this.send(null, { k: 'ev', l: this.ev }); this.ev = []; } }

  packF(f) {
    const o = { i: f.nid, x: r1(f.x), y: r1(f.y), h: r1(f.hp), ax: r2(f.ax), ay: r2(f.ay) };
    if (!f.alive) o.a = 0;
    if (f.nid >= 1000) { o.k = f.key; o.t = f.baseTeam; if (f.owner) o.o = f.owner.nid; if (f.antivirus) o.av = 1; }
    const v = f.in; if (v && (v.mx || v.my)) o.v = [r2(v.mx), r2(v.my), v.run ? 1 : 0];
    if (f.team !== f.baseTeam) o.tm = f.team;
    if (f.stunT > 0) o.st = r2(f.stunT); if (f.silenceT > 0) o.sl = r2(f.silenceT); if (f.blindT > 0) o.bl = r2(f.blindT); if (f.charmT > 0) o.ch = r2(f.charmT);
    if (f.shieldHp > 0) o.sd = [r1(f.shieldHp), r2(f.shieldT)]; if (f.speedT > 0) o.sp = [r2(f.speedBoost), r2(f.speedT)];
    if (f.slows.length) o.sw = f.slows.map(s => [r2(s.pct), r2(s.t)]);
    if (f.poisons.length) o.pn = r2(Math.max(...f.poisons.map(p => p.t)));
    if (f.invis) o.iv = f.invis.t === Infinity ? -1 : r2(f.invis.t); if (f.ink) o.ik = r2(f.ink.t); if (f.away) o.aw = 1;
    if (this.w.control?.mode === 'remote' && this.w.control.target === f) o.ch = r2(this.w.control.t);   // shows 'controlled' on that player's screen
    if (f.recall) o.rc = r2(f.recall.t); if (f.protein) o.pr = r2(f.protein.t);
    if (f.isChamp) {
      o.m = r1(f.mana); o.lv = f.level; o.xp = r1(f.xp); o.gd = r1(f.gold); o.pt = f.points;
      o.rk = ABILITY_KEYS.map(a => f.ranks[a]); o.cd = [...ABILITY_KEYS.map(a => r2(f.cds[a])), r2(f.cds.basic)];
      o.inv = f.inv.map(s => (s ? [s.id, r1(s.cd), s.charges] : 0)); o.dc = f.dashCharges; o.ss = f.setupStacks; o.rg = r1(f.rage);
      if (f.potions.length) o.po = f.potions.map(p => r2(p.t));
      if (f.hen) o.hen = [r1(f.henHp), r1(f.henMax)];
      if (f.skin !== f.key) o.sk = f.skin;
      if (f.buff) o.bf = [f.buff.t === Infinity ? -1 : r1(f.buff.t), f.buff.hpMult, f.buff.atkMult, f.buff.cdSpeed];
      const pk = Object.entries(f.pkBuffs || {}); if (pk.length) o.pk = pk.map(([k, b]) => [k, r2(b.t), b.m, b.T]);
    }
    return o;
  }
  sendSnap() {
    const w = this.w;
    const c = w.control;
    this.send(null, { k: 'snap', f: w.fighters.map(f => this.packF(f)), m: w.mortars.map(m => [r1(m.x), r1(m.y)]), g: r1(w.gameT), ctl: c ? [c.luis.nid, c.target.nid, r2(c.t)] : 0 });
  }

  /* ======================= CLIENT ======================= */
  clientBasic(f) { if (f !== this.w.pc) return false; this.atkT = 0.12; return true; }
  clientCast(f, k) {
    if (f !== this.w.pc) return false;
    const cp = f.castPoint; f.castPoint = null;
    this.send(this.hostId, { k: 'cast', c: k, ax: r2(f.ax), ay: r2(f.ay), cp: cp ? [r1(cp.x), r1(cp.y)] : null }); return true;
  }
  op(op, a) { this.send(this.hostId, { k: 'op', op, a }); return true; }
  sendInput(dt) {
    this.atkT -= dt; this.inT += dt; if (this.inT < INP) return; this.inT = 0;
    const p = this.w.pc, i = p.in || { mx: 0, my: 0, run: false };
    this.send(this.hostId, { k: 'in', mx: r2(i.mx), my: r2(i.my), run: i.run ? 1 : 0, ax: r2(p.ax), ay: r2(p.ay), atk: this.atkT > 0 ? 1 : 0 });
  }
  onHostData(d) {
    if (!this.live) return;
    if (d.k === 'snap') this.applySnap(d); else if (d.k === 'ev') d.l.forEach(e => this.applyEvent(e));
  }

  spawnFor(o) {
    if (o.k == null) return null; const w = this.w;
    const f = new Fighter(w, o.k, o.t, o.x, o.y, { nid: o.i, owner: o.o != null ? w.byNid.get(o.o) : null, life: Infinity, antivirus: !!o.av });
    w.fighters.push(f); if (f.isBot) w.vfx('summon', f.x, f.y - 10, { scale: 2.2, below: true });
    return f;
  }
  applySnap(s) {
    const w = this.w, seen = new Set();
    for (const o of s.f) { let f = w.byNid.get(o.i); if (!f) f = this.spawnFor(o); if (!f) continue; seen.add(o.i); this.unpack(f, o); }
    for (const f of w.fighters) if (f.nid >= 1000 && !seen.has(f.nid) && f.alive && !f.dispose) f.dispose = true;   // vanished on the host (expired summon, ...)
    // Luis' mind control: the controller's camera and HUD follow the controlled champion
    if (s.ctl) { const L = w.byNid.get(s.ctl[0]), T = w.byNid.get(s.ctl[1]); if (L && T) { const mine = L === w.player; w.control = { luis: L, target: T, t: s.ctl[2], mode: mine ? 'ctrl' : 'view' }; w.ctrl = mine ? T : null; } }
    else if (w.control) { w.control = null; w.ctrl = null; w.cancelAim(); }
    // mortars (item): the host owns them, we only draw them
    s.m.forEach((m, i) => { let im = this.mortarImgs[i]; if (!im) { im = this.mortarImgs[i] = w.add.image(0, 0, 'item_mortero_portatil').setOrigin(0.5, 0.9); im.setScale(70 / Math.max(im.width, im.height)); } im.setPosition(m[0], m[1]).setDepth(m[1]); });
    while (this.mortarImgs.length > s.m.length) this.mortarImgs.pop().destroy();
  }
  unpack(f, o) {
    const w = this.w, local = f === w.player, first = !f.netSeen; f.netSeen = true;
    if (o.a === 0) { if (f.alive) { f.alive = false; f.state = 'dead'; f.pending = null; f.playAnim('death', 0.9); } }
    else if (!f.alive && f.isChamp) { f.x = o.x; f.y = o.y; f.reset(); f.playAnim('idle'); f.netSeen = true; }
    if (f.alive) {
      const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy);
      if (first || d > (local ? 160 : 220)) { f.x = o.x; f.y = o.y; } else if (!local) { f.x += dx * 0.35; f.y += dy * 0.35; }
    }
    if (!local) { if (f.state !== 'cast') { f.ax = o.ax; f.ay = o.ay; } f.in = o.v ? { mx: o.v[0], my: o.v[1], run: !!o.v[2], analog: true } : { mx: 0, my: 0, run: false }; }
    // statuses
    const stun = o.st || 0; if (stun > 0 && f.stunT <= 0) { f.state = 'stun'; f.pending = null; } f.stunT = stun; if (stun <= 0 && f.state === 'stun') { f.state = 'idle'; f.playAnim('idle'); }
    f.silenceT = o.sl || 0; f.blindT = o.bl || 0; f.charmT = o.ch || 0; f.team = o.tm ?? f.baseTeam;
    f.shieldHp = o.sd ? o.sd[0] : 0; f.shieldT = o.sd ? o.sd[1] : 0; f.speedBoost = o.sp ? o.sp[0] : 0; f.speedT = o.sp ? o.sp[1] : 0;
    f.slows = (o.sw || []).map(a => ({ pct: a[0], t: a[1] }));
    f.poisons = o.pn ? [{ dps: 0, t: o.pn, tick: 0, src: f }] : [];
    const ivT = o.iv < 0 ? Infinity : o.iv; f.invis = o.iv != null ? (f.invis ? Object.assign(f.invis, { t: ivT }) : { t: ivT, trail: 0.15 }) : null;   // keep the trail timer: resetting it every snapshot meant Luis' silhouettes never appeared f.ink = o.ik ? { t: o.ik, src: null } : null; f.away = !!o.aw;
    f.recall = o.rc != null ? { t: o.rc } : null; f.protein = o.pr != null ? { t: o.pr, tick: 0, hps: 0 } : null;
    if (f.isChamp) {
      if (!first && o.lv > f.level) { w.audio.play('levelup', { at: f, vol: local ? 1 : 0.5, gap: 0 }); w.vfx('levelup', f.x, f.y - 20, { scale: 3.2 }); w.float(f.x, f.y - f.def.height - 30, `NIVEL ${o.lv}`, '#ffe066'); }
      f.level = o.lv; f.xp = o.xp; f.gold = o.gd; f.points = o.pt;
      ABILITY_KEYS.forEach((a, i) => { f.ranks[a] = o.rk[i]; f.cds[a] = o.cd[i]; }); f.cds.basic = o.cd[4];
      const sig = JSON.stringify(o.inv); if (sig !== f.invSig) { f.invSig = sig; f.inv = o.inv.map(a => (a ? { id: a[0], cd: a[1], charges: a[2] } : null)); f.recomputeItems(); }
      else f.inv.forEach((sl, i) => { if (sl) sl.cd = o.inv[i][1]; });
      f.dashCharges = o.dc; f.setupStacks = o.ss; f.rage = o.rg; f.potions = (o.po || []).map(t => ({ hp: 0, mana: 0, t, T: t }));
      if (o.hen) { f.hen = true; f.henHp = o.hen[0]; f.henMax = o.hen[1]; } else f.hen = false;
      f.buff = o.bf ? { t: o.bf[0] < 0 ? Infinity : o.bf[0] + 0.5, hpMult: o.bf[1], atkMult: o.bf[2], cdSpeed: o.bf[3] } : null;
      f.pkBuffs = Object.fromEntries((o.pk || []).map(([k, t, m, T]) => [k, { t: t + 0.3, m, T }]));
      const sk = o.sk || f.key; if (f.skin !== sk) f.setSkin(sk);
      f.mana = o.m;
    }
    if (f.alive) f.hp = o.h;   // last: item / buff changes above must not touch the authoritative value
  }

  // run a cast / basic attack on a unit just for its animation, projectiles and effects (damage is ignored on clients)
  replay(f, fn) {
    this.replaying = true;
    const sv = { sil: f.silenceT, ch: f.charmT, st: f.stunT, mana: f.mana, dc: f.dashCharges };
    f.silenceT = 0; f.charmT = 0; f.stunT = 0; f.mana = f.maxMana || 999; if (f.state === 'cast') { f.state = 'idle'; f.pending = null; }
    try { fn(); } finally { f.silenceT = sv.sil; f.charmT = sv.ch; f.stunT = sv.st; f.mana = sv.mana; f.dashCharges = sv.dc; this.replaying = false; }
  }
  applyEvent(e) {
    const w = this.w;
    if (e[0] === 'c') {
      const f = this.fighter(e[1]); if (!f || !f.alive) return; const k = e[2];
      f.ax = e[3]; f.ay = e[4]; f.castPoint = e[5] == null ? null : { x: e[5], y: e[6] };
      if (!f.ranks[k]) f.ranks[k] = 1; f.cds[k] = 0; if (f.key === 'jorbi') f.dashCharges = Math.max(1, f.dashCharges);
      this.replay(f, () => f._tryCast(k)); f.castPoint = null;
    } else if (e[0] === 'b') {
      const f = this.fighter(e[1]); if (!f || !f.alive) return;
      if (f !== w.pc && !w.inView(f.x, f.y, 450)) return;   // basic attacks far from the camera are not replayed (nobody sees them)
      f.ax = e[2]; f.ay = e[3]; f.cds.basic = 0; this.replay(f, () => f._tryBasic());
    } else if (e[0] === 'd') {
      const t = this.fighter(e[1]); if (!t) return; const dmg = e[2], type = TYPES[e[3]];
      if (!w.inView(t.x, t.y, 200)) return;
      w.audio.play(e[4] === 2 ? 'hit_heavy' : e[4] === 1 ? 'hit_metal' : type === 'physical' ? 'hit_flesh' : 'debuff', { at: t, vol: e[4] ? 0.5 : 0.55, gap: 90 });
      if (!e[4]) t.flash();
      w.float(t.x + Phaser.Math.Between(-15, 15), t.y - t.def.height - 5, `${dmg}`, type === 'magic' ? '#c77dff' : type === 'physical' ? '#ffffff' : '#9be37a');
    } else if (e[0] === 'k') {
      const v = this.fighter(e[1]); if (!v || !v.alive) return;
      v.hp = 0; v.die(e[2] >= 0 ? this.fighter(e[2]) : null);
    } else if (e[0] === 'w') {
      if (e[1] === 0) w.audio.voice('v_minions', 1, 'ann_minions', { title: '¡MINIONS DESPLEGADOS!', sub: 'La primera oleada avanza por el carril', team: 2 });
      w.audio.play('minion_yell', { at: { x: 260, y: w.laneY }, vol: 0.5, gap: 200 });
    } else if (e[0] === 'r') {   // Jorbi's rewind trails
      w.announceRewind(this.fighter(e[2]) || w.player, e[3], e[1]);
      w.showRewind(e[4].map(([team, flat]) => ({ team, pts: Array.from({ length: flat.length / 2 }, (_, i) => [flat[i * 2], flat[i * 2 + 1]]) })), e[1]);
    } else if (e[0] === 's') {
      const [, sx, sy, tx, ty] = e, shell = w.add.circle(sx, sy, 7, 0x333333).setDepth(100000);
      w.tweens.add({ targets: shell, x: tx, y: { value: ty - 8, ease: 'Sine.In' }, scale: 1.8, duration: 800, onComplete: () => { shell.destroy(); w.vfx('shockwave', tx, ty, { scale: 3, below: true }); w.vfx('spark', tx, ty - 20, { scale: 4, tint: 0xffb020 }); w.audio.play('explosion', { at: { x: tx, y: ty }, vol: 0.8, gap: 60 }); } });
      w.audio.play('cannon', { at: { x: sx, y: sy }, vol: 0.5, gap: 100 });
    }
  }
}
