// Offline check of the shop recommendations: node tools/rectest.mjs
import { CHAMPIONS } from '../src/data.js';
import { ITEM_BY_ID } from '../src/items.js';
import { recommend, presetOf, PRESETS } from '../src/recommend.js';
const mk = (key, team = 0, items = {}) => { const d = CHAMPIONS[key], s = d.stats; return { key, def: d, team, baseTeam: team, atk: s.atk, ap: s.ap, armor: s.armor, mr: s.mr, maxHp: s.hp, level: 1, ...items }; };
const names = r => r.recs.map(x => `${x.tag}:${x.id}[${x.vs.join('/') || '-'}${x.reason ? ' · ' + x.reason : ''}]`).join('\n    ');
const run = (title, me, foes, inv = [], gold = 600, chain = null) => { const r = recommend(me, foes.map(k => mk(k, 1)), inv.map(id => id ? { id, cd: 0, charges: 0 } : null), gold, chain); console.log(`\n${title}\n    ${names(r)}`); return r; };
// every preset item must exist
for (const [k, l] of Object.entries(PRESETS)) { if (l.length !== 6) throw new Error(k + ' needs 6 items'); l.forEach(id => { if (!ITEM_BY_ID[id]) throw new Error(`${k}: unknown item ${id}`); }); }
console.log('presets ok');
const empty = [null, null, null, null, null, null];
run('TANQUE (Héctor) vs magos de IA (Leandro, Xeviche, Julio)', mk('hector'), ['leandro', 'xeviche', 'julio'], empty, 800);
run('MAGO (Leandro) vs físicos (Jorbi, Junior, Héctor)', mk('leandro'), ['jorbi', 'junior', 'hector'], empty, 800);
run('TIRADOR (Yonaiker) vs mezcla con control', mk('yonaiker'), ['hector', 'leandro', 'axel'], empty, 500);
const first = run('LUIS al empezar (300 de oro)', mk('luis'), ['xeviche', 'jorbi'], empty, 300);
// follow-up after buying the first recommendation
const bought = first.recs[0].id;
run(`... después de comprar ${bought} (recomendado)`, mk('luis'), ['xeviche', 'jorbi'], [bought, null, null, null, null, null], 400, { from: bought });
const b2 = recommend(mk('luis'), [mk('xeviche', 1)], [{ id: 'b_pesa', cd: 0, charges: 0 }, null, null, null, null, null], 400, { from: 'b_pesa' }).recs;
console.log('\ncadena desde b_pesa:', b2.map(r => `${r.tag}:${r.id}`).join('  '));
