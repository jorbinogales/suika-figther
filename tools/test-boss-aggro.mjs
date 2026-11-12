import assert from 'node:assert/strict';
import { BossMixin, bossCanAttack, laneUnitIgnoresBoss, recordBossAttacker } from '../src/bosses.js';

const champion = { isChamp: true, alive: true, team: 0, x: 80, y: 0, br: 28, def: { height: 100 }, stun() {}, slow() {} };
const bystander = { ...champion, x: 60 };
const minion = { isMinion: true, team: 0, alive: true, x: 30, y: 0, br: 28 };
const tower = { isTower: true, team: 1, alive: true, x: 40, y: 0, br: 28 };
const boss = { isBoss: true, bossKind: 'beast', team: 2, x: 0, y: 0, hp: 100, maxHp: 100, leash: 520, bossHome: { x: 0, y: 0 }, in: {}, setAim() {}, bs: { aggro: new Set(), ret: false, cd: { a: 0, b: 0, c: 0 } } };

assert.equal(laneUnitIgnoresBoss(minion, boss), true);
assert.equal(laneUnitIgnoresBoss(tower, boss), true);
assert.equal(laneUnitIgnoresBoss(champion, boss), false);
assert.equal(laneUnitIgnoresBoss({ ...minion, owner: champion }, boss), false);
assert.equal(bossCanAttack(boss, champion), false);
recordBossAttacker(boss, minion);
assert.equal(bossCanAttack(boss, champion), false);
recordBossAttacker(boss, { owner: champion });
assert.equal(bossCanAttack(boss, champion), true);
assert.equal(bossCanAttack(boss, bystander), false);

const targets = [minion, tower, champion, bystander];
{
  const calm = { ...boss, bs: { aggro: new Set(), ret: false, cd: { a: 0, b: 0, c: 0 } } };
  let casts = 0;
  const ctx = { ...BossMixin, enemiesOf: f => targets.filter(t => bossCanAttack(f, t)), bossWalk() {}, bossCast() { casts++; } };
  ctx.runBoss(calm, 0.016);
  assert.equal(casts, 0, 'a nearby player does not provoke a boss');
}
for (const mode of ['roar', 'shake', 'attack']) {
  const hits = [];
  const ctx = { ...BossMixin, enemiesNear: () => targets, damage: (_f, t) => hits.push(t), vfx() {}, float() {}, audio: { play() {} }, cameras: { main: { shake() {} } }, bossCast(_f, _a, _w, _d, fn) { fn(); }, tel() {} };
  boss.hp = 20; boss.bs.cd = { a: mode === 'attack' ? 0 : 1, b: mode === 'shake' ? 0 : 1, c: mode === 'roar' ? 0 : 1 };
  ctx.runBeast(boss, champion, [champion]);
  assert.deepEqual(hits, [champion], mode);
}

{
  const hits = [];
  const robot = { ...boss, bossKind: 'robot', bs: { aggro: new Set([champion]), cd: { s: 0, f: 1, m: 1 } } };
  const ctx = { ...BossMixin, enemiesOf: f => targets.filter(t => bossCanAttack(f, t)), enemiesNear: () => targets, damage: (_f, t) => hits.push(t), vfx() {}, audio: { play() {} }, cameras: { main: { shake() {} } }, bossCast(_f, _a, _w, _d, fn) { fn?.(); }, tel() {} };
  ctx.runRobot(robot);
  assert.deepEqual(hits, [champion], 'robot stomp only hits a player who attacked it');
  assert.equal(bystander.shove, undefined);
  assert.equal(minion.shove, undefined);
  assert.equal(tower.shove, undefined);
}

boss.bs.ret = true;
recordBossAttacker(boss, bystander);
assert.equal(bossCanAttack(boss, bystander), false);
boss.bs.ret = false;
const ctx = { ...BossMixin, enemiesOf: f => targets.filter(t => bossCanAttack(f, t)), bossWalk() {}, float() {} };
boss.x = 0; boss.y = 0; champion.x = 2000;
ctx.runBoss(boss, 0.016);
assert.equal(bossCanAttack(boss, champion), false, 'aggro clears when the boss returns home');
console.log('Boss aggro, lane immunity and area attacks: OK');
