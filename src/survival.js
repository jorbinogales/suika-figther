// Survival mode: one champion on a completely open map, endless waves of bugs / robots. Every level up = pick 1 of 3 cards (skill upgrade, item or permanent prompt).
// Arena methods are mixed in at the bottom of world.js (Object.assign(Arena.prototype, SurvivalMixin)).
import { ABILITY_KEYS, CHAMPIONS, MAX_RANK, ULT_LEVELS } from './data.js';
import { ITEMS, ITEM_BY_ID, buyPlan, PERMS, SLOTS } from './items.js';
import { Fighter, BODY_R } from './fighter.js';
import { WORLD_W, WORLD_H } from './mapdata.js';
import { buffCardInfo } from './bosses.js';

// key: cost in the wave budget, xp, first wave it can appear, spawn weight
const MOBS = {
  roach:             { cost: 1, xp: 4,  from: 1, wt: 6 },
  minion_red_melee:  { cost: 2, xp: 9,  from: 1, wt: 5 },
  minion_red_ranged: { cost: 3, xp: 13, from: 3, wt: 3 },
  minion_red_auto:   { cost: 6, xp: 28, from: 5, wt: 1.5 },
};
const MOB_CAP = 70, KEY_OF = { p1: 'Q', p2: 'F', p3: 'E', ult: 'R' };
export const svBest = () => { try { return +localStorage.getItem('suika_surv_best') || 0; } catch (e) { return 0; } };

export const SurvivalMixin = {
  survInit() {
    const p = this.player; p.points = 0; p.gold = 0;
    this.sv = { wave: 0, phase: 'rest', t: 4, queue: [], spawnT: 0, kills: 0, time: 0, picks: 1, pick: null, alive: 0 };   // the first card is offered right at the start
    this.mobs = [];
  },

  // ---- wave director ----
  survTick(dt) {
    const s = this.sv, p = this.player; if (this.over || !s) return;
    s.time += dt;
    this.mobs = this.fighters.filter(f => f.surv && f.alive); s.alive = this.mobs.length;
    if (!p.alive) { this.survEnd(); return; }
    if (s.picks > 0 && !s.pick) { this.survOpenPick(); return; }
    if (s.phase === 'rest') { if ((s.t -= dt) <= 0) this.survStartWave(); return; }
    if ((s.spawnT -= dt) <= 0 && s.queue.length && s.alive < MOB_CAP) { this.survSpawn(s.queue.shift()); s.spawnT = Math.max(0.08, 0.3 - s.wave * 0.008); }
    if (!s.queue.length && !s.alive) {   // wave cleared: a short breather and a bit of health / mana back
      s.phase = 'rest'; s.t = 7; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25); p.mana = Math.min(p.maxMana, p.mana + p.maxMana * 0.4);
      this.showBanner({ title: `OLEADA ${s.wave} SUPERADA`, sub: 'Respira: la siguiente llega pronto', team: 2 }, 2400); this.audio.play('ui_upgrade', { gap: 0, vol: 0.8 });
      this.float(p.x, p.y - p.def.height - 40, '+25% vida', '#5dff8a');
    }
  },
  survStartWave() {
    const s = this.sv, n = ++s.wave, boss = n % 5 === 0; s.phase = 'fight'; s.spawnT = 0;
    let budget = 4 + 3 * n + 0.3 * n * n; const q = [];
    if (boss) { q.push('boss'); budget *= 0.55; }
    const pool = Object.keys(MOBS).filter(k => MOBS[k].from <= n);
    while (budget > 0) {
      const ok = pool.filter(k => MOBS[k].cost <= budget); if (!ok.length) break;
      let r = Math.random() * ok.reduce((a, k) => a + MOBS[k].wt, 0), k = ok[0]; for (const c of ok) { r -= MOBS[c].wt; if (r <= 0) { k = c; break; } }
      q.push(k); budget -= MOBS[k].cost;
    }
    s.queue = q.sort(() => Math.random() - 0.5);
    const bi = q.indexOf('boss'); if (bi > 0) { q.splice(bi, 1); q.unshift('boss'); }
    this.showBanner({ title: boss ? `¡OLEADA ${n}: JEFE!` : `OLEADA ${n}`, sub: boss ? 'Un autómata gigante se acerca' : `${q.length} enemigos en camino`, team: 2 }, 2600);
    this.audio.play(boss ? 'explosion_big' : 'minion_yell', { gap: 0, vol: 0.7 });
  },
  survSpawn(kind) {
    const s = this.sv, n = s.wave, p = this.player, boss = kind === 'boss', key = boss ? 'minion_red_auto' : kind, m = MOBS[key];
    let x = p.x, y = p.y;
    for (let i = 0; i < 8; i++) {   // on a ring just outside the screen
      const a = Math.random() * 6.283; x = p.x + Math.cos(a) * (760 + Math.random() * 200); y = p.y + Math.sin(a) * (470 + Math.random() * 120);
      if (x > 80 && x < WORLD_W - 80 && y > 130 && y < WORLD_H - 130) break;
    }
    x = Math.max(80, Math.min(WORLD_W - 80, x)); y = Math.max(130, Math.min(WORLD_H - 130, y));
    const hp = (1 + 0.1 * (n - 1) + 0.012 * n * n) * (boss ? 9 : 1);
    const f = new Fighter(this, key, 1, x, y, key === 'roach' ? { ai: true, botAp: 6 + 1.3 * n, hpMult: hp } : { ai: true, hpMult: hp });
    f.surv = true; f.survXp = Math.round((boss ? 220 : m.xp) * (1 + 0.04 * n)); f.dmgMult = (1 + 0.06 * (n - 1)) * (boss ? 2.2 : 1); f.laneI = 1; f.hp = f.maxHp;
    this.fighters.push(f);
    if (boss) this.float(f.x, f.y - f.def.height - 20, '¡JEFE!', '#ff6a6a');
  },
  runMob(f) {   // hunts the player (or whatever is blocking the way); never stops, never follows lanes
    const p = this.player; if (!p.alive) return;
    const t = this.nearestEnemy(f, 160) || p, dx = t.x - f.x, dy = t.y - f.y, dd = Math.hypot(dx, dy) || 1, d = dd - (t.br - BODY_R), range = f.def.stats.range;
    f.setAim(dx, dy);
    if (d > range * 0.85) { f.in.mx = dx / dd; f.in.my = dy / dd; } else if (range > 150 && d < range * 0.4) { f.in.mx = -dx / dd; f.in.my = -dy / dd; }
    let sx = 0, sy = 0; for (const o of this.mobs) { if (o === f) continue; const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy); if (od < 46 && od > 0.01) { sx += ox / od * (46 - od) / 46; sy += oy / od * (46 - od) / 46; } }   // spread out instead of stacking
    f.in.mx += sx * 0.9; f.in.my += sy * 0.9;
    if (d <= range) f.tryBasic();
  },
  survKill(v) {   // reward: xp (and a bit of health) straight to the player
    const s = this.sv, p = this.player; s.kills++; if (!p.alive) return;
    p.gainXp(v.survXp); this.float(v.x + 20, v.y - v.def.height - 8, `+${v.survXp}xp`, '#7ee0ff');
    p.hp = Math.min(p.maxHp, p.hp + 1 + s.wave * 0.5);
  },
  survEnd() {
    if (this.over) return; const s = this.sv;
    this.over = { winner: 1, t: 0, surv: true }; s.pick = null; this.survHold(false);
    try { if (s.wave > svBest()) { localStorage.setItem('suika_surv_best', String(s.wave)); s.record = true; } } catch (e) { /* ignore */ }
    this.audio.play('ui_defeat', { gap: 0, vol: 1 }); this.cancelAim();
  },

  // ---- level-up cards ----
  survHold(on) {   // freezes the world while a card window is open
    if (on) { this.anims.pauseAll(); this.tweens.pauseAll(); this.time.paused = true; } else if (!this.paused) { this.anims.resumeAll(); this.tweens.resumeAll(); this.time.paused = false; }
  },
  survOpenPick() {
    const cards = this.survCards(); if (!cards.length) { this.sv.picks = 0; return; }
    this.sv.pick = { cards, t: 0 }; this.survHold(true); this.cancelAim(); this.player.in = { mx: 0, my: 0, run: false };
    this.audio.play('levelup', { gap: 0, vol: 0.8 });
  },
  survCards() {
    const p = this.player, skills = [], items = [], perms = [];
    for (const k of ABILITY_KEYS) {
      if (p.ranks[k] >= MAX_RANK || (k === 'ult' && p.level < ULT_LEVELS[p.ranks.ult])) continue;
      if (!p.ranks[k] && p.def.alt?.[k]) [0, 1].forEach(b => skills.push({ type: 'skill', k, b, a: b ? p.def.alt[k] : CHAMPIONS[p.key].abilities[k] }));
      else skills.push({ type: 'skill', k, b: p.branch[k] || 0, a: p.def.abilities[k] });
    }
    const tier = p.level < 6 ? 1 : p.level < 12 ? 2 : 3, have = new Set(p.inv.filter(Boolean).map(q => q.id));
    for (const it of ITEMS) {
      if (it.consumable || it.lvl > tier || (it.lvl === 1 && tier > 2) || !Object.keys(it.stats).length && !it.active && !it.passive) continue;
      const plan = buyPlan(p.inv, it.id); if (!plan.ok) continue;
      const owns = it.recipe ? it.recipe.filter(r => have.has(r)).length : 0;
      items.push({ type: 'item', id: it.id, w: 1 + owns * 3 });
    }
    PERMS.forEach(pm => perms.push({ type: 'perm', id: pm.id, stat: pm.stat }));
    const take = (arr, weighted) => { if (!arr.length) return null; const tot = weighted ? arr.reduce((a, c) => a + c.w, 0) : arr.length; let r = Math.random() * tot, i = 0; if (weighted) { for (; i < arr.length; i++) { r -= arr[i].w; if (r <= 0) break; } } else i = Math.random() * arr.length | 0; return arr.splice(Math.min(i, arr.length - 1), 1)[0]; };
    const out = [], first = skills.length && !skills.every(c => c.k === skills[0].k) ? take(skills) : null;
    if (first) out.push(first); else if (skills.length) { out.push(take(skills)); }
    const it1 = take(items, true); if (it1) out.push(it1);
    const rest = [...skills, ...items.slice(), ...perms];   // fill the rest with anything not already offered
    while (out.length < 3 && rest.length) { const c = take(rest), dup = out.some(o => o.type === c.type && (o.id ? o.id === c.id : o.k === c.k && o.b === c.b)); if (!dup && !(c.type === 'perm' && out.some(o => o.type === 'perm'))) out.push(c); }
    return out.slice(0, 3).sort(() => Math.random() - 0.5);
  },
  survChoose(i) {
    const s = this.sv, c = s.pick?.cards[i], p = this.player; if (!c) return;
    if (c.type === 'skill') { p.points++; p.spend(c.k, c.b); }
    else if (c.type === 'item') this.survGive(c.id);
    else { p.perm[c.stat] = (p.perm[c.stat] || 0) + 1; p.recomputeItems(); this.audio.play('ui_upgrade', { gap: 0, vol: 0.8 }); this.vfx('levelup', p.x, p.y - 20, { scale: 3 }); }
    s.picks--; s.pick = null; this.survHold(false);
    this.float(p.x, p.y - p.def.height - 36, 'NIVEL ' + p.level, '#ffe066');
  },
  survGive(id) {   // a free item: components already carried are consumed (crafting), otherwise it takes an empty slot
    const p = this.player, plan = buyPlan(p.inv, id); if (!plan.ok) return false;
    plan.use.forEach(i => { p.inv[i] = null; }); const slot = p.inv.indexOf(null); if (slot < 0 || slot >= SLOTS) return false;
    p.inv[slot] = { id, cd: 0, charges: 0 }; p.recomputeItems(); this.audio.play(plan.use.length ? 'ui_upgrade' : 'ui_confirm', { gap: 0, vol: 0.8 }); this.vfx('levelup', p.x, p.y - 20, { scale: 3 });
    return true;
  },
  survCardInfo(c) {   // text of a card for the window
    const p = this.player;
    if (c.type === 'buff') return buffCardInfo(c);
    if (c.type === 'skill') { const r = p.ranks[c.k], a = c.a; return { tag: r ? `MEJORAR · ${KEY_OF[c.k]}` : `NUEVO PODER · ${KEY_OF[c.k]}`, name: a.name, sub: r ? `Rango ${r} → ${r + 1}` : 'Rango 1', desc: a.short || (a.desc.length > 170 ? a.desc.slice(0, 167) + '...' : a.desc), icon: 'icon_' + a.icon, col: 0x3fd0ff };
    }
    if (c.type === 'item') { const it = ITEM_BY_ID[c.id]; return { tag: 'OBJETO · NIVEL ' + it.lvl, name: it.name, sub: Object.keys(it.stats).map(k => k).length ? '' : '', desc: it.desc, icon: 'item_' + it.id, stats: it.stats, col: 0xffd23f }; }
    const pm = PERMS.find(q => q.id === c.id); return { tag: 'PROMPT PERMANENTE', name: pm.name, sub: '', desc: pm.desc, icon: 'stat_' + pm.stat, stats: pm.stats, col: 0xff4a4a };
  },
};
