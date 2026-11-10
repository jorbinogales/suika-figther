import Phaser from 'phaser';
import { net as conn } from './net.js';
import { Fighter } from './fighter.js';
import { ABILITY_KEYS, rk } from './data.js';
import { PERM_KEYS } from './items.js';

// Online match, host-authoritative. Every room member runs the same Arena:
//  host   : simulates everything (AI, waves, damage, rewards, shop) and applies the inputs of remote players.
//  client : renders. It sends its own inputs / casts / shop requests to the host and receives
//           snapshots (state of every unit, ~15 Hz) plus events (casts, hits, deaths) that it replays visually.
// Messages travel through the server's `relay` channel: {k:'in'|'cast'|'op'|'kf'} client->host, {k:'snap'|'ev'} host->clients.
// Snapshots are deltas against the previous one (a keyframe every second, or when a client asks for one with 'kf');
// remote units are drawn ~50 ms in the past, interpolated between two snapshots; our own champion is predicted and
// reconciled with the host through the sequence number of our inputs (o.q = the last input the host applied).
const SNAP = 1 / 60, SNAP_P = 1 / 30, INP = 1 / 60, KF_MS = 1000;   // server host: 60 snapshots/s; a player's browser hosting: 30 (his upload)
const r1 = v => Math.round(v), r2 = v => Math.round(v * 100) / 100;
const TYPES = ['physical', 'magic', 'true'];
const BPH = ['', 'arrive', 'board', 'fly', 'land', 'leave'];   // Yonaiker's ship phases as sent in snapshots (o.bm = [phase, total time, elapsed])
const TOP = ['m', 'g', 'ld', 'ctl', 'cp', 'wv', 'tr', 'sn'];   // snapshot fields besides the units: sent only when they change
const STILL = { mx: 0, my: 0, run: false }, NONE = {};
const JUMP = 220, DEAD = 3;   // px: a step between two snapshots longer than JUMP is a teleport (no sliding); own errors below DEAD are ignored

export class NetGame {
  constructor(w, role, hostId) {
    this.w = w; this.role = role; this.hostId = hostId; this.live = !!w.cfg.rejoin; this.hostGone = 0;   // rejoining a running match: no waiting for 'go'
    this.replaying = false;
    this.snapDt = w.bot ? SNAP : (w.cfg.roster || []).filter(r => r.pid != null).length >= 7 ? 1 / 12 : SNAP_P;   // a player's browser hosting a big room: fewer snapshots (his upload)
    this.ev = []; this.pred = []; this.snapT = 0; this.inT = 0; this.atkT = 0; this.clock = 0; this.remote = new Map(); this.mortarImgs = [];
    this.sn = 0; this.seq = 0; this.sent = []; this.hist = []; this.fix = { x: 0, y: 0 }; this.offs = []; this.delay = 60; this.moveHold = 0;
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
    if (m.t === '_offline') { this.w.netLost = true; return; }   // our own connection dropped: the match goes on, conn.js keeps retrying
    if (m.t === '_online') { this.w.netLost = false; return; }
    if (m.t !== 'relay' || !m.data) return;
    if (this.role === 'host') this.onClientData(m.from, m.data); else if (m.from === this.hostId) this.onHostData(m.data);
  }
  onRoom(m) {
    const ps = m.players || [];
    if (this.role === 'host') {   // a player that drops is played by the AI until he is back; one that left the room for good is replaced for good
      for (const [pid, r] of this.remote) {
        const p = ps.find(x => x.id === pid);
        if (!p) { r.f.ai = true; r.f.in = { mx: 0, my: 0, run: false }; this.remote.delete(pid); this.w.float(r.f.x, r.f.y - 120, 'jugador desconectado', '#ff9a7a'); }
        else if (p.connected === false && !r.off) { r.off = true; r.f.ai = true; r.f.in = { mx: 0, my: 0, run: false }; this.w.float(r.f.x, r.f.y - 120, 'jugador desconectado', '#ff9a7a'); }
        else if (p.connected !== false && r.off) { r.off = false; r.f.ai = false; r.at = this.clock; this.w.float(r.f.x, r.f.y - 120, 'jugador reconectado', '#7dff9a'); }
      }
    } else {   // the host is a player, or the server's headless host (not in the player list: its state comes as hostUp)
      const h = ps.find(x => x.id === this.hostId) || (m.host === this.hostId && m.hostUp != null ? { connected: m.hostUp } : null);
      if (!h) this.hostLost(); else if (h.connected === false) this.hostGone = this.hostGone || performance.now(); else this.hostGone = 0;
    }
  }
  hostLost() {
    const w = this.w; if (this.lost || w.over) return; this.lost = true;
    w.showBanner({ title: 'EL ANFITRIÓN SE DESCONECTÓ', sub: 'Volviendo al launcher...', team: 2 }, 3500);
    w.time.delayedCall(3500, () => w.scene.get('hud')?.leave());
  }

  /* ======================= HOST ======================= */
  onClientData(from, d) {
    const r = this.remote.get(from); if (!r) return; const f = r.f, w = this.w;
    if (d.k === 'kf') { this.wantKf = true; return; }   // a client without a base (rejoin, reconnection): the next snapshot is a keyframe
    if (r.off) return; if (d.k === 'in') {
      let v = d, atk = !!d.atk;
      if (Array.isArray(d.i) && Array.isArray(d.i[0])) {   // [current, previous, the one before]: only the entries newer than the last applied count (a q below it = the player reloaded)
        const n = d.q > r.q ? Math.min(d.i.length, d.q - r.q) : d.i.length, e = d.i[0];
        atk = d.i.slice(0, n).some(x => x?.[3]); v = { mx: +e[0] || 0, my: +e[1] || 0, run: e[2] }; r.q = +d.q || 0;
      }
      r.in = { mx: v.mx, my: v.my, run: !!v.run }; r.ax = d.ax; r.ay = d.ay; r.at = this.clock; r.atk = atk ? this.clock + 0.12 : 0; r.bp = Array.isArray(d.bp) ? d.bp : null;
    }
    else if (d.k === 'cast') { if (w.control?.target === f) return; const a = this.actor(r); if (!a.alive) return; a.setAim(d.ax, d.ay); a.castPoint = d.cp ? { x: d.cp[0], y: d.cp[1] } : null; if (!a.tryCast(d.c)) a.castPoint = null; }   // a mind-controlled champion ignores its own player
    else if (d.k === 'op') {
      if (['buy', 'sell', 'perm'].includes(d.op) && !w.canShop(f)) return;   // the shop only works in the base
      if (d.op === 'recall') { f.startRecall(); return; }
      if (d.op === 'use') { if (w.control?.target !== f) this.actor(r).useItem(d.a); return; }   // items: those of the champion being driven (like offline)
      if (d.op === 'perm') f.buyPerm(d.a); else if (d.op === 'buy') f.buyItem(d.a); else if (d.op === 'sell') f.sellItem(d.a); else if (d.op === 'spend') { const [kk, bb] = String(d.a).split(':'); f.spend(kk, bb ? 1 : 0); }
    }
  }
  // the unit a remote player is driving: his own champion, or the enemy he is mind-controlling with Luis' ultimate
  actor(r) { const c = this.w.control; return c && c.mode === 'remote' && c.luis === r.f && c.target.alive ? c.target : r.f; }
  pre(dt) {
    this.clock += dt;
    if (this.role === 'host') { const n = performance.now(), ft = this.lastPre ? n - this.lastPre : 0; this.lastPre = n; this.ftSum = (this.ftSum || 0) + ft; this.ftN = (this.ftN || 0) + 1; this.ftMax = Math.max(this.ftMax || 0, ft); }   // real host frame time -> load shown in every player's HUD
    if (this.role === 'client' && this.hostGone && performance.now() - this.hostGone > 45000) this.hostLost();   // the host has been gone for 45 s: give up
    if (this.role !== 'host') return;
    const ctl = this.w.control;
    if (ctl?.mode === 'remote') ctl.target.in = { mx: 0, my: 0, run: false };   // stands still unless Luis' entry below drives it (in any Map order)
    for (const r of this.remote.values()) {
      if (ctl?.target === r.f) continue;   // being mind-controlled: its own player cannot move it
      if (ctl?.mode === 'remote' && ctl.luis === r.f) r.f.in = { mx: 0, my: 0, run: false };
      if (r.off) continue;
      const f = this.actor(r); if (!f.alive || f.charmT > 0) continue;
      const stale = this.clock - r.at > 1;
      f.in = stale ? { mx: 0, my: 0, run: false } : r.in;
      if (f.state !== 'cast') f.setAim(r.ax, r.ay);
      if (r.atk > this.clock && f.free) f.tryBasic();
    }
  }
  post(dt) {
    if (this.role === 'host') {
      this.snapT += dt; if (this.snapT >= this.snapDt) { this.snapT = Math.min(this.snapT - this.snapDt, this.snapDt); this.sendSnap(); }   // carry the remainder: resetting to 0 turned 20 Hz into 15 Hz at 60 fps
      if (this.w.bot && this.w.over && this.w.over.t > 3 && !this.overSent) { this.overSent = true; conn.send('host_over'); }   // server host: the match is over, the server frees this page
    }
    else this.sendInput(dt);
  }
  sendCast(f, k) { this.ev.push(['c', f.nid, k, r2(f.ax), r2(f.ay), f.castPoint ? r1(f.castPoint.x) : null, f.castPoint ? r1(f.castPoint.y) : null]); }
  sendBasic(f) { this.ev.push(['b', f.nid, r2(f.ax), r2(f.ay), f.cstepN || 1]); }
  onDmg(src, t, dmg, type, dot) { if (this.role === 'host' && !dot) this.ev.push(['d', t.nid, r1(dmg), Math.max(0, TYPES.indexOf(type)), t.isNexus ? 2 : t.isTower ? 1 : 0]); }
  onDie(v, killer) { if (this.role === 'host') this.ev.push(['k', v.nid, killer?.nid ?? -1]); }
  onRecap(v, rc) { if (this.role === 'host') this.ev.push(['rc', v.nid, rc]); }
  onWave(n) { if (this.role === 'host') this.ev.push(['w', n]); }
  onRewind(lines, dur, owner, back) { if (this.role === 'host') this.ev.push(['r', r2(dur), owner.nid, back, lines.map(l => [l.team, l.pts.filter((p, i) => i % 3 === 0 || i === l.pts.length - 1).flat()])]); }
  onShip(i, team) { if (this.role === 'host') this.ev.push(['sh', i, team]); }
  onCamp() { if (this.role === 'host') this.ev.push(['cc']); }
  onShell(sx, sy, tx, ty) { if (this.role === 'host') this.ev.push(['s', r1(sx), r1(sy), r1(tx), r1(ty)]); }

  packF(f) {
    const o = { i: f.nid, x: r1(f.x), y: r1(f.y), h: r1(f.hp), ax: r2(f.ax), ay: r2(f.ay) };
    if (!f.alive) o.a = 0;
    if (f.nid >= 1000) { o.k = f.key; o.t = f.baseTeam; if (f.owner) o.o = f.owner.nid; if (f.hpMult && f.hpMult !== 1) o.hm = r2(f.hpMult); if (f.antivirus) o.av = 1; }
    const v = f.in; if (v && (v.mx || v.my)) o.v = [r2(v.mx), r2(v.my), v.run ? 1 : 0];
    if (f.pid != null) { const r = this.remote.get(f.pid); if (r?.q) o.q = r.q; }   // ack: the last input of that player already applied
    if (f.team !== f.baseTeam) o.tm = f.team;
    if (f.rootT > 0) o.rt = r2(f.rootT); if (f.stunT > 0) o.st = r2(f.stunT); if (f.silenceT > 0) o.sl = r2(f.silenceT); if (f.blindT > 0) o.bl = r2(f.blindT); if (f.charmT > 0) o.ch = r2(f.charmT);
    if (f.shieldHp > 0) o.sd = [r1(f.shieldHp), f.shieldT > 1e6 ? 1e7 : r2(f.shieldT)]; if (f.speedT > 0) o.sp = [r2(f.speedBoost), r2(f.speedT)];
    if (f.slows.length) o.sw = f.slows.map(s => [r2(s.pct), r2(s.t)]);
    if (f.poisons.length) o.pn = r2(Math.max(...f.poisons.map(p => p.t)));
    if (f.lure?.src) o.lr = [f.lure.src.nid, r2(f.lure.t)];   // Xeviche's heart: who the target walks to
    if (f.fist?.owner) o.fs = [f.fist.owner.nid, f.fist.n, r2(f.fist.t)];   // Junior's fist counter over the target
    if (f.key.startsWith('bot_')) { o.lf = [r1(f.life), r1(f.life0)]; if (f.enraged) o.en = 1; }   // Leandro's bots: time left and berserk state
    if (f.def.bot === 'crate') o.cb = [r1(f.life), r1(f.life0), r2(f.spawnT || 0), r2(f.spawnMax || 1), f.bugs?.length >= f.bugCap ? 1 : 0];   // Maduro's box: time left and time until the next bug (bars)
    if (f.def.bot === 'crate' || f.key === 'roach' || f.def.guard) { o.mh = r1(f.maxHp); if (f.bugK) o.bs = r2(f.bugK); }   // summons with upgraded health / size (Maduro)
    if (f.invis) o.iv = f.invis.t === Infinity ? -1 : r2(f.invis.t); if (f.ink) o.ik = r2(f.ink.t); if (f.away) o.aw = 1;
    if (this.w.control?.mode === 'remote' && this.w.control.target === f) o.ch = r2(this.w.control.t);   // shows 'controlled' on that player's screen
    if (f.recall) o.rc = r2(f.recall.t); if (f.recallFx) o.rf = [f.recallFx.phase === 'out' ? 1 : 2, r2(f.recallFx.t)]; if (f.protein) o.pr = r2(f.protein.t);
    if (f.isChamp) {
      o.kd = [f.kills, f.deaths, f.assists]; o.m = r1(f.mana); o.lv = f.level; o.xp = r1(f.xp); o.gd = r1(f.gold); o.pt = f.points;
      o.rk = ABILITY_KEYS.map(a => f.ranks[a]); o.cd = [...ABILITY_KEYS.map(a => r2(f.cds[a])), r2(f.cds.basic)];
      o.pm = PERM_KEYS.map(k => f.perm[k] || 0); o.ms = f.mshield > 0 ? 1 : 0; o.mt = f.moveT > 2 ? 1 : 0;
      o.inv = f.inv.map(s => (s ? [s.id, r1(s.cd), s.charges] : 0)); o.dc = f.dashCharges; o.ss = f.setupStacks; o.rg = r1(f.rage);
      if (f.potions.length) o.po = f.potions.map(p => r2(p.t));
      if (f.def.charge) o.cg = r1(f.charge); if (f.gun) o.gn = 1; if (f.sb) o.sb = r1(f.sb.t); if (f.bomber && !f.bomber.mirror) o.bm = [Math.max(0, BPH.indexOf(f.bomber.phase)), r1(f.bomber.T), r1(f.bomber.t)];   // Yonaiker: ship bar (only grows with hits) and machine gun switch
      if (f.hen) o.hen = [r1(f.henHp), r1(f.henMax)];
      if (f.def.alt) o.br = ABILITY_KEYS.map(a => f.branch[a] || 0); if (f.comb) o.cb = r1(f.comb.t); if (f.leakRe) o.lk = r1(f.leakRe.t);   // Leandro: branch choices, comb and leak windows
      if (f.skin !== f.key) o.sk = f.skin;
      if (f.buff) o.bf = [f.buff.t === Infinity ? -1 : r1(f.buff.t), f.buff.hpMult, f.buff.atkMult, f.buff.cdSpeed];
      const pk = Object.entries(f.pkBuffs || {}); if (pk.length) o.pk = pk.map(([k, b]) => [k, r2(b.t), b.m, b.T]);
    }
    return o;
  }
  sendSnap() {
    const w = this.w, c = w.control, ts = Math.round(performance.now());
    const l = this.ev.length ? this.ev : undefined; this.ev = [];   // the events since the last snapshot travel in it (one message per tick instead of two); applied before it
    if (!this.ld || ts - this.ldT >= 500) { this.ld = [r1((this.ftSum || 0) / Math.max(1, this.ftN || 1)), r1(this.ftMax || 0)]; this.ldT = ts; this.ftSum = this.ftN = this.ftMax = 0; }   // host frame time, every 0.5 s
    const top = { m: w.mortars.map(m => [r1(m.x), r1(m.y)]), g: r1(w.gameT), ld: this.ld, ctl: c ? [c.luis.nid, c.target.nid, r2(c.t)] : 0, cp: (w.camps || []).map(k => [k.owner ?? -1, r2(k.prog[0]), r2(k.prog[1]), k.contested ? 1 : 0, r1(k.spawnT)]), wv: r1(w.waveT), tr: (w.traps || []).map(q => [r1(q.x), r1(q.y), q.team, q.r, r1(q.t)]), sn: (w.sentinels || []).map(q => [r1(q.x), r1(q.y), q.team, q.r, r1(q.t)]) };
    const fs = w.fighters.map(f => this.packF(f)), P = this.prevF, cur = new Map(), msg = { k: 'snap', n: ++this.sn, ts, l }, tj = {};
    for (const k of TOP) tj[k] = JSON.stringify(top[k]);
    if (!P || this.wantKf || ts - this.kfT >= KF_MS) {   // keyframe: the whole state
      Object.assign(msg, top, { kf: 1, f: fs }); this.kfT = ts; this.wantKf = false;
      for (const o of fs) cur.set(o.i, { o, s: JSON.stringify(o), cdT: ts });
    } else {   // delta against the previous snapshot: changed fields only, x/y as an offset, removed fields in z, gone units in rm
      msg.f = [];
      for (const o of fs) {
        const p = P.get(o.i);
        if (!p) { msg.f.push(o); cur.set(o.i, { o, s: JSON.stringify(o), cdT: ts }); continue; }
        // cooldowns: every client counts them down itself; they travel only when they stop matching that count (cast, reset, cdr)
        if (o.cd && p.o.cd && o.cd.length === p.o.cd.length) { const e = (ts - p.cdT) / 1000; if (o.cd.every((v, k) => Math.abs(v - Math.max(0, p.o.cd[k] - e)) < 0.1)) o.cd = p.o.cd; }
        const s = JSON.stringify(o), cdT = o.cd === p.o.cd ? p.cdT : ts;
        if (s === p.s) { cur.set(o.i, p); continue; }
        const d = { i: o.i };
        for (const k in o) if (k !== 'i' && o[k] !== p.o[k] && (typeof o[k] !== 'object' || JSON.stringify(o[k]) !== JSON.stringify(p.o[k]))) d[k] = o[k];
        if ('x' in d || 'y' in d) { d.p = [o.x - p.o.x, o.y - p.o.y]; delete d.x; delete d.y; }
        const z = Object.keys(p.o).filter(k => !(k in o)); if (z.length) d.z = z;
        msg.f.push(d); cur.set(o.i, { o, s, cdT });
      }
      const rm = [...P.keys()].filter(i => !cur.has(i)); if (rm.length) msg.rm = rm;
      for (const k of TOP) if (tj[k] !== this.prevTop[k]) msg[k] = top[k];
    }
    this.prevF = cur; this.prevTop = tj;
    this.send(null, msg);
  }

  /* ======================= CLIENT ======================= */
  // client-side prediction: play our own basic / cast at once; the host's echo of it (same key, shortly after) is dropped in applyEvent
  predict(f, key, fn) {
    const ch = f.charmT; if (f === this.w.ctrl) f.charmT = 0;   // the 'controlled' mark of the champion we mind-control does not stop us
    this.replaying = true; let ok = false; try { ok = fn(); } finally { this.replaying = false; f.charmT = ch; }
    if (ok) this.pred.push({ key, t: this.clock });
    return ok;
  }
  echoed(f, key) {
    if (f !== this.w.pc) return false;
    this.pred = this.pred.filter(p => this.clock - p.t < 1.5);   // the host may have refused it: forget stale predictions
    const i = this.pred.findIndex(p => p.key === key); if (i < 0) return false;
    this.pred.splice(i, 1); return true;
  }
  clientBasic(f) { if (f !== this.w.pc) return false; this.atkT = 0.12; this.predict(f, 'b', () => f._tryBasic()); return true; }
  clientCast(f, k) {
    if (f !== this.w.pc) return false;
    const cp = f.castPoint;
    this.send(this.hostId, { k: 'cast', c: k, ax: r2(f.ax), ay: r2(f.ay), cp: cp ? [r1(cp.x), r1(cp.y)] : null });
    this.predict(f, k, () => f._tryCast(k)); f.castPoint = null; return true;
  }
  op(op, a) { this.send(this.hostId, { k: 'op', op, a }); return true; }
  // 60 Hz, numbered; the 2 previous inputs ride along (the host skips the ones it already applied). hist: where our prediction
  // stood after each input, to compare with the host once it acknowledges that input.
  sendInput(dt) {
    this.atkT -= dt; this.inT += dt; if (this.inT < INP) return; this.inT = Math.min(this.inT - INP, INP);
    const p = this.w.pc, i = p.in || STILL, q = ++this.seq;
    const B = p.bomber, bp = B?.phase === 'fly' ? [r1(B.pt.x), r1(B.pt.y), B.fire ? 1 : 0] : undefined;   // Yonaiker aboard: our reticle and trigger
    this.sent.unshift([r2(i.mx), r2(i.my), i.run ? 1 : 0, this.atkT > 0 ? 1 : 0]); if (this.sent.length > 3) this.sent.pop();
    this.hist.push({ q, x: p.x, y: p.y }); if (this.hist.length > 240) this.hist.shift();
    this.send(this.hostId, { k: 'in', q, i: this.sent, ax: r2(p.ax), ay: r2(p.ay), bp });
  }
  onHostData(d) {
    if (!this.live) return;
    if (d.k === 'snap') { d.l?.forEach(e => this.applyEvent(e)); const s = this.decode(d); if (s) this.applySnap(s); } else if (d.k === 'ev') d.l.forEach(e => this.applyEvent(e));
  }
  // delta snapshot -> full state on top of the last keyframe; null (and a keyframe request) while we have no base
  decode(s) {
    if (s.kf) { this.base = new Map(s.f.map(o => [o.i, o])); this.top = {}; for (const k of TOP) this.top[k] = s[k]; }
    else if (!this.base || s.n !== this.sn + 1) {
      this.base = null; const t = performance.now();
      if (t - (this.kfAsk || 0) > 300) { this.kfAsk = t; this.send(this.hostId, { k: 'kf' }); }
      return null;
    } else {
      for (const d of s.f) {
        const o = this.base.get(d.i); if (!o) { this.base.set(d.i, d); continue; }
        for (const k in d) if (k !== 'p' && k !== 'z') o[k] = d[k];
        if (d.p) { o.x += d.p[0]; o.y += d.p[1]; } if (d.z) for (const k of d.z) delete o[k];
      }
      if (s.rm) for (const i of s.rm) this.base.delete(i);
      for (const k of TOP) if (k in s) this.top[k] = s[k];
    }
    this.sn = s.n;
    return { ...this.top, ts: s.ts, f: [...this.base.values()], dm: s.kf ? null : new Map(s.f.map(d => [d.i, d])) };
  }
  // charmed / mind-controlled: the host moves our unit, we only show it (like a remote one). The enemy WE mind-control carries
  // that mark too (o.ch), but we drive it: predicted and reconciled like our own champion
  forced(p) { return p.charmT > 0 && p !== this.w.ctrl; }
  // our own unit vs the host, at the same input: the difference is how far our prediction is off. It is absorbed over the next
  // frames (smooth) and applied to the inputs still in flight too, which is the same as replaying them from the host's state.
  reconcile(s) {
    const w = this.w, pc = w.pc, F = this.fix, me = s.f.find(o => o.i === w.player.nid), o = pc === w.player ? me : s.f.find(x => x.i === pc.nid);
    if (pc !== this.histFor || !pc.alive || this.forced(pc) || !o) { this.hist = []; F.x = F.y = 0; this.histFor = pc; return; }
    const h = this.hist, q = me?.q; while (h.length > 1 && h[0].q < q) h.shift();
    const e = h[0];
    if (!e || e.q !== q) {   // no comparable input (the host is not applying ours: disconnected for it, ...): fall back to the host position if far off
      if (Math.hypot(o.x - pc.x - F.x, o.y - pc.y - F.y) > 160) { F.x = o.x - pc.x; F.y = o.y - pc.y; }
      return;
    }
    if (pc.dashV || pc.pullTo || pc.rw || pc.drop || this.clock < this.moveHold) return;   // our own dash / pull: both sides move fast, compare once it is over
    const ex = o.x - e.x - F.x, ey = o.y - e.y - F.y, d = Math.hypot(ex, ey);
    (this.rs ||= { n: 0, sum: 0, max: 0, fixes: 0 }); this.rs.n++; this.rs.sum += d; this.rs.max = Math.max(this.rs.max, d);   // stats (tools/netsync)
    if (d > 500) { const cx = F.x + ex, cy = F.y + ey; pc.x += cx; pc.y += cy; for (const k of h) { k.x += cx; k.y += cy; } F.x = F.y = 0; }   // a real teleport
    // tolerance while walking: one frame of our own movement. The host applies our input from its next frame (16 ms) while we
    // applied it for our whole frame, so the first ack of each input is off by up to that much and the next one by the opposite:
    // correcting it would make the champion shiver at low fps. Standing still: exact.
    const tol = pc.in?.mx || pc.in?.my ? Math.max(DEAD, pc.speed * Math.max(this.fdt || 0, 1 / 60) * 1.2) : 0.5;
    if (d > tol) { F.x += ex; F.y += ey; this.rs.fixes++; }
  }
  // every frame, after the simulation moved the units and before they are drawn
  smooth(dt) {
    if (this.role !== 'client') return;
    const w = this.w, pc = w.pc, F = this.fix, forced = this.forced(pc);
    if (dt > 0) this.fdt = this.fdt == null ? dt : this.fdt + (dt - this.fdt) * 0.1;   // our frame time (reconcile tolerance)
    if (pc.dashV || pc.pullTo || pc.rw) this.moveHold = this.clock + 0.2;
    if (F.x || F.y) {   // our reconciliation error, absorbed in ~0.1 s
      const k = 1 - Math.exp(-dt * 15), cx = Math.abs(F.x) < 0.1 ? F.x : F.x * k, cy = Math.abs(F.y) < 0.1 ? F.y : F.y * k;
      pc.x += cx; pc.y += cy; F.x -= cx; F.y -= cy; for (const h of this.hist) { h.x += cx; h.y += cy; }
    }
    if (this.clk == null) return;
    // render clock, in host time: real time, slewed gently toward (newest - delay) so it never jumps
    const want = performance.now() - this.clk - this.delay, adv = (this.rt ?? want) + dt * 1000;
    if (!Number.isFinite(want) || !Number.isFinite(dt)) { (this.bad ||= []).length < 5 && this.bad.push({ dt, clk: this.clk, delay: this.delay, rt: this.rt }); return; }
    this.rt = !(Math.abs(want - adv) <= 300) ? want : adv + (want - adv) * 0.08;   // !(<=): a NaN resyncs too
    const rt = this.rt, fade = Math.exp(-dt * 12);
    for (const f of w.fighters) {
      const b = f.nb; if (!b?.length || !f.alive || f.isTower || f.drop || (f === pc && !forced)) continue;
      while (b.length > 2 && b[1].t <= rt) b.shift();
      let x, y, v, j = b.length - 1;
      if (rt >= b[j].t) {   // nothing newer yet: carry on along the last motion for up to 100 ms, then hold
        const B = b[j], A = b[j - 1], e = Math.min(rt - B.t, 100);
        if (A && B.t > A.t && Math.hypot(B.x - A.x, B.y - A.y) < JUMP) { x = B.x + (B.x - A.x) * e / (B.t - A.t); y = B.y + (B.y - A.y) * e / (B.t - A.t); } else { x = B.x; y = B.y; }
        v = B.v; f.nx = 1;
      } else {
        while (j > 0 && b[j - 1].t > rt) j--;
        const B = b[j], A = b[j - 1] || B;
        if (A === B || Math.hypot(B.x - A.x, B.y - A.y) >= JUMP) { x = A.x; y = A.y; } else { const k = (rt - A.t) / (B.t - A.t); x = A.x + (B.x - A.x) * k; y = A.y + (B.y - A.y) * k; }
        v = A.v;
        if (f.nx) { f.nx = 0; const ex = f.rx - x, ey = f.ry - y; f.ne = Math.hypot(ex, ey) < 120 ? { x: ex, y: ey } : null; }   // back from extrapolating: no jump, the gap fades out
      }
      if (f.ne) { x += f.ne.x; y += f.ne.y; f.ne.x *= fade; f.ne.y *= fade; if (Math.abs(f.ne.x) + Math.abs(f.ne.y) < 0.3) f.ne = null; }
      f.x = f.rx = x; f.y = f.ry = y;
      f.in = v ? { mx: v[0], my: v[1], run: !!v[2], analog: true } : { mx: 0, my: 0, run: false };   // the walk / run animation follows the motion being shown
    }
  }

  spawnFor(o) {
    if (o.k == null) return null; const w = this.w;
    const f = new Fighter(w, o.k, o.t, o.x, o.y, { nid: o.i, owner: o.o != null ? w.byNid.get(o.o) : null, life: Infinity, antivirus: !!o.av, hpMult: o.hm || 1 });
    w.fighters.push(f); if (f.isBot) w.vfx('summon', f.x, f.y - 10, { scale: 2.2, below: true });
    return f;
  }
  applySnap(s) {
    const nowT = performance.now(); if (this.lastSnapAt) { const gap = nowT - this.lastSnapAt; (this.gaps ||= []).push(gap); if (this.gaps.length > 180) this.gaps.shift(); conn.gapMax = Math.round(Math.max(...this.gaps)); } this.lastSnapAt = nowT;   // snapshot arrival gaps = jitter
    if (s.ld) { const h = (this.lds ||= []); h.push(s.ld); if (h.length > 180) h.shift(); conn.load = [s.ld[0], Math.max(...h.map(x => x[1]))]; }   // host frame ms: now / worst of the last ~3 s
    if (s.ts != null) {   // host clock -> ours: the fastest arrival of the last ~2 s is the base offset; the delay covers one interval + the jitter above it
      const H = this.offs; H.push(nowT - s.ts); if (H.length > 120) H.shift(); this.clk = Math.min(...H);
      const J = H.map(x => x - this.clk).sort((a, b) => a - b), iv = this.lastTs != null ? Math.min(100, s.ts - this.lastTs) : 33; this.lastTs = s.ts;
      this.iv = this.iv == null ? iv : this.iv + (iv - this.iv) * 0.05;
      const want = Math.max(40, Math.min(150, this.iv + J[Math.floor(J.length * 0.95)] + 8)); this.delay += (want - this.delay) * (want > this.delay ? 0.2 : 0.02);
      this.ts = s.ts;
    }
    const w = this.w, seen = new Set(); if (s.g != null) w.gameT = s.g;
    if (this.role === 'client') w.waveT = Math.max(0, (w.waveT ?? 0));
    for (const o of s.f) { let f = w.byNid.get(o.i); if (!f) f = this.spawnFor(o); if (!f) continue; seen.add(o.i); this.unpack(f, o, s.dm ? s.dm.get(o.i) || NONE : null); }
    for (const f of w.fighters) if (f.nid >= 1000 && !seen.has(f.nid) && f.alive && !f.dispose) f.dispose = true;   // vanished on the host (expired summon, ...)
    if (s.cp) s.cp.forEach((k, i) => { const c = w.camps?.[i]; if (c) { c.owner = k[0] < 0 ? null : k[0]; c.prog = [k[1], k[2]]; c.contested = !!k[3]; c.spawnT = k[4]; } });
    if (s.wv != null) w.waveT = s.wv;
    if (s.tr) { w.traps = s.tr.map((q, i) => Object.assign(w.traps?.[i] || {}, { x: q[0], y: q[1], team: q[2], r: q[3], t: q[4] })); }
    if (s.sn) { w.sentinels = s.sn.map((q, i) => Object.assign(w.sentinels?.[i] || { owner: { alive: true } }, { x: q[0], y: q[1], team: q[2], r: q[3], t: q[4] })); }
    // Luis' mind control: the controller's camera and HUD follow the controlled champion
    if (s.ctl) { const L = w.byNid.get(s.ctl[0]), T = w.byNid.get(s.ctl[1]); if (L && T) { const mine = L === w.player; w.control = { luis: L, target: T, t: s.ctl[2], mode: mine ? 'ctrl' : 'view' }; w.ctrl = mine ? T : null; } }
    else if (w.control) { const T = w.ctrl; if (T) { T.nx = 1; T.rx = T.x; T.ry = T.y; } w.control = null; w.ctrl = null; w.cancelAim(); }   // released: back to interpolation, the gap fades out (smooth)
    this.reconcile(s);
    // mortars (item): the host owns them, we only draw them
    s.m.forEach((m, i) => { let im = this.mortarImgs[i]; if (!im) { im = this.mortarImgs[i] = w.add.image(0, 0, 'item_mortero_portatil').setOrigin(0.5, 0.9); im.setScale(70 / Math.max(im.width, im.height)); } im.setPosition(m[0], m[1]).setDepth(m[1]); });
    while (this.mortarImgs.length > s.m.length) this.mortarImgs.pop().destroy();
  }
  // o: the full state of the unit; d: what changed in this snapshot (null = keyframe / everything)
  unpack(f, o, d) {
    const w = this.w, local = f === w.player, first = !f.netSeen; f.netSeen = true;
    if (first) { f.x = o.x; f.y = o.y; }   // also a corpse seen for the first time (rejoin): where it fell, not at its spawn
    if (o.a === 0) { if (f.alive) { f.alive = false; f.state = 'dead'; f.pending = null; f.playAnim('death', 0.9); } }
    else if (!f.alive && f.isChamp) { f.x = o.x; f.y = o.y; f.reset(); f.playAnim('idle'); f.netSeen = true; f.nb = null; if (f === w.pc) this.histFor = null; }   // respawn: no sliding from the corpse
    if (f.alive) {   // position: a sample for the interpolation (remote units) and the reconciliation (ours)
      const b = (f.nb ||= []); b.push({ t: this.ts ?? 0, x: o.x, y: o.y, v: o.v }); if (b.length > 40) b.shift();
    }
    if (f !== w.pc && f.state !== 'cast') { f.ax = o.ax; f.ay = o.ay; }
    // statuses
    const stun = o.st || 0; if (stun > 0 && f.stunT <= 0) { f.state = 'stun'; f.pending = null; } f.stunT = stun; if (stun <= 0 && f.state === 'stun') { f.state = 'idle'; f.playAnim('idle'); }
    f.rootT = o.rt || 0; f.silenceT = o.sl || 0; f.blindT = o.bl || 0; f.charmT = o.ch || 0; f.team = o.tm ?? f.baseTeam;
    f.shieldHp = o.sd ? o.sd[0] : 0; f.shieldT = o.sd ? o.sd[1] : 0; f.speedBoost = o.sp ? o.sp[0] : 0; f.speedT = o.sp ? o.sp[1] : 0;
    f.slows = (o.sw || []).map(a => ({ pct: a[0], t: a[1] }));
    f.poisons = o.pn ? [{ dps: 0, t: o.pn, tick: 0, src: f }] : [];
    { const ls = o.lr && this.fighter(o.lr[0]); f.lure = ls ? { src: ls, t: o.lr[1] } : null; const fo = o.fs && this.fighter(o.fs[0]); f.fist = fo ? { owner: fo, n: o.fs[1], t: o.fs[2] } : null; }
    if (o.mh && o.mh !== f.def.stats.hp) f.def = { ...f.def, stats: { ...f.def.stats, hp: o.mh } };
    if (o.bs && !f.bsDone) { f.bsDone = true; f.baseScale *= o.bs; f.spr.setScale(f.baseScale); f.shadow?.setScale(f.shadow.scaleX * o.bs, f.shadow.scaleY * o.bs); }
    if (o.cb) { f.life = o.cb[0]; f.life0 = o.cb[1]; f.spawnT = o.cb[2]; f.spawnMax = o.cb[3]; f.bugFull = !!o.cb[4]; }
    if (o.lf) { f.lfShow = o.lf; f.enraged = !!o.en; }
    const ivT = o.iv < 0 ? Infinity : o.iv; f.invis = o.iv != null ? (f.invis ? Object.assign(f.invis, { t: ivT }) : { t: ivT, trail: 0.15 }) : null;   // keep the trail timer: resetting it every snapshot meant Luis' silhouettes never appeared
    f.ink = o.ik ? { t: o.ik, src: null } : null; f.away = !!o.aw;
    f.recall = o.rc != null ? { t: o.rc, T: f.recall?.T || Math.max(o.rc, 10) } : null; f.recallFx = o.rf ? { phase: o.rf[0] === 1 ? 'out' : 'in', t: o.rf[1] } : null; f.protein = o.pr != null ? { t: o.pr, tick: 0, hps: 0 } : null;
    if (f.isChamp) {
      if (!first && o.lv > f.level) { w.audio.play('levelup', { at: f, vol: local ? 1 : 0.5, gap: 0 }); w.vfx('levelup', f.x, f.y - 20, { scale: 3.2 }); w.float(f.x, f.y - f.def.height - 30, `NIVEL ${o.lv}`, '#ffe066'); }
      if (o.kd) [f.kills, f.deaths, f.assists] = o.kd;
      f.level = o.lv; f.xp = o.xp; f.gold = o.gd; f.points = o.pt;
      const cd = !d || d.cd;   // cooldowns come only when they stop matching our own countdown
      ABILITY_KEYS.forEach((a, i) => { f.ranks[a] = o.rk[i]; if (cd) f.cds[a] = o.cd[i]; }); if (o.br) ABILITY_KEYS.forEach((a, i) => f.setBranch(a, o.br[i])); f.comb = o.cb ? { t: o.cb, atkCd: f.def.abilities.p1.atkCd, reach: rk(f.def.abilities.p1.reach, f.ranks.p1 || 1) } : null; f.leakRe = o.lk ? { t: o.lk } : null; if (cd) f.cds.basic = o.cd[4];
      if (o.pm) { const ps = o.pm.join(); if (ps !== f.permSig) { f.permSig = ps; f.perm = {}; PERM_KEYS.forEach((k, i) => { if (o.pm[i]) f.perm[k] = o.pm[i]; }); f.recomputeItems(); } }
      const sig = JSON.stringify(o.inv); if (sig !== f.invSig) { f.invSig = sig; f.inv = o.inv.map(a => (a ? { id: a[0], cd: a[1], charges: a[2] } : null)); f.recomputeItems(); }
      else f.inv.forEach((sl, i) => { if (sl) sl.cd = o.inv[i][1]; });
      f.mshield = o.ms ? 1 : 0; f.moveT = o.mt ? 3 : 0; f.hp = f.hp;
      f.dashCharges = o.dc; f.setupStacks = o.ss; f.rage = o.rg; if (o.cg != null) f.charge = o.cg; f.gun = !!o.gn;
      if (f.key === 'maduro') { if (o.sb) { if (!f.sb) f.setSB(o.sb); f.sb.t = o.sb; } else if (f.sb) f.setSB(0); }   // Súper Bigote: the host owns the timer
      if (o.bm) {   // aboard Yonaiker's ship (the host runs it): keep a local mirror so the guest gets the reticle, the aerial view and the abilities that work aboard
        const B = f.bomber?.mirror ? f.bomber : (f.bomber = { mirror: true, o: f, a: f.def.abilities.p3, rank: f.ranks.p3, pt: { x: f.x, y: f.y }, fire: false, cd: 0 }), ph = BPH[o.bm[0]];
        if (B.phase !== ph) w.bomberMirrorPhase(B, ph);
        B.T = o.bm[1]; B.t = o.bm[2]; B.rank = f.ranks.p3;
      } else if (f.bomber?.mirror) { w.bomberMirrorPhase(f.bomber, null); f.bomber = null; }
      f.potions = (o.po || []).map(t => ({ hp: 0, mana: 0, t, T: t }));
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
      if (this.echoed(f, k)) return;   // already played locally
      f.ax = e[3]; f.ay = e[4]; f.castPoint = e[5] == null ? null : { x: e[5], y: e[6] };
      if (!f.ranks[k]) f.ranks[k] = 1; f.cds[k] = 0; if (f.key === 'jorbi') f.dashCharges = Math.max(1, f.dashCharges);
      this.replay(f, () => f._tryCast(k)); f.castPoint = null;
    } else if (e[0] === 'b') {
      const f = this.fighter(e[1]); if (!f || !f.alive) return;
      if (this.echoed(f, 'b')) return;
      if (f !== w.pc && !w.inView(f.x, f.y, 450)) return;   // basic attacks far from the camera are not replayed (nobody sees them)
      f.ax = e[2]; f.ay = e[3]; f.cds.basic = 0; f.forceStep = e[4] || 0; this.replay(f, () => f._tryBasic());
    } else if (e[0] === 'd') {
      const t = this.fighter(e[1]); if (!t) return; const dmg = e[2], type = TYPES[e[3]];
      if (!w.inView(t.x, t.y, 200)) return;
      w.audio.play(e[4] === 2 ? 'hit_heavy' : e[4] === 1 ? 'hit_metal' : type === 'physical' ? 'hit_flesh' : 'debuff', { at: t, vol: e[4] ? 0.5 : 0.55, gap: 90 });
      if (!e[4]) t.flash();
      w.float(t.x + Phaser.Math.Between(-15, 15), t.y - t.def.height - 5, `${dmg}`, type === 'magic' ? '#c77dff' : type === 'physical' ? '#ffffff' : '#9be37a');
    } else if (e[0] === 'k') {
      const v = this.fighter(e[1]); if (!v || !v.alive) return;
      v.hp = 0; v.die(e[2] >= 0 ? this.fighter(e[2]) : null);
    } else if (e[0] === 'rc') {   // death recap computed by the host
      const v = this.fighter(e[1]); if (v) v.recap = e[2];
    } else if (e[0] === 'w') {
      if (e[1] === 0) w.audio.voice('v_minions', 1, 'ann_minions', { title: '¡MINIONS DESPLEGADOS!', sub: 'La primera oleada avanza por el carril', team: 2 });
      w.audio.play('minion_yell', { at: { x: 260, y: w.laneY }, vol: 0.5, gap: 200 });
    } else if (e[0] === 'r') {   // Jorbi's rewind trails
      w.announceRewind(this.fighter(e[2]) || w.player, e[3], e[1]);
      w.showRewind(e[4].map(([team, flat]) => ({ team, pts: Array.from({ length: flat.length / 2 }, (_, i) => [flat[i * 2], flat[i * 2 + 1]]) })), e[1]);
    } else if (e[0] === 'sh') {   // reinforcement ship (the minions arrive in the next snapshot)
      const c = w.camps?.[e[1]]; if (c) w.shipVisual(c, e[2]);
    } else if (e[0] === 's') {
      const [, sx, sy, tx, ty] = e, shell = w.add.circle(sx, sy, 7, 0x333333).setDepth(100000);
      w.tweens.add({ targets: shell, x: tx, y: { value: ty - 8, ease: 'Sine.In' }, scale: 1.8, duration: 800, onComplete: () => { shell.destroy(); w.vfx('shockwave', tx, ty, { scale: 3, below: true }); w.vfx('spark', tx, ty - 20, { scale: 4, tint: 0xffb020 }); w.audio.play('explosion', { at: { x: tx, y: ty }, vol: 0.8, gap: 60 }); } });
      w.audio.play('cannon', { at: { x: sx, y: sy }, vol: 0.5, gap: 100 });
    }
  }
}
