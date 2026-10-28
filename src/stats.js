import { rk } from './data.js';

// One look for every stat across the game (tooltips, shop, launcher): label, text color and icon (assets/stats/<key>.png)
export const STAT_STYLE = {
  ap:        { label: 'Poder de IA',      css: '#4aa3ff' },
  atk:       { label: 'Ataque físico',    css: '#ff5a4a' },
  aspd:      { label: 'Vel. de ataque',   css: '#ffd23f' },
  armor:     { label: 'Armadura',         css: '#f2c14e' },
  mr:        { label: 'Res. a la IA',     css: '#7a8cff' },
  hp:        { label: 'Vida',             css: '#ff5a5a' },
  mana:      { label: 'Maná',             css: '#2f7bff' },
  speed:     { label: 'Velocidad',        css: '#7ee0ff' },
  hpRegen:   { label: 'Regen. de vida',   css: '#5dff8a' },
  manaRegen: { label: 'Regen. de maná',   css: '#5b8cff' },
  cdr:       { label: 'Recarga de poder', css: '#4ab8ff' },
  lifesteal: { label: 'Robo de vida',     css: '#ff7ab8' },
};
export const statCss = k => STAT_STYLE[k]?.css || '#cfe3ff';

// What an ability deals / heals / shields right now: base value of the rank + the stats it scales with.
// v = { ap, atk, maxHp }. Returns [{ label, base, parts: [{ stat, k, val }], total }]
export function scaleRows(ab, rank, v) {
  const r = Math.max(1, rank || 1), rows = [];
  const row = (label, key, extra = []) => {
    if (!Array.isArray(ab[key])) return;
    const base = rk(ab[key], r), parts = [];
    if (ab.apScale) parts.push({ stat: 'ap', k: ab.apScale, val: v.ap * ab.apScale });
    if (ab.atkScale) parts.push({ stat: 'atk', k: ab.atkScale, val: v.atk * ab.atkScale });
    extra.forEach(e => parts.push(e));
    rows.push({ label, base, parts, total: base + parts.reduce((s, p) => s + p.val, 0) });
  };
  row('Daño', 'dmg'); row('Daño por segundo', 'dps');
  if (Array.isArray(ab.heal)) {
    const pct = Array.isArray(ab.healHpPct) ? rk(ab.healHpPct, r) : 0, hp = pct ? [{ stat: 'hp', k: pct, val: v.maxHp * pct }] : [];
    const base = rk(ab.heal, r), parts = (ab.apScale ? [{ stat: 'ap', k: ab.apScale, val: v.ap * ab.apScale }] : []).concat(hp);
    rows.push({ label: 'Curación', base, parts, total: base + parts.reduce((s, p) => s + p.val, 0) });
  }
  if (Array.isArray(ab.shield)) {
    const base = rk(ab.shield, r), parts = ab.shieldHpPct ? [{ stat: 'hp', k: ab.shieldHpPct, val: v.maxHp * ab.shieldHpPct }] : [];
    rows.push({ label: 'Escudo', base, parts, total: base + parts.reduce((s, p) => s + p.val, 0) });
  }
  if (Array.isArray(ab.poisonApScale)) { const k = rk(ab.poisonApScale, r); rows.push({ label: 'Veneno total', base: 0, parts: [{ stat: 'ap', k, val: v.ap * k }], total: v.ap * k }); }
  return rows;
}
// the stat that gives the row its color (first scaling stat, else none)
export const rowStat = row => row.parts[0]?.stat || null;
export const pct = k => `${Math.round(k * 100)}%`;
