// Shop recommendations: 3 items that fit YOUR champion and counter the enemy team (+ who each one is effective against), the champion's 6-item preset build,
// and follow-ups: after buying a recommended item the shop offers its complement (the other ingredient) and the next item (the one that uses it).
import { ITEMS, ITEM_BY_ID, STAT_LABEL, buyPlan } from './items.js';

// champion profile used for recommendations (role, damage type, the crowd control he brings)
export const PROFILE = {
  leandro:  { role: 'Mago',      dmg: 'ap',  melee: false, cc: ['aturdimiento'] },
  xeviche:  { role: 'Mago',      dmg: 'ap',  melee: false, cc: ['control'] },
  julio:    { role: 'Mago',      dmg: 'ap',  melee: false, cc: ['ralentización'] },
  axel:     { role: 'Soporte',   dmg: 'mix', melee: false, cc: ['silencio', 'ralentización', 'veneno'] },
  yonaiker: { role: 'Tirador',   dmg: 'ad',  melee: false, cc: ['silencio', 'ceguera'] },
  eliud:    { role: 'Tirador',   dmg: 'ad',  melee: false, cc: [] },
  luis:     { role: 'Asesino',   dmg: 'mix', melee: true,  cc: ['silencio', 'control'] },
  jorbi:    { role: 'Luchador',  dmg: 'ad',  melee: true,  cc: ['ralentización'] },
  junior:   { role: 'Luchador',  dmg: 'ad',  melee: true,  cc: ['aturdimiento'] },
  hector:   { role: 'Tanque',    dmg: 'ad',  melee: true,  cc: ['aturdimiento'] },
};
const ROLE_DEF = { Tanque: 0.65, Luchador: 0.4, Soporte: 0.3, Asesino: 0.2, Mago: 0.2, Tirador: 0.2 };   // how much a role cares about surviving
const ROLE_OFF = { Tanque: 0.5, Luchador: 0.9, Soporte: 0.8, Asesino: 1, Mago: 1, Tirador: 1 };          // ... and about its own damage

// the 6 preset items of every champion, in build order
export const PRESETS = {   // level-3 (purple) items only
  leandro:  ['nucleo_ia', 'tarjeta_grafica', 'procesador_cuantico', 'firewall_magico', 'botas_hipersonicas', 'servidor_redundante'],
  xeviche:  ['nucleo_ia', 'tarjeta_grafica', 'procesador_cuantico', 'firewall_magico', 'corazon_silicio', 'botas_hipersonicas'],
  julio:    ['procesador_cuantico', 'tarjeta_grafica', 'nucleo_ia', 'firewall_magico', 'botas_hipersonicas', 'servidor_redundante'],
  axel:     ['dron_combate', 'nucleo_ia', 'procesador_cuantico', 'firewall_magico', 'botas_hipersonicas', 'corazon_silicio'],
  yonaiker: ['bate_servidor', 'punio_acero', 'garras_vampiricas', 'botas_hipersonicas', 'chaleco_antibalas', 'filtro_spam'],
  eliud:    ['bate_servidor', 'punio_acero', 'garras_vampiricas', 'chaleco_antibalas', 'botas_hipersonicas', 'servidor_redundante'],
  luis:     ['punio_acero', 'garras_vampiricas', 'procesador_cuantico', 'botas_hipersonicas', 'chaleco_antibalas', 'filtro_spam'],
  jorbi:    ['punio_acero', 'garras_vampiricas', 'chaleco_antibalas', 'servidor_redundante', 'botas_hipersonicas', 'firewall_magico'],
  junior:   ['bate_servidor', 'chaleco_antibalas', 'corazon_silicio', 'garras_vampiricas', 'botas_hipersonicas', 'armadura_rack'],
  hector:   ['servidor_redundante', 'chaleco_antibalas', 'armadura_rack', 'firewall_magico', 'botas_hipersonicas', 'filtro_spam'],
};
export const presetOf = key => PRESETS[key] || PRESETS.jorbi;

const NORM = { atk: 1 / 6, ap: 1 / 8, armor: 1 / 6, mr: 1 / 6, hp: 1 / 60, mana: 1 / 50, speed: 1 / 0.02, aspd: 1 / 0.05, lifesteal: 1 / 0.04, cdr: 1 / 0.03, hpRegen: 1 / 1.2, manaRegen: 1 / 0.8 };
const LVL_F = { 1: 0.35, 2: 0.8, 3: 1 };
const names = list => list.map(f => f.key);   // champion keys (the shop draws their faces)

// ---- who is on the other team: damage mix, resistances, crowd control ----
export function analyse(enemies) {
  const list = enemies.map(f => { const ap = f.ap || 0, atk = f.atk || 0; return { f, ap, atk, apShare: ap + atk > 0 ? ap / (ap + atk) : 0.5, armor: f.armor || 0, mr: f.mr || 0, burst: ap + atk, cc: PROFILE[f.key]?.cc || [], melee: PROFILE[f.key]?.melee ?? true, heals: (f.it?.lifesteal || 0) > 0 || (f.it?.hpRegen || 0) > 1 || f.pas?.has?.('proteina_extra') || PROFILE[f.key]?.role === 'Soporte' }; });
  const n = list.length || 1, apShare = list.length ? list.reduce((a, e) => a + e.apShare, 0) / n : 0.5;
  return { list, n: list.length, apShare, adShare: 1 - apShare };
}

// stat the item is mainly about + who it is effective against: { names, reason }
export function counters(item, th, me) {
  const E = th.list, st = item.stats || {}, top = (arr, key, desc = true, k = 3) => arr.slice().sort((a, b) => desc ? b[key] - a[key] : a[key] - b[key]).slice(0, k).map(e => e.f.key);
  if (!E.length) return { names: [], reason: '', k: 0 };
  const units = Object.keys(st).reduce((a, k) => a + st[k] * (NORM[k] || 0), 0) || 1, share = k => (st[k] || 0) * NORM[k] / units;   // an item counts as a defensive counter only if that resistance is most of what it gives
  if (['cuarentena_digital', 'ransomware', 'espinas_firewall'].includes(item.id)) { const l = E.filter(e => e.heals); return { names: names(l.map(e => e.f)), reason: 'rivales que se curan (cortacuración)', k: 1.4 * l.length / E.length }; }
  if (item.consumable?.cleanse) { const l = E.filter(e => e.cc.length); return { names: names(l.map(e => e.f)), reason: 'control (aturdir, silenciar, ralentizar)', k: 0.8 * l.length / E.length }; }
  if (share('mr') >= 0.5) { const l = E.filter(e => e.apShare >= 0.5); return { names: top(l, 'ap'), reason: 'daño de poder de IA', k: 1.6 * l.length / E.length }; }
  if (share('armor') >= 0.5) { const l = E.filter(e => e.apShare < 0.5); return { names: top(l, 'atk'), reason: 'daño físico', k: 1.6 * l.length / E.length }; }
  if ((st.hp || 0) > 0 && !(st.atk || st.ap)) return { names: top(E, 'burst', true, 2), reason: 'daño explosivo', k: 0.7 };
  if ((st.ap || 0) > 0) return { names: top(E, 'mr', false, 2), reason: 'poca resistencia a la IA', k: 0.5 };
  if ((st.atk || 0) > 0 || (st.aspd || 0) > 0 || (st.lifesteal || 0) > 0) return { names: top(E, 'armor', false, 2), reason: 'poca armadura', k: 0.5 };
  if ((st.speed || 0) > 0) { const m = PROFILE[me.key]?.melee; const l = E.filter(e => e.melee !== m); return { names: names(l.map(e => e.f)).slice(0, 3), reason: m ? 'rivales a distancia (los alcanzas)' : 'rivales cuerpo a cuerpo (los esquivas)', k: 0.4 }; }
  if (item.active) { const l = E.filter(e => e.melee).concat(E.filter(e => !e.melee)).slice(0, 2); return { names: names(l.map(e => e.f)), reason: 'cualquier pelea', k: 0.2 }; }
  return { names: [], reason: '', k: 0 };
}
const mainStat = it => Object.keys(it.stats || {}).sort((a, b) => (it.stats[b] * (NORM[b] || 0)) - (it.stats[a] * (NORM[a] || 0)))[0];

function weights(me, th) {
  const pr = PROFILE[me.key] || { role: 'Luchador', dmg: 'ad' }, def = ROLE_DEF[pr.role] ?? 0.3, off = ROLE_OFF[pr.role] ?? 1, w = { speed: 0.25, hpRegen: 0.1 };
  if (pr.dmg === 'ap') Object.assign(w, { ap: 1, mana: 0.3, cdr: 0.5, manaRegen: 0.1 });
  else if (pr.dmg === 'ad') Object.assign(w, { atk: 1, aspd: 0.7, lifesteal: 0.5, cdr: 0.25 });
  else Object.assign(w, { atk: 0.6, ap: 0.6, cdr: 0.4, lifesteal: 0.2, aspd: 0.3 });
  for (const k of ['atk', 'ap', 'aspd', 'lifesteal', 'cdr']) if (w[k]) w[k] *= off;
  w.hp = def * 0.9; w.armor = def * (0.4 + th.adShare); w.mr = def * (0.4 + th.apShare);
  return w;
}

// score of every candidate item for this champion in this match
function score(it, me, th, w, inv, gold) {
  const pl = buyPlan(inv, it.id); if (!pl.ok) return null;
  let fit = 0, units = 0; for (const k in it.stats) { const v = it.stats[k] * (NORM[k] || 0); units += v; fit += v * (w[k] || 0); }
  if (it.active) fit += 0.5; if (it.passive && !it.passive.mini) fit += 0.4;
  const c = counters(it, th, me), bonus = c.names.length ? c.k * Math.min(units, 4) * 0.5 : 0;
  const afford = gold >= pl.gold ? 1 : Math.max(0.08, gold / pl.gold) ** 1.6,   // what you cannot pay yet counts much less: early on you get components and level-2 items, not 1000-gold finishers
       prog = 1 + 0.25 * (pl.use?.length || 0);
  return { it, score: (fit + bonus) * (LVL_F[it.lvl] || 1) * afford * prog, fit, bonus, c, plan: pl };
}

// does `id` appear (directly or deeper) in the recipe of any of these items? -> the follow-up leads toward the champion's build
const leadsTo = (id, targets) => targets.some(t => { const walk = x => x === id || (ITEM_BY_ID[x]?.recipe || []).some(walk); return t !== id && walk(t); });
const owns = (inv, id) => inv.some(s => s && s.id === id);
const mk = (tag, it, c, extra = {}) => ({ id: it.id, tag, vs: c.names, reason: c.reason, ...extra });

/** me: the player's fighter; enemies: opposing champions; chain: { from: itemId } when the last purchase was a recommended item. */
export function recommend(me, enemies, inv, gold, chain = null) {
  const th = analyse(enemies), w = weights(me, th), pr = PROFILE[me.key] || { role: 'Luchador' }, preset = presetOf(me.key);
  const cands = ITEMS.filter(i => i.lvl === 3 && !i.consumable && !owns(inv, i.id));   // recommendations are purple (level 3) items only
  const scored = cands.map(i => score(i, me, th, w, inv, gold)).filter(Boolean).sort((a, b) => b.score - a.score);
  const picked = new Set(), recs = [];
  const add = (tag, s, extra) => { if (!s || picked.has(s.it.id)) return false; picked.add(s.it.id); recs.push(mk(tag, s.it, s.c, extra)); return true; };
  const get = id => scored.find(s => s.it.id === id) || (ITEM_BY_ID[id] && !owns(inv, id) ? score(ITEM_BY_ID[id], me, th, w, inv, gold) : null);

  // follow-ups of the last recommended purchase: complement (the other ingredient of the item that uses it) + next (that item)
  if (chain?.from && owns(inv, chain.from) && ITEM_BY_ID[chain.from]) {
    const X = ITEM_BY_ID[chain.from], parents = ITEMS.filter(i => i.recipe?.includes(X.id) && !owns(inv, i.id));
    const ps = parents.map(p => get(p.id)).filter(Boolean).sort((a, b) => (leadsTo(b.it.id, preset) + preset.includes(b.it.id)) - (leadsTo(a.it.id, preset) + preset.includes(a.it.id)) || (b.score - a.score))[0];
    if (ps) {
      const comp = ITEM_BY_ID[ps.it.recipe[0] === X.id ? ps.it.recipe[1] : ps.it.recipe[0]];   // the other ingredient
      const haveOther = comp && inv.filter(s => s && s.id === comp.id).length >= (ps.it.recipe[0] === ps.it.recipe[1] ? 2 : 1);
      if (comp && !haveOther) { const cs = score(comp, me, th, w, inv, gold); if (cs) add('complement', cs, { of: X.id, next: ps.it.id }); }
      add('next', ps, { of: X.id });
    } else {   // a finished item has no parent: the next item of the build + something that complements it (a defence or utility item of another kind)
      const nx = preset.map(id => get(id)).filter(Boolean).filter(s => !picked.has(s.it.id)).sort((a, b) => b.score - a.score)[0];
      add('next', nx, { of: X.id });
      add('complement', scored.find(s => s.it.cat !== X.cat && ['arm', 'mr', 'hp', 'util'].includes(s.it.cat) && !picked.has(s.it.id)), { of: X.id });
    }
  }
  // counter to the enemy team (the best item that is effective against them), then the champion's own next preset item, then the best of the rest
  const okc = s => s.c.names.length && !picked.has(s.it.id);
  const counter = scored.find(s => s.c.k >= 1 && okc(s)) || scored.find(s => s.bonus > 0.4 && okc(s));   // defensive / cleanse counters first when the enemy team is one-sided
  if (recs.length < 3) add('counter', counter);
  const core = preset.map(id => get(id)).filter(Boolean).filter(s => !picked.has(s.it.id)).sort((a, b) => b.score - a.score)[0];
  if (recs.length < 3) add('build', core);
  for (const s of scored) { if (recs.length >= 3) break; add('flex', s); }
  recs.length = Math.min(recs.length, 3);
  // fallback text so every card says who it works against
  for (const r of recs) if (!r.vs.length) r.vs = th.list.map(e => e.f.key);
  for (const r of recs) if (!r.reason) { const it = ITEM_BY_ID[r.id], ms = mainStat(it); r.reason = ms ? `potencia tu ${STAT_LABEL[ms].toLowerCase()}` : 'tu estilo de juego'; }
  return { recs, preset, threat: th, role: pr.role };
}
