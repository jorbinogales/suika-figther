// Neutral bosses of the MOBA (team 2). Arena methods mixed in at the bottom of world.js (Object.assign(Arena.prototype, BossMixin)).
//  beast   (every 2 min) : slow giant in a clearing of the blue-side forest next to the river. Smash / double slam / slowing roar. Leashed to its lair. Reward: gold + random permanent upgrades.
//  captain (every 4 min) : officer + 6 camp soldiers in the north. Missile rain / temporary soldiers / self heal. Reward: elite units in every lane wave for a while.
//  robot   (minute 8)    : giant war robot dropped from a plane at the centre of the map; it turns the centre into a war zone. Flames / machine guns / stomp. Reward: coloured upgrades.
import { LAIR_BEAST, CAMP_CAPTAIN, ARENA_ROBOT, WORLD_W, WORLD_H, laneYAt } from './mapdata.js';
import { Fighter, dist, BODY_R } from './fighter.js';
import { PERM_KEYS, SLOTS, STAT_LABEL } from './items.js';

const NEUTRAL = 2;
export const ROBOT_AT = 480;
export const ROBOT_EVERY = 300;   // after the first drop (minute 8) the robot comes back 5 min after it dies
export const BOSS_T = { beast: 120, captain: 240, robot: ROBOT_EVERY };   // first appearance (s) = respawn time
export const laneUnitIgnoresBoss = (f, t) => !!(t?.isBoss && (f?.isTower || (f?.isMinion && !f.owner && !f.isBoss)));
export const campCanAttack = (f, t) => !!(t?.isChamp && t.alive && (f.campAggro?.has(t) || f.leader?.bs?.aggro?.has(t)));
export const bossCanAttack = (f, t) => !!(t?.isChamp && t.alive && f.bs?.aggro?.has(t));
export function recordBossAttacker(boss, source) {
  const attacker = source?.owner || source;
  if (boss?.camp && attacker?.isChamp && attacker.team !== boss.team) (boss.campAggro ||= new Set()).add(attacker);   // camp soldiers: they only fight champions that hurt them (or hurt the captain)
  if (boss?.isBoss && boss.bs && !boss.bs.ret && attacker?.isChamp && attacker.team !== boss.team) boss.bs.aggro.add(attacker);
}
export const BUFFS = {
  purple: { name: 'Núcleo violeta', icon: 'buff_purple', col: 0xb04aff, bonus: { ap: 45 }, desc: '+45 de poder de IA. Te rodea un área violeta que hace daño de IA a los enemigos cercanos.' },
  red:    { name: 'Núcleo rojo', icon: 'buff_red', col: 0xff4a3a, bonus: { atk: 28 }, desc: '+28 de ataque físico.' },
  green:  { name: 'Núcleo verde', icon: 'buff_green', col: 0x4aff7a, bonus: { hp: 320, mana: 180 }, desc: '+320 de vida y +180 de maná.' },
  yellow: { name: 'Núcleo dorado', icon: 'buff_yellow', col: 0xffd23f, bonus: { armor: 30, mr: 30 }, desc: '+30 de armadura y de resistencia a la IA, y un escudo que se activa cada 60 s.' },
};
export const buffCardInfo = c => { const b = BUFFS[c.id]; return { tag: 'MEJORA DEL ROBOT', name: b.name, sub: '', desc: b.desc, icon: 'icon_' + b.icon, col: b.col }; };
const rnd = (a, b) => a + Math.random() * (b - a), pickOf = a => a[Math.random() * a.length | 0];

export const BossMixin = {
  bossInit() {
    this.bossG = this.add.graphics().setDepth(-860); this.ropeG = this.add.graphics().setDepth(79990); this.auraG = this.add.graphics().setDepth(-3);
    this.bosses = { beast: { t: BOSS_T.beast, f: null, n: 0 }, captain: { t: BOSS_T.captain, f: null, n: 0 }, robot: { t: ROBOT_AT, f: null, phase: 'wait' } };
    this.eliteT = [0, 0]; this.tele = []; this.plane = null; this.bossPick = null;
    const h = new URLSearchParams(location.hash.slice(1)), dbg = h.get('boss');   // test link: #boss=beast|captain|robot&bt=seconds
    if (dbg && this.bosses[dbg]) this.bosses[dbg].t = +(h.get('bt') || 1);
    if (this.training) for (const k in this.bosses) this.bosses[k].t = 1e9;   // practice: bosses only come from the buttons
    this.buildBossDecor();
  },
  buffInfo(id) { return BUFFS[id]; },
  bossForce(kind) {   // practice buttons
    const b = this.bosses[kind];
    if (kind === 'robot') { if (b.phase === 'plane' || b.f?.alive) return; b.phase = 'wait'; b.f = null; this.bossRobotPlane(); return; }
    if (b.f?.alive) { this.float(b.f.x, b.f.y - 160, 'Ya está en juego', '#ffe066'); return; }
    this.bossSpawn(kind);
  },

  // ---------- decoration of the three places (their own art once packed; stones / mushrooms of the map pack + simple shapes until then) ----------
  buildBossDecor() {
    if (this.bot) return;
    const put = (key, x, y, h, tint) => {
      if (!this.textures.exists(key)) return null;
      const im = this.add.image(x, y, key).setOrigin(0.5, 0.9).setDepth(y); im.setScale(h / im.height); if (tint) im.setTint(tint); (this.mapSprites ||= []).push(im); return im;
    };
    const g = this.add.graphics().setDepth(-4), L = LAIR_BEAST, C = CAMP_CAPTAIN;
    // beast lair: a dark den of leaf litter, a nest, bones, fur and big stones around the edge
    
    const nest = put('lair_nest', L.x - 20, L.y + 40, 190); nest?.setDepth(-3);   // the nest lies on the ground: the beast (depth = y) always draws above it
    if (!nest) { g.fillStyle(0x6a4a2a, 1).fillEllipse(L.x - 20, L.y + 20, 190, 100).lineStyle(6, 0x3a2814, 1).strokeEllipse(L.x - 20, L.y + 20, 190, 100); }
    put('lair_bones', L.x + 120, L.y + 90, 80); put('lair_bones', L.x - 150, L.y - 70, 70); put('lair_fur', L.x + 90, L.y - 110, 70);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + rnd(-0.12, 0.12), r = L.r * rnd(0.82, 1.0); put(pickOf(['f_stone2', 'f_stone4', 'f_stone1']), L.x + Math.cos(a) * r, L.y + Math.sin(a) * r * 0.9, rnd(46, 78)); }
    for (let i = 0; i < 18; i++) put(pickOf(['f_mush1', 'f_mush3', 'f_mush5', 'f_flower2']), L.x + rnd(-L.r, L.r) * 0.8, L.y + rnd(-L.r, L.r) * 0.7, rnd(16, 26));
    // captain camp: tents, sandbags, crates, a flag
    const tent = (x, y) => { if (!put('camp_tent', x, y, 110)) { g.fillStyle(0xb8a46a, 1).fillTriangle(x - 55, y, x + 55, y, x, y - 70).lineStyle(3, 0x4a3e22, 1).strokeTriangle(x - 55, y, x + 55, y, x, y - 70); } };
    tent(C.x - 140, C.y - 40); tent(C.x + 150, C.y - 30); tent(C.x - 70, C.y + 110);
    put('camp_crates', C.x + 60, C.y - 120, 70); if (!put('camp_flag', C.x, C.y - 70, 150)) { g.lineStyle(5, 0x5a4a2a, 1).lineBetween(C.x, C.y, C.x, C.y - 130); g.fillStyle(0x6a7a3a, 1).fillRect(C.x, C.y - 130, 60, 36).lineStyle(2, 0x2a3414, 1).strokeRect(C.x, C.y - 130, 60, 36); }
  },

  // ---------- timers, spawning, effects ----------
  bossTick(dt) {
    this.drawBossFx(dt);
    if (this.net?.role === 'client') {   // clients only mirror the timers / the boss units that came in the snapshots (for the HUD)
      for (const k of ['beast', 'captain', 'robot']) { const b = this.bosses[k], f = this.fighters.find(q => q.key === 'boss_' + k && q.alive); if (!b.synced && b.f && !f && k !== 'robot') b.t = BOSS_T[k]; b.f = f || null; if (!f && (k !== 'robot' || b.phase === 'wait')) b.t = Math.max(0, b.t - dt); else if (f && k === 'robot') b.phase = 'fight'; }
      this.updatePlane(dt); return;
    }
    if (this.over) return;
    if (this.bossVote && (this.bossVote.t -= dt) <= 0) this.bossVoteEnd(pickOf(this.bossVote.opts));
    const B = this.bosses, t = this.gameT;
    if (this.training) for (const k in B) if (!B[k].f?.alive && B[k].phase !== 'plane') B[k].t = 1e9;
    for (const k of ['beast', 'captain']) {
      const b = B[k]; if (b.f && (!b.f.alive || b.f.dispose)) { b.f = null; b.t = BOSS_T[k]; b.n++; }
      if (!b.f && (b.t -= dt) <= 0) this.bossSpawn(k);
    }
    const r = B.robot; if (r.phase === 'wait' && (r.t -= dt) <= 0) this.bossRobotPlane();
    if (r.f && !r.f.alive && r.phase === 'fight') { r.f = null; r.phase = 'wait'; r.t = ROBOT_EVERY; r.n = (r.n || 0) + 1; }   // dead: the next one drops 5 min later, one level higher
    this.updatePlane(dt); if (r.f?.alive) this.robotFx(r.f, dt);
    for (const i of [0, 1]) if (this.eliteT[i] > 0 && (this.eliteT[i] -= dt) <= 0) this.showBanner({ title: 'FIN DE LAS TROPAS ESPECIALES', sub: i === 0 ? 'Equipo azul' : 'Equipo rojo', team: 2 }, 2200);
    // boss upgrades of champions: purple aura damage + yellow shield every 60 s
    for (const f of this.champs) {
      const bf = f.buffs; if (!bf || !f.alive) continue;
      if (bf.purple) { f.auraT = (f.auraT || 0) - dt; if (f.auraT <= 0) { f.auraT = 0.5; this.enemiesNear(f.team, f.x, f.y, 125).forEach(e => { if (!e.isTower) this.damage(f, e, (6 + 4 * bf.purple) + f.ap * 0.04, 'magic'); }); } }
      if (bf.yellow) { f.yT = (f.yT ?? 60) - dt; if (f.yT <= 0) { f.yT = 60; f.shieldHp = Math.max(f.shieldHp, 110 + 30 * bf.yellow + f.level * 8); f.shieldT = 8; f.shieldMaxT = 0; this.vfx('shield', f.x, f.cy, { scale: 2.6, tint: 0xffd23f, alpha: 0.8 }); this.float(f.x, f.y - f.def.height - 30, 'Escudo dorado', '#ffd23f'); } }
    }
  },
  bossBanner(title, sub, voice = null) {
    const banner = { title, sub, team: 2 };
    if (voice) this.audio.voice(voice, 4, null, banner);
    else this.showBanner(banner, 3200);
    this.audio.play('explosion_big', { gap: 0, vol: 0.55 }); if (voice) this.audio.play(voice === 'v_boss_robot' ? 'mecha_servo' : 'boss_alarm', { gap: 0, vol: 0.7 });
    this.net?.onBoss?.('bn', title, sub, voice);
  },
  bossSpawn(kind) {
    const b = this.bosses[kind], L = LAIR_BEAST, C = CAMP_CAPTAIN;
    if (kind === 'beast') {
      const f = new Fighter(this, 'boss_beast', NEUTRAL, L.x, L.y, { ai: true, hpMult: 1 + 0.3 * b.n }); f.bossLvl = b.n + 1; f.bossDmg = 1 + 0.15 * b.n;
      this.bossSetup(f, 'beast', { x: L.x, y: L.y }, 520); b.f = f; this.bossBanner('¡LA BESTIA HA DESPERTADO!', `Nivel ${b.n + 1} · guarida junto al río, lado azul`, 'v_boss_beast');
    } else {
      const f = new Fighter(this, 'boss_captain', NEUTRAL, C.x, C.y + 20, { ai: true, hpMult: 1 + 0.3 * b.n }); f.bossLvl = b.n + 1; f.bossDmg = 1 + 0.15 * b.n;
      this.bossSetup(f, 'captain', { x: C.x, y: C.y }, 600); b.f = f; f.bs.cd = { m: 6, s: 4, h: 5 };
      f.guards = [];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.283, g = new Fighter(this, i % 2 ? 'camp_soldier_rifle' : 'camp_soldier_melee', NEUTRAL, C.x + Math.cos(a) * 110, C.y + 20 + Math.sin(a) * 80, { ai: true, hpMult: 1 + 0.2 * b.n });
        g.dmgMult = 1 + 0.1 * b.n; g.campGuard = g.camp = true; g.leader = f; g.home = { x: C.x, y: C.y }; g.slot = { x: Math.cos(a) * 120, y: Math.sin(a) * 90 }; g.laneI = 1; this.fighters.push(g); f.guards.push(g);
      }
      this.bossBanner('¡EL CAPITÁN HA LLEGADO!', `Nivel ${b.n + 1} · campamento entre top y mid, junto al río`, 'v_boss_captain');
    }
  },
  bossSetup(f, kind, home, leash) { f.bossKind = kind; f.bossHome = home; f.leash = leash; f.bs = { cd: { a: 1, b: 4, c: 8 }, ret: false, aggro: new Set() }; f.laneI = 1; this.fighters.push(f); },
  tel(x, y, r, t, col = 0xff4a3a, cone = null) {   // warning of the affected area (sent to the clients too)
    this.tele.push({ x, y, r, t, T: t, col, cone });
    this.net?.onBoss?.('tl', [Math.round(x), Math.round(y), Math.round(r), +t.toFixed(2), col, cone ? [+cone.a.toFixed(2), +cone.h.toFixed(2)] : 0]);
  },
  drawBossFx(dt) {
    const g = this.bossG; g.clear();
    this.tele = this.tele.filter(e => (e.t -= dt) > 0);
    for (const e of this.tele) {
      const k = 1 - e.t / e.T;
      if (e.cone) { g.fillStyle(e.col, 0.1 + 0.2 * k).slice(e.x, e.y, e.r, e.cone.a - e.cone.h, e.cone.a + e.cone.h, false).fillPath(); }
      else { g.fillStyle(e.col, 0.08 + 0.2 * k).fillEllipse(e.x, e.y, e.r * 2, e.r * 1.4); g.lineStyle(3, e.col, 0.5 + 0.4 * k).strokeEllipse(e.x, e.y, e.r * 2, e.r * 1.4); g.fillStyle(e.col, 0.3).fillEllipse(e.x, e.y, e.r * 2 * k, e.r * 1.4 * k); }
    }
    if (this.burnTrees?.length && (this.burnClock = (this.burnClock || 0) - dt) <= 0) {   // flames on the burning trees (only the visible ones)
      this.burnClock = 0.25; this.burnTrees = this.burnTrees.filter(o => o.scene);
      for (const o of this.burnTrees) if (Math.random() < 0.5 && this.inView(o.x, o.y - o.displayHeight * 0.5, 80)) this.vfx('burning_ground', o.x + rnd(-14, 14), o.y - rnd(0.2, 0.8) * o.displayHeight, { scale: rnd(1.6, 2.6), alpha: 0.95 });
    }
    const ag = this.auraG; ag.clear();
    for (const f of this.champs) if (f.buffs?.purple && f.alive && !f.hiddenFor(this.pc)) { const p = 0.5 + 0.5 * Math.sin(this.time.now / 260); ag.fillStyle(0x9a3cff, 0.16 + 0.08 * p).fillEllipse(f.x, f.y - 6, 250, 170); ag.lineStyle(2, 0xd49aff, 0.6).strokeEllipse(f.x, f.y - 6, 250, 170); }
  },

  // ---------- shared helpers ----------
  bossTargets(f, r) { return this.enemiesOf(f).filter(t => !t.isTower && dist(t, f) - (t.br - BODY_R) <= r).sort((a, b) => (b.isChamp - a.isChamp) || dist(a, f) - dist(b, f)); },
  bossCanAttack(f, t) { return bossCanAttack(f, t); },
  bossCast(f, anim, wind, dur, fn) {   // plays `anim` (the basic attack while the boss has no art for it) and runs fn at the end of the wind-up
    const has = f.hasAnims && this.anims.exists(`${f.art}_${anim}`) || (f.hasAnims && this.anims.exists(`${f.art}_${anim}_e`));
    f.startAction(has ? anim : 'attack', wind, dur, fn);
  },
  // bosses never idle between skills: when none is ready, the in-range one with the least cooldown is used right away
  chainSkill(f, cands, rerun) {
    const bs = f.bs; if (bs.chained) return false; const c = cands.filter(x => x[1]).sort((p, q) => bs.cd[p[0]] - bs.cd[q[0]])[0]; if (!c) return false;
    bs.cd[c[0]] = 0; bs.chained = true; try { rerun(); } finally { bs.chained = false; } return true;
  },
  bossWalk(f, tx, ty) { const dx = tx - f.x, dy = ty - f.y; f.in.mx = dx; f.in.my = dy; f.setAim(dx, dy); },

  runBoss(f, dt) {
    const bs = f.bs; for (const k in bs.cd) bs.cd[k] -= dt;
    if (f.bossKind === 'robot') return this.runRobot(f);
    const H = f.bossHome, dh = dist(f, H);
    if (bs.ret || dh > f.leash) {   // left its area: goes back (fast, ignoring everyone) and recovers
      if (!bs.ret) { bs.ret = true; this.float(f.x, f.y - f.def.height - 20, '¡Vuelve a su zona!', '#ffb070'); }
      if (dh < 40) { bs.ret = false; bs.aggro.clear(); f.hp = f.maxHp; return; }
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.15 * dt); this.bossWalk(f, H.x, H.y); f.in.run = true; return;
    }
    const tg = this.bossTargets(f, 1000), t = tg[0];
    if (!t) { if (dh > 60) this.bossWalk(f, H.x, H.y); else bs.aggro.clear(); f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.03 * dt); return; }
    if (f.bossKind === 'beast') return this.runBeast(f, t, tg);
    return this.runCaptain(f, t, tg);
  },

  // ---------- beast ----------
  runBeast(f, t, tg) {
    const bs = f.bs, d = dist(f, t) - (t.br - BODY_R), ax = t.x - f.x, ay = t.y - f.y;
    f.setAim(ax, ay);
    const near = tg.filter(e => dist(e, f) < 440).length;
    if (bs.cd.c <= 0 && (near >= 2 || (near >= 1 && f.hp < f.maxHp * 0.5))) {   // roar: slows everyone around
      bs.cd.c = 15; this.audio.play('boss_roar', { at: f, gap: 0, vol: 1 }); this.bossCast(f, 'roar', 0.7, 1.1, () => {
        this.vfx('shockwave', f.x, f.y - 10, { scale: 9, below: true, tint: 0xffa060 }); this.audio.play('boss_roar', { at: f, gap: 0, vol: 1 });
        this.enemiesNear(NEUTRAL, f.x, f.y, 440).forEach(e => { if (!this.bossCanAttack(f, e)) return; this.damage(f, e, 30, 'magic'); e.slow?.(0.45, 3.5); this.float(e.x, e.y - e.def.height - 20, 'Ralentizado', '#a0c8ff'); });
      }); this.tel(f.x, f.y, 440, 0.7, 0xffa060); return;
    }
    if (bs.cd.b <= 0 && d < 250) {   // double slam: around itself
      bs.cd.b = 8; this.audio.play('boss_roar', { at: f, gap: 0, vol: 1 }); this.bossCast(f, 'shake', 0.75, 1.25, () => {
        this.vfx('shockwave', f.x, f.y - 10, { scale: 6, below: true }); this.audio.play('boss_pound', { at: f, gap: 0, vol: 1 }); this.cameras.main.shake(260, 0.006);
        this.enemiesNear(NEUTRAL, f.x, f.y, 270).forEach(e => { if (!this.bossCanAttack(f, e)) return; this.damage(f, e, 95, 'physical'); e.stun(0.5); });
      }); this.tel(f.x, f.y, 270, 0.75); return;
    }
    if (bs.cd.a <= 0 && d < 215) {   // smash in front of it
      bs.cd.a = 3.2; this.audio.play('boss_roar', { at: f, gap: 0, vol: 1 }); const ux = ax / (Math.hypot(ax, ay) || 1), uy = ay / (Math.hypot(ax, ay) || 1), cx = f.x + ux * 150, cy = f.y + uy * 120;
      this.bossCast(f, 'attack', 0.5, 0.9, () => {
        this.vfx('shockwave', cx, cy - 6, { scale: 3.4, below: true }); this.audio.play('boss_pound', { at: { x: cx, y: cy }, gap: 0, vol: 0.9 });
        this.enemiesNear(NEUTRAL, cx, cy, 125).forEach(e => { if (this.bossCanAttack(f, e)) this.damage(f, e, 80, 'physical'); });
      }); this.tel(cx, cy, 125, 0.5); return;
    }
    if (this.chainSkill(f, [['b', d < 250], ['a', d < 215]], () => this.runBeast(f, t, tg))) return;
    if (d > 130) { f.in.mx = ax; f.in.my = ay; }
  },

  // ---------- captain ----------
  runCaptain(f, t, tg) {
    const bs = f.bs, d = dist(f, t), range = f.def.stats.range;
    f.setAim(t.x - f.x, t.y - f.y);
    if (f.hp < f.maxHp * 0.7 && bs.cd.h <= 0) {   // heals himself
      bs.cd.h = 20; this.audio.play('boss_alarm', { at: f, gap: 0, vol: 0.6, rate: 1.3 }); this.tel(f.x, f.y, 110, 0.5, 0x5dff8a); this.bossCast(f, 'heal', 0.5, 1.2, () => { const h = f.maxHp * 0.2; f.hp = Math.min(f.maxHp, f.hp + h); this.vfx('heal', f.x, f.cy, { scale: 3.4 }); this.float(f.x, f.y - f.def.height - 20, `+${Math.round(h)}`, '#5dff8a'); }); return;
    }
    if (bs.cd.s <= 0 && this.fighters.filter(q => q.owner === f && q.alive).length < 6) {   // temporary soldiers fighting next to him
      bs.cd.s = 24; this.audio.play('boss_alarm', { at: f, gap: 0, vol: 0.9 }); this.tel(f.x, f.y + 40, 150, 0.5, 0xffe066); this.bossCast(f, 'summon', 0.5, 1.0, () => {
        for (let i = 0; i < 3; i++) {
          const b = new Fighter(this, i === 2 ? 'camp_soldier_rifle' : 'camp_soldier_melee', NEUTRAL, f.x + (i - 1) * 50, f.y + 50, { ai: true, owner: f, life: 20, slot: { x: (i - 1) * 70, y: 60 } });
          b.summoned = b.campGuard = b.camp = true; b.leader = f; b.home = { x: f.bossHome.x, y: f.bossHome.y }; b.slot = { x: (i - 1) * 70, y: 60 }; b.def = { ...b.def, stats: { ...b.def.stats, hp: b.def.stats.hp * 1.25 } }; b.hp = b.maxHp; b.ax = f.ax; b.ay = f.ay; b.laneI = 1; this.fighters.push(b); this.vfx('summon', b.x, b.y - 10, { scale: 2.2, below: true });
        }
        this.float(f.x, f.y - f.def.height - 30, '¡Refuerzos!', '#ffe066');
      }); return;
    }
    if (bs.cd.m <= 0 && d < 720) {   // missile rain over the target
      bs.cd.m = 17; this.audio.play('boss_alarm', { at: f, gap: 0, vol: 0.9 }); const c = { x: t.x, y: t.y };
      this.bossCast(f, 'missiles', 0.6, 1.2, () => {
        const pts = [{ x: c.x, y: c.y }]; for (let i = 0; i < 9; i++) { const a = rnd(0, 6.283), r = rnd(60, 300); pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.8 }); }
        pts.forEach((p, i) => {
          const dl = 0.9 + i * 0.14; this.tel(p.x, p.y, 95, dl, 0xff7a2a);
          let mi = null; if (this.textures.exists('boss_missile')) { mi = this.add.image(p.x, p.y - 700, 'boss_missile').setDepth(79000).setScale(0.18).setAngle(90); this.tweens.add({ targets: mi, y: p.y - 10, duration: dl * 1000, ease: 'Quad.In' }); }
          this.after(dl, () => {
            mi?.destroy(); this.vfx('shockwave', p.x, p.y - 6, { scale: 3.2, below: true, tint: 0xff8a3a }); this.vfx('cannonball', p.x, p.y - 20, { scale: 3 }); this.audio.play('explosion', { at: p, gap: 60, vol: 0.5 });
            this.enemiesNear(NEUTRAL, p.x, p.y, 95).forEach(e => { if (this.bossCanAttack(f, e)) this.damage(f, e, 85, 'physical'); });
          });
        });
      }); return;
    }
    if (this.chainSkill(f, [['m', d < 720], ['s', this.fighters.filter(q => q.owner === f && q.alive).length < 6], ['h', f.hp < f.maxHp * 0.7]], () => this.runCaptain(f, t, tg))) return;
    if (d > range * 0.85) { f.in.mx = t.x - f.x; f.in.my = t.y - f.y; } else if (d < range * 0.4) { f.in.mx = f.x - t.x; f.in.my = f.y - t.y; }
    if (d <= range) f.tryBasic();
  },
  runCamp(f) {   // soldiers of the camp: guard the captain, charge whatever comes near, never go far from the camp
    const L = f.leader, H = f.home, range = f.def.stats.range;
    const t = this.bossTargets(f, 420).find(e => dist(e, H) < 760);
    if (!t || dist(f, H) > 780) { const lx = (L?.alive ? L.x : H.x) + f.slot.x, ly = (L?.alive ? L.y : H.y) + f.slot.y, d = Math.hypot(lx - f.x, ly - f.y); if (d > 40) { f.in.mx = lx - f.x; f.in.my = ly - f.y; f.in.run = d > 300; f.setAim(f.in.mx, f.in.my); } return; }
    const dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy) - (t.br - BODY_R); f.setAim(dx, dy);
    if (d > range * 0.9) { f.in.mx = dx; f.in.my = dy; } if (d <= range) f.tryBasic();
  },

  // ---------- giant robot: plane drop, war zone, attacks ----------
  bossRobotPlane() {   // host / offline: starts the drop (clients get the 'pl' event and only draw it)
    const r = this.bosses.robot; r.phase = 'plane'; const lvl = (r.n || 0) + 1;
    this.bossPlaneVisual(); this.net?.onBoss?.('pl');
    this.bossBanner('¡UN ROBOT DE GUERRA SE ACERCA!', `Nivel ${lvl} · cae sobre el centro del mapa`, 'v_boss_robot');
  },
  bossPlaneVisual() {   // the plane state (always) + its sprites (not on the headless host)
    const A = ARENA_ROBOT, y = A.y - 520; let spr = null, hang = null;
    if (!this.bot) {
      const tex = this.textures.exists('boss_plane') ? 'boss_plane' : 'ship_robot';
      spr = this.add.image(-300, y, tex).setDepth(80000); spr.setScale(Math.min(1, 420 / spr.width));
      const art = 'boss_robot', sp = this.sprites[art] ? art : 'minion_red_auto'; hang = this.add.image(-300, y + 200, 'atl_' + sp, 'idle/0');
      if (!this.textures.get('atl_' + sp).has('idle/0')) hang.setFrame('walk/0');
      hang.setOrigin(0.5, 0.89).setScale(340 / 190).setDepth(79995); if (!this.sprites[art]) hang.setTint(0x6a7078);
    }
    this.plane = { spr, hang, x: -300, y, dropped: false, speed: (A.x + 300) / 6 };
  },
  updatePlane(dt) {
    const p = this.plane; if (!p) return;
    p.x += p.speed * dt; p.spr?.setPosition(p.x, p.y);
    const g = this.ropeG; g.clear();
    if (!p.dropped) {
      if (p.hang) { p.hang.setPosition(p.x, p.y + 190); g.lineStyle(5, 0x2a2a2a, 1).lineBetween(p.x - 30, p.y + 30, p.x - 18, p.y + 170).lineBetween(p.x + 30, p.y + 30, p.x + 18, p.y + 170); }
      if (p.x >= ARENA_ROBOT.x) {
        p.dropped = true; if (p.hang) this.tweens.add({ targets: p.hang, y: ARENA_ROBOT.y, duration: 1100, ease: 'Quad.In', onComplete: () => p.hang.destroy() });
        if (this.net?.role !== 'client') this.after(1.1, () => this.bossRobotLand());   // clients wait for the host's 'wz' event
      }
    }
    if (p.x > WORLD_W + 400) { p.spr?.destroy(); p.hang?.destroy?.(); this.plane = null; g.clear(); }
  },
  bossLandFx() {   // impact of the landing (everyone sees it: the host plays it directly, clients on the 'wz' event)
    const A = ARENA_ROBOT; this.vfx('shockwave', A.x, A.y - 10, { scale: 14, below: true, tint: 0xffb070 }); this.vfx('shockwave', A.x, A.y - 10, { scale: 8, below: true }); this.vfx('cannonball', A.x, A.y - 30, { scale: 6 });
    this.audio.play('explosion_big', { gap: 0, vol: 1 }); this.audio.play('mecha_step', { gap: 0, vol: 1 });
  },
  bossRobotLand() {
    const A = ARENA_ROBOT, r = this.bosses.robot, f = new Fighter(this, 'boss_robot', NEUTRAL, A.x, A.y, { ai: true, hpMult: 1 + 0.3 * (r.n || 0) }); f.bossLvl = (r.n || 0) + 1; f.bossDmg = 1 + 0.15 * (r.n || 0);
    this.bossSetup(f, 'robot', { x: A.x, y: A.y }, 1e9); f.bs.cd = { f: 1, m: 4, s: 6 }; f.bs.fl = null; f.bs.mg = null; r.f = f; r.phase = 'fight';
    this.bossLandFx(); this.bossWarZone(); this.net?.onBoss?.('wz');
  },
  // the centre becomes a war zone: no water, a ring of stone walls (4 gaps), dry trees, no bushes
  bossWarZone() {
    if (this.warZone) return; const A = ARENA_ROBOT, R = A.r + 140; this.warZone = true;
    if (!this.bot) this.bossWarGround(A, R);
    this.bossWarWalls(A);
    this.bossWarScenery(A);
  },
  bossWarGround(A, R) {
    const S = 2, N = Math.ceil(R * 2 / S);
    if (this.textures.exists('warzone')) this.textures.remove('warzone');
    const tex = this.textures.createCanvas('warzone', N, N), c = tex.getContext(), im = c.createImageData(N, N), d = im.data, ph = [rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (x - N / 2) * S, dy = (y - N / 2) * S, rr = Math.hypot(dx, dy), a = Math.atan2(dy, dx), edge = R * (0.9 + 0.05 * Math.sin(a * 3 + ph[0]) + 0.03 * Math.sin(a * 7 + ph[1]) + 0.02 * Math.sin(a * 13 + ph[2]));
      if (rr > edge) continue; const fade = rr > edge - 36 ? (edge - rr) / 36 : 1, dark = 0.86 + 0.14 * Math.sin(x * 0.045 + ph[1]) * Math.sin(y * 0.038 + ph[2]) + (Math.random() - 0.5) * 0.07, o = (y * N + x) * 4;
      if (Math.random() > fade) continue;
      d[o] = 84 * dark; d[o + 1] = 68 * dark; d[o + 2] = 54 * dark; d[o + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    // cracked earth: fissures radiate from the landing point (dark gap with a faint hot glow), plus a net of small cracks; no round stains
    const fissure = (x, y, a, len, w, glow) => {
      const pts = [[x, y]]; for (let k = 0; k < len; k++) { a += rnd(-0.35, 0.35); x += Math.cos(a) * rnd(10, 18); y += Math.sin(a) * rnd(10, 18); pts.push([x, y]); if (Math.random() < 0.09 && w > 1.5) fissure(x, y, a + rnd(-1, 1), Math.floor(len * 0.5), w * 0.6, glow); }
      const path = () => { c.beginPath(); pts.forEach(([px, py], n) => n ? c.lineTo(px, py) : c.moveTo(px, py)); };
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(14,10,8,0.9)'; c.lineWidth = w + 2; path(); c.stroke();
      if (glow) { c.strokeStyle = 'rgba(255,110,40,0.45)'; c.lineWidth = Math.max(1, w * 0.45); path(); c.stroke(); }
    };
    for (let i = 0; i < 16; i++) fissure(N / 2, N / 2, i / 16 * 6.283 + rnd(-0.2, 0.2), Math.floor(rnd(14, 24)), rnd(3.5, 6), i % 2 === 0);
    for (let i = 0; i < 40; i++) fissure(N / 2 + rnd(-N * 0.4, N * 0.4), N / 2 + rnd(-N * 0.4, N * 0.4), rnd(0, 6.283), Math.floor(rnd(3, 8)), rnd(1.5, 2.5), false);
    tex.refresh();
    const img = this.add.image(A.x - N * S / 2, A.y - N * S / 2, 'warzone').setOrigin(0, 0).setScale(S).setDepth(-990).setAlpha(0); this.tweens.add({ targets: img, alpha: 1, duration: 1800 }); this.warImg = img;
  },
  bossWarWalls(A) {   // stone walls (the headless host only needs their collision)
    if (!this.bot && !this.textures.exists('war_wall_ph')) { const t2 = this.textures.createCanvas('war_wall_ph', 120, 90), c2 = t2.getContext(); for (let i = 0; i < 9; i++) { const x = 18 + (i % 3) * 36 + rnd(-4, 4), y = 60 - Math.floor(i / 3) * 22 + rnd(-3, 3), w = rnd(30, 44), h = rnd(20, 30), g = rnd(96, 136); c2.fillStyle = `rgb(${g},${g - 8},${g - 20})`; c2.strokeStyle = '#201a14'; c2.lineWidth = 3; c2.beginPath(); c2.roundRect(x - w / 2, y - h / 2, w, h, 8); c2.fill(); c2.stroke(); } t2.refresh(); }
    const key = this.textures.exists('war_wall') ? 'war_wall' : 'war_wall_ph', SEG = 48;
    for (const ring of [0, 1]) for (let i = 0; i < SEG; i++) {   // rocks only on the four diagonals (none at the north / south / east / west sides)
      const a = (i + ring * 0.5) / SEG * 6.283;
      const m = ((a - Math.PI / 4) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2), off = Math.min(m, Math.PI / 2 - m); if (off > 0.4) continue;
      const rr = A.r + ring * 80, x = A.x + Math.cos(a) * rr, y = A.y + Math.sin(a) * rr * 0.92; let s = null;
      if (!this.bot) { s = this.add.image(x, y + 20, key).setOrigin(0.5, 0.9).setDepth(y).setAlpha(0).setFlipX(i % 2 === 0); s.setScale(Math.min(1.1, 150 / s.width * 1.1) * (ring ? 0.85 : 1)); this.tweens.add({ targets: s, alpha: 1, duration: 900 + i * 30 }); }
      this.obstacles.push({ x, y, r: ring ? 38 : 44, team: -1, left: Infinity, s, nx: Math.cos(a), ny: Math.sin(a), wall: true });
    }
  },
  bossWarScenery(A) {
    // bushes disappear, trees burn (charred, with flames)
    const near = o => Math.hypot(o.x - A.x, (o.y - A.y) / 0.92) < A.r + 330, dead = this.textures.exists('war_deadtree'); this.burnTrees = [];
    (this.bushes || []).filter(near).forEach(b => b.spr?.forEach(o => o.destroy()));
    this.bushes = (this.bushes || []).filter(b => !near(b));
    (this.mapSprites || []).forEach(o => {
      if (!o.scene || !near(o)) return; const k = o.texture?.key || '';
      if (/^f_bush|^bush_grass/.test(k)) o.destroy();
      else if (/^f_tree/.test(k)) { if (dead) { const h = o.displayHeight; o.setTexture('war_deadtree'); o.setScale(h / o.height); } o.setTint(0x4a3c32); this.burnTrees.push(o); }
    });
    const pl = this.player, dp = pl ? Math.hypot(pl.x - A.x, pl.y - A.y) : 1e9;   // the landing shakes the screen of whoever is close
    if (!this.bot && dp < 1500) this.cameras.main.shake(1100, 0.004 + 0.016 * (1 - dp / 1500));
    if (this.net?.role !== 'client') this.bossBanner('¡ZONA DE GUERRA!', 'El centro del mapa ha cambiado');   // clients get the banner from the host
  },
  runRobot(f) {
    const bs = f.bs, A = ARENA_ROBOT, tg = this.bossTargets(f, 900), t = tg[0];
    if (!t) return; f.setAim(t.x - f.x, t.y - f.y);
    const d = dist(f, t), near = tg.filter(e => dist(e, f) < 380);
    if (near.length && bs.cd.s <= 0) {   // stomp: damage + knockback around it
      bs.cd.s = 11; this.audio.play('mecha_servo', { at: f, gap: 0, vol: 1 }); this.tel(f.x, f.y, 380, 1.0, 0xff4a3a); this.bossCast(f, 'stomp', 1.0, 1.4, () => {
        this.vfx('shockwave', f.x, f.y - 10, { scale: 10, below: true }); this.audio.play('mecha_step', { at: f, gap: 0, vol: 1 }); this.audio.play('explosion_big', { at: f, gap: 0, vol: 0.6 }); this.cameras.main.shake(320, 0.008);
        this.enemiesNear(NEUTRAL, f.x, f.y, 380).forEach(e => { if (!this.bossCanAttack(f, e)) return; this.damage(f, e, 130, 'physical'); const dx = e.x - f.x, dy = e.y - f.y, dd = Math.hypot(dx, dy) || 1; e.shove = { vx: dx / dd * 800, vy: dy / dd * 800, t: 0.4 }; e.carriedT = Math.max(e.carriedT || 0, 0.4); });
      }); return;
    }
    if (d < 480 && bs.cd.f <= 0) { bs.cd.f = 7; this.audio.play('mecha_flame', { at: f, gap: 0, vol: 1 }); this.audio.play('mecha_servo', { at: f, gap: 0, vol: 0.6 }); this.bossCast(f, 'flame', 0.3, 2.9, null); bs.fl = { t: 2.6, tick: 0, ang: Math.atan2(t.y - f.y, t.x - f.x) }; return; }
    if (bs.cd.m <= 0) { bs.cd.m = 8; this.audio.play('mecha_servo', { at: f, gap: 0, vol: 0.6 }); this.bossCast(f, 'mg', 0.3, 3.2, null); bs.mg = { t: 3, tick: 0 }; return; }
    this.chainSkill(f, [['s', near.length > 0], ['f', d < 480], ['m', true]], () => this.runRobot(f));
  },
  robotFx(f, dt) {   // continuous attacks of the robot (flames / machine guns), driven from here so they keep going while it is "casting"
    const bs = f.bs; if (!bs || f.bossKind !== 'robot') return;
    if (bs.fl) {
      const q = bs.fl; q.t -= dt; q.tick -= dt; const t = this.bossTargets(f, 600)[0];
      if (t) { const want = Math.atan2(t.y - f.y, t.x - f.x); let df = want - q.ang; df = Math.atan2(Math.sin(df), Math.cos(df)); q.ang += Math.max(-1.1 * dt, Math.min(1.1 * dt, df)); }
      f.ax = Math.cos(q.ang); f.ay = Math.sin(q.ang);
      if (q.tick <= 0) {
        q.tick = 0.18; this.tel(f.x, f.y, 470, 0.26, 0xff7a2a, { a: q.ang, h: 0.45 });
        for (let k = 1; k <= 4; k++) this.vfx('burning_ground', f.x + f.ax * 110 * k, f.y + f.ay * 90 * k - 10, { scale: 1.2 + k * 0.35, alpha: 0.85 });
        this.enemiesOf(f).forEach(e => { if (e.isTower) return; const dx = e.x - f.x, dy = e.y - f.y, dd = Math.hypot(dx, dy); if (dd > 470 || dd < 20) return; const a = Math.atan2(dy, dx); if (Math.abs(Math.atan2(Math.sin(a - q.ang), Math.cos(a - q.ang))) < 0.45) this.damage(f, e, 15, 'magic'); });
      }
      if (q.t <= 0) bs.fl = null;
    }
    if (bs.mg) {
      const q = bs.mg; q.t -= dt; q.tick -= dt;
      if (q.tick <= 0) {
        q.tick = 0.16; const t = this.bossTargets(f, 900)[0]; if (t) {
          const base = Math.atan2(t.y - f.y, t.x - f.x); for (const off of [-0.55, 0, 0.55]) this.tel(f.x, f.y, 900, 0.2, 0xffd23f, { a: base + off, h: 0.05 });
          for (const off of [-0.55, 0, 0.55]) { const a = base + off + rnd(-0.06, 0.06), dx = Math.cos(a), dy = Math.sin(a); this.castCtx = { f, k: 'boss' }; this.projectile(f, { from: { x: f.x + dx * 70 + (off ? -dy * off * 60 : 0), y: f.y + dy * 50 }, dir: { x: dx, y: dy }, lift: f.def.height * (0.45 + 0.15 * off), range: 950, speed: 950, dmg: 13, type: 'physical', vfx: 'bullet_tracer', scale: 1.1, r: 9 }); this.castCtx = null; }
          this.audio.play('mecha_mg', { at: f, gap: 100, vol: 0.7 });
        }
      }
      if (q.t <= 0) bs.mg = null;
    }
  },

  // ---------- rewards ----------
  bossDead(v, killer) {
    if (!v.bossKind || this.net?.role === 'client') return;
    const kc = killer?.owner || killer, team = kc?.isChamp ? kc.team : this.champs.filter(c => c.alive).sort((a, b) => dist(a, v) - dist(b, v))[0]?.team;
    if (team !== 0 && team !== 1) return;
    const mates = this.champs.filter(c => c.team === team && c.alive), me = this.player, tn = team === 0 ? 'azul' : 'rojo';
    if (v.bossKind === 'beast') {
      const roll = [0, 1].map(() => ({ k: pickOf(PERM_KEYS), n: 1 + (Math.random() * 3 | 0) })), team4 = this.champs.filter(c => c.team === team);   // one roll for the whole team (x1, x2 or x3 each), dead teammates included
      team4.forEach(c => { c.gold += 350; roll.forEach(({ k, n }) => { c.perm[k] = (c.perm[k] || 0) + n; (c.beastUp ||= {})[k] = (c.beastUp[k] || 0) + n; }); c.recomputeItems(); if (c === me) this.float(c.x, c.y - c.def.height - 40, '+350 oro · ' + roll.map(({ k, n }) => `${STAT_LABEL[k]} x${n}`).join(' · '), '#ffd23f'); this.vfx('levelup', c.x, c.y - 20, { scale: 3.4 }); });
      this.bossBanner('¡BESTIA ELIMINADA!', `El equipo ${tn} recibe oro y mejoras`);
    } else if (v.bossKind === 'captain') {
      this.eliteT[team] = 180; mates.forEach(c => { c.gold += 200; });
      this.bossBanner('¡CAPITÁN ELIMINADO!', `Tropas especiales en todas las líneas del equipo ${tn} durante 3 min`);
    } else if (v.bossKind === 'robot') {
      this.bossBanner('¡ROBOT DESTRUIDO!', `El equipo ${tn} recibe una mejora`);
      const opts = Object.keys(BUFFS).sort(() => Math.random() - 0.5).slice(0, 3), all = this.champs.filter(c => c.team === team);   // ONE upgrade for the whole team (dead teammates included)
      if (this.net?.role === 'host') { this.bossVote = { team, opts, t: 25 }; this.net.onBoss('bp', { team, opts }); }   // online: the winning team's players pick (first answer counts), random after 25 s
      else if (me?.team === team && !this.net) { this.bossPick = { cards: opts.map(id => ({ type: 'buff', id })), title: '¡ROBOT DESTRUIDO!', sub: 'Elige una de las tres mejoras: la recibe todo tu equipo', for: all }; this.survHold(true); this.player.in = { mx: 0, my: 0, run: false }; }
      else { const id = pickOf(opts); all.forEach(c => this.bossGrant(c, id)); }
    }
  },
  bossGrant(c, id) {
    const b = BUFFS[id]; c.buffs = c.buffs || {}; c.buffs[id] = (c.buffs[id] || 0) + 1; for (const k in b.bonus) c.bonus[k] = (c.bonus[k] || 0) + b.bonus[k]; c.recomputeItems();
    this.vfx('levelup', c.x, c.y - 20, { scale: 3.6, tint: b.col }); this.float(c.x, c.y - c.def.height - 40, b.name, '#' + b.col.toString(16).padStart(6, '0'));
  },
  bossVoteEnd(id) {   // online (host): grants the chosen upgrade to the whole winning team and closes everyone's window
    const v = this.bossVote; if (!v) return; this.bossVote = null; this.champs.filter(c => c.team === v.team).forEach(c => this.bossGrant(c, id)); this.net?.onBoss('bpd');
  },
  bossVoteChoose(f, i) { const v = this.bossVote; if (v && f?.team === v.team) this.bossVoteEnd(v.opts[i] ?? pickOf(v.opts)); },
  bossChoose(i) { const p = this.bossPick, c = p?.cards[i]; if (!c) return; if (this.net) { this.net.op('bpick', i); this.bossPick = null; return; } [].concat(p.for).forEach(m => this.bossGrant(m, c.id)); this.bossPick = null; this.survHold(false); },
  curPick() {
    if (this.sv?.pick) return { cards: this.sv.pick.cards, title: `¡NIVEL ${this.player.level}!`, sub: this.sv.picks > 1 ? `Elige una mejora (te quedan ${this.sv.picks - 1} más por elegir) · teclas 1 2 3` : 'Elige una mejora · teclas 1 2 3', choose: i => this.survChoose(i) };
    if (this.bossPick) return { ...this.bossPick, sub: this.bossPick.sub + ' · teclas 1 2 3', choose: i => this.bossChoose(i) };
    return null;
  },
};
