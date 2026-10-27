import { ABILITY_KEYS, aimSpec, rk } from './data.js';
import { ITEM_BY_ID, nextAffordable } from './items.js';
import { dist, BODY_R } from './fighter.js';

// Champion AI: picks targets, respects tower range, retreats when hurt, escorts minions and uses every ability with per-ability rules.
const HOME_X = f => f.spawn.x;
const SIDE = f => (f.team === 0 ? 1 : -1);   // direction toward the enemy base (uses the current team: a charmed champion fights for the other side)

function towersOf(w, team) { return w.fighters.filter(t => t.isTower && !t.isNexus && t.alive && t.team === team); }
const inTowerRange = (w, x, y, team, margin = 40) => w.fighters.some(t => t.isTower && !t.isNexus && t.alive && t.team !== team && Math.hypot(t.x - x, t.y - y) < t.def.stats.range + margin);

// abilities that are not "aim at the enemy": [champion:key] -> (f, ctx) => boolean
// gap closers drag/dash the caster toward the target: never use them to dive under an enemy tower
const MOVERS = new Set(['hector:p2', 'hector:ult', 'julio:p2']);
const RULES = {
  'xeviche:p2': (f, c) => c.hpR < 0.62 || (c.hpR < 0.8 && c.enemiesNear(350) === 0),
  'xeviche:ult': (f, c) => c.champNear(280) >= 1 || c.enemiesNear(280) >= 3,
  'hector:p1': (f, c) => c.hpR < 0.7 && c.enemiesNear(260) === 0,
  'hector:p3': (f, c) => c.enemiesNear(380) >= 1 && c.hpR < 0.95,
  'luis:p1': (f, c) => c.enemiesNear(800) >= 1 && !f.w.fighters.some(d => d.antivirus && d.owner === f && d.alive),
  'luis:p2': (f, c) => c.champNear(650) >= 1 && !f.invis && c.hpR > 0.4,
  'luis:p3': (f, c) => c.champNear(300) >= 1,
  'jorbi:ult': (f, c) => c.champNear(650) >= 2 || (c.hpR < 0.5 && c.champNear(550) >= 1),
  'axel:p2': (f, c) => c.hpR < 0.72 && c.enemiesNear(500) < 2 || c.hpR < 0.5,
  'axel:p3': (f, c) => c.champNear(520) >= 1 || c.enemiesNear(350) >= 3,
  'julio:ult': (f, c) => c.anyChampAlive && c.hpR > 0.3,
  'leandro:ult': (f, c) => c.champNear(750) >= 1,
  'leandro:p3': (f, c) => c.target && c.d < 230 && c.hpR < 0.65,
  'eliud:ult': (f, c) => c.champNear(520) >= 1,
};

function tryAbilities(w, f, c) {
  const order = ['ult', 'p3', 'p1', 'p2'];
  for (const k of order) {
    const a = f.def.abilities[k], rank = f.ranks[k];
    if (!a || !rank || a.passive || f.cds[k] > 0 || f.silenceT > 0 || f.charmT > 0 || !f.free) continue;
    if (f.key === 'jorbi' && k === 'p2') { if (jorbiDash(w, f, c)) return true; continue; }
    if (a.mana && f.mana < rk(a.mana, rank) * 1.0) continue;
    const key = f.key + ':' + k, spec = aimSpec(f.key, k, rank, f);
    if (MOVERS.has(key) && c.target && c.danger(c.target)) continue;
    let ok = false, point = null;
    if (RULES[key]) ok = RULES[key](f, c);
    else if (c.target) {
      const t = c.target, d = c.d;
      const champ = t.isChamp;
      if (!champ && (k === 'ult' || f.mana < f.maxMana * 0.55)) continue;   // save real skills for champions
      if (spec.type === 'line') ok = d <= spec.range * 0.9;
      else if (spec.type === 'zone') { ok = d <= spec.max + spec.radius * 0.5; const r = Math.min(d, spec.max), u = Math.max(1, d); point = { x: f.x + (t.x - f.x) / u * r, y: f.y + (t.y - f.y) / u * r }; }
      else if (spec.type === 'trapezoid') ok = d <= spec.length * 0.9;
      else if (spec.type === 'circle') ok = d <= spec.radius + t.br;
      else if (spec.type === 'wall') ok = c.hpR < 0.6 && d < spec.max + 120;
      else if (spec.type === 'pick') { ok = champ && d <= spec.radius; point = { x: t.x, y: t.y }; }
      if (k === 'ult' && ok && champ && !(t.hp < t.maxHp * 0.6 || c.champNear(500) >= 2)) ok = false;   // ults: finish low targets or big fights
    }
    if (!ok) continue;
    if (c.target) f.setAim(c.target.x - f.x, c.target.y - f.y);
    f.castPoint = point;
    if (f.tryCast(k)) return true;
    f.castPoint = null;
  }
  return false;
}

function jorbiDash(w, f, c) {
  if (f.dashCharges <= 0 || !f.free) return false;
  const t = c.target;
  if (f.retreat && c.enemiesNear(300) >= 1) { f.setAim(f.spawn.x - f.x, f.spawn.y - f.y); return f.tryCast('p2'); }   // dash home
  if (t && t.isChamp && c.d > 230 && c.d < 520 && f.dashCharges >= 2 && c.hpR > 0.5 && !c.danger(t)) { f.setAim(t.x - f.x, t.y - f.y); return f.tryCast('p2'); }   // engage
  return false;
}

// ---- items: build order per role, shopping while in the base, potions and actives in combat ----
const BUILDS = {
  ap:   ['pocion_vida_peq', 'pantalla_holo', 'memoria_ram', 'antivirus_portatil', 'libro_algoritmos', 'procesador_cuantico', 'dron_combate', 'termo_cafe', 'nucleo_ia', 'botas_turbo'],
  ad:   ['pocion_vida_peq', 'teclado_mecanico', 'guantes_tacticos', 'casco_seguridad', 'bate_servidor', 'navaja_suiza', 'chaleco_antibalas', 'maletin_soldados', 'botas_turbo', 'escudo_emergencia'],
  tank: ['pocion_vida_peq', 'bateria_extendida', 'casco_seguridad', 'antivirus_portatil', 'escudo_firewall', 'armadura_rack', 'firewall_magico', 'corazon_silicio', 'sprint_energia', 'mortero_portatil'],
};
function itemAi(w, f, c, dt) {
  if (!f.isChamp || !f.alive) return;
  f.aiItemT = (f.aiItemT || 0) - 0.016;
  if (w.inBase(f) && f.aiItemT <= 0) {   // shop: next item of the build, then upgrades, then extra potions
    f.aiItemT = 1.5;
    const build = BUILDS[f.def.cls === 'cyber' ? 'tank' : f.def.stats.ap > f.def.stats.atk ? 'ap' : 'ad'];
    for (let n = 0; n < 4; n++) {   // craft the next item of the build; if it is too expensive, buy the components that are affordable
      const target = build.find(id => f.slotOf(id) < 0); if (!target) break;
      if (f.canBuy(target)) { f.buyItem(target); continue; }
      const part = nextAffordable(f.inv, target, f.gold); if (part && f.canBuy(part)) { f.buyItem(part); continue; }
      break;
    }
    { const want = f.def.cls === 'cyber' ? ['hp', 'armor', 'mr', 'speed'] : f.def.stats.ap > f.def.stats.atk ? ['ap', 'cdr', 'mana', 'speed'] : ['atk', 'aspd', 'lifesteal', 'hp'];   // spare gold goes into permanent upgrades
      const k = want.find(x => f.canBuyPerm(x) && f.gold > 700); if (k) f.buyPerm(k); }
    const pot = f.slotOf('pocion_vida_peq'); if (pot >= 0 && f.inv[pot].charges < 3 && f.canBuy('pocion_vida_peq')) f.buyItem('pocion_vida_peq');
  }
  // trip home to spend gold when it is safe and something is affordable
  if (!w.inBase(f)) {
    const build = BUILDS[f.def.cls === 'cyber' ? 'tank' : f.def.stats.ap > f.def.stats.atk ? 'ap' : 'ad'], next = build.find(id => f.slotOf(id) < 0);
    const need = next ? ITEM_BY_ID[next].cost : 600;
    if (f.gold >= need + 250 && c.champNear(650) === 0 && f.hp / f.maxHp > 0.5) f.wantShop = true;
    if (f.wantShop) { f.retreat = true; if (c.enemiesNear(300) >= 1 && f.hp / f.maxHp < 0.5) f.wantShop = false; }
  } else if (f.aiItemT > 0 && f.aiItemT < 1.0) f.wantShop = false;   // shopped for a moment: back to the lane
  // potions when hurt, actives in fights
  const hpR = f.hp / f.maxHp;
  f.inv.forEach((sl, i) => {
    if (!sl) return; const it = ITEM_BY_ID[sl.id];
    if (it.consumable) { if (it.consumable.hp && hpR < 0.4 && !f.potions.length) f.useItem(i); else if (it.consumable.mana && !it.consumable.hp && f.maxMana && f.mana < f.maxMana * 0.2) f.useItem(i); return; }
    if (!it.active || sl.cd > 0) return;
    const a = it.active.type, foes = c.enemiesNear(520);
    if (a === 'mortar' || a === 'soldiers' || a === 'drone') { if (foes >= 1 && c.target && !c.target.isTower) f.useItem(i); }
    else if (a === 'shield') { if (hpR < 0.5 && c.enemiesNear(350) >= 1) f.useItem(i); }
    else if (a === 'sprint') { if (f.retreat && c.enemiesNear(450) >= 1) f.useItem(i); }
    else if (a === 'smoke') { if (c.enemiesNear(240) >= 2 || (f.retreat && c.enemiesNear(240) >= 1)) f.useItem(i); }
  });
}

export function runChampAi(w, f, dt) {
  f.in = { mx: 0, my: 0, run: false };
  if (!f.alive || f.away) return;
  const range = f.atkRange, hpR = f.hp / f.maxHp, dir = SIDE(f), home = f.charmT > 0 ? { x: f.team === 0 ? 420 : 3200 - 420, y: w.laneY } : { x: f.spawn.x, y: f.spawn.y };
  if (f.charmT > 0) f.retreat = false;
  // ---- retreat with hysteresis ----
  if (hpR < 0.33) f.retreat = true; else if (hpR > 0.8) f.retreat = false;
  const toHome = dist(f, home);
  const foes = w.enemiesOf(f), mates = w.fighters.filter(m => m.alive && m.team === f.team && m !== f);
  const enemiesNear = r => foes.filter(e => !e.isTower && !e.invis && dist(e, f) <= r).length;
  const champNear = r => foes.filter(e => e.isChamp && !e.invis && dist(e, f) <= r).length;
  const allyChampNear = r => mates.filter(m => m.isChamp && dist(m, f) <= r).length;
  // outnumbered: more enemy champions than allies close by -> fall back
  const outnumbered = champNear(600) > allyChampNear(700) + 1 && hpR < 0.75;
  if (outnumbered) f.retreat = true;
  // ---- target choice: champions first, low health preferred, never invisible ones ----
  const sight = f.blindT > 0 ? 150 : 900;
  let target = null, best = 1e9;
  for (const e of foes) {
    if (e.invis && !f.isTower) continue;
    const d = dist(e, f) - (e.br - BODY_R); if (d > sight) continue;
    const score = d - (e.isChamp ? 160 : 0) - (e.isChamp ? (1 - e.hp / e.maxHp) * 220 : 0) + (e.isTower ? 260 : 0);
    if (score < best) { best = score; target = e; }
  }
  const d = target ? dist(target, f) - (target.br - BODY_R) : 1e9;
  // ---- tower safety: do not walk into enemy tower range unless a friendly minion soaks the shots ----
  const minionCover = mates.some(m => m.isMinion && dist(m, f) < 320 && towerBetween(w, f, m));
  const danger = x => inTowerRange(w, x.x, x.y, f.team, 20) && !minionCover;
  const ctx = { hpR, target, d, enemiesNear, champNear, anyChampAlive: foes.some(e => e.isChamp), danger };
  itemAi(w, f, ctx, dt);
  let wantX = 0, wantY = 0, move = false, runFast = false;
  if (f.retreat) {   // run home (heals at the fountain, see Fighter.update)
    wantX = home.x - f.x; wantY = home.y - f.y; move = toHome > 25; runFast = true;
    if (enemiesNear(420) >= 1) tryAbilities(w, f, ctx);   // still use escapes / shields while fleeing
    if (target && d <= range && champNear(300) === 0) f.tryBasic();
  } else if (target) {
    f.setAim(target.x - f.x, target.y - f.y);
    const ranged = range > 150, hold = ranged ? range * 0.72 : range * 0.85;
    const nextPos = { x: f.x + (target.x - f.x) * 0.15, y: f.y + (target.y - f.y) * 0.15 };
    const walkingIntoTower = danger(nextPos) && !danger(f);
    if (d > hold && !(walkingIntoTower && !target.isTower) && !(target.isTower && !minionCover && d > range * 0.9 && mates.every(m => !m.isMinion || dist(m, target) > 200))) { wantX = target.x - f.x; wantY = target.y - f.y; move = true; }
    else if (ranged && d < range * 0.45) { wantX = f.x - target.x; wantY = f.y - target.y; move = true; }
    else if (danger(f) && !minionCover) { wantX = f.x - dir * 100 - f.x; wantY = 0; move = true; }   // step out of tower range
    if (tryAbilities(w, f, ctx)) { /* cast */ }
    else if (d <= range && f.free) f.tryBasic();
  } else {
    // ---- no target: push the lane behind the minions (never far ahead of them) ----
    const front = mates.filter(m => m.isMinion).reduce((mx, m) => (dir > 0 ? Math.max(mx, m.x) : Math.min(mx, m.x)), dir > 0 ? -1e9 : 1e9);
    const hasM = Math.abs(front) < 1e8;
    const limit = hasM ? front - dir * 90 : home.x + dir * 900;
    const ahead = dir > 0 ? f.x > limit : f.x < limit;
    if (!ahead) { wantX = dir; move = true; }
    else if (Math.abs(f.x - limit) > 60) { wantX = -dir; move = true; }
    wantY = (w.laneY + ((f.aiLane || 0) * 40) - f.y) * 0.05;
    if (f.mana < f.maxMana * 0.2 || hpR < 0.5) tryAbilities(w, f, ctx);
    f.setAim(wantX || dir, wantY);
  }
  if (move) { const l = Math.hypot(wantX, wantY) || 1; f.in.mx = wantX / l; f.in.my = wantY / l + 0; f.in.run = runFast; }
  else if (wantY) f.in.my = Math.sign(wantY) * Math.min(1, Math.abs(wantY));
}

// is a tower on the segment between the AI and a minion (so the minion is closer to the tower)?
function towerBetween(w, f, m) {
  return w.fighters.some(t => t.isTower && !t.isNexus && t.alive && t.team !== f.team && Math.hypot(t.x - m.x, t.y - m.y) <= Math.hypot(t.x - f.x, t.y - f.y));
}
