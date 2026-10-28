// Sound manager. Files come from tools/build_sfx.py -> public/assets/sfx/sfx.json (name -> [files]).
// Usage: scene.audio.play('punch', { at: fighter }) ; scene.audio.ability(fighter, 'p1') ; scene.audio.music('music_game')
const LS = 'devbrawl_vol';
export const vol = (() => { let v = { sfx: 0.8, music: 0.45, voice: 0.9 }; try { Object.assign(v, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { /* ignore */ } return v; })();
export const saveVol = () => { try { localStorage.setItem(LS, JSON.stringify(vol)); } catch (e) { /* ignore */ } };

// basic attacks of non-champion units (champions use their own unique sound 'atk_<champion>')
export const ATTACK_SFX = {
  minion_blue_melee: 'slash', minion_blue_ranged: 'shot', minion_blue_tank: 'cannon', minion_red_melee: 'slash', minion_red_ranged: 'laser', minion_red_auto: 'punch_heavy',
  tower_blue: 'cannon', tower_red: 'laser_big', bot_melee: 'punch', bot_ranged: 'laser', drone: 'laser', sentry: 'shot', turret_robot: 'laser',
};

export class Audio {
  constructor(scene) { this.s = scene; this.last = {}; this.cur = null; }

  keys(name) { const m = this.s.cache.json.get('sfx') || {}; return m[name]; }

  // volume falls off with distance from the camera centre (0 distance = full)
  gain(at) {
    if (!at) return 1;
    const cam = this.s.cameras?.main; if (!cam) return 1;
    if (this.s.inView && !this.s.inView(at.x, at.y, 60)) return 0;   // outside the screen: silence
    const c = cam.midPoint, d = Math.hypot(at.x - c.x, at.y - c.y);
    return d < 450 ? 1 : Math.max(0.0, 1 - (d - 450) / 1100);
  }

  play(name, o = {}) {
    const list = this.keys(name); if (!list || !list.length) return;
    const now = this.s.time.now;
    if (now - (this.last[name] || 0) < (o.gap ?? 60)) return;   // throttle repeated sounds
    const g = this.gain(o.at) * (o.vol ?? 1) * vol.sfx; if (g < 0.02) return;
    this.last[name] = now;
    const k = 'sfx_' + list[Math.random() * list.length | 0];
    if (!this.s.cache.audio.exists(k)) return;
    this.s.sound.play(k, { volume: Math.min(1, g), rate: (o.rate ?? 1) * (0.94 + Math.random() * 0.12) });
  }

  // every ability has its own sound(s) ('a_<champion>_<key>'): all layers of that entry play together
  ability(f, key) { this.playAll(`a_${f.key}_${key}`, { at: f, vol: 0.95, gap: 0 }); }
  // champion basic attack (julio alternates slow/fast, jorbi's crit and eliud's hen lance have their own)
  basic(f, heavy) {
    const n = f.key === 'julio' ? (f.anim === 'attack2' ? 'atk_julio_fast' : 'atk_julio_slow') : f.key === 'jorbi' && heavy ? 'atk_jorbi_crit' : f.key === 'eliud' && f.hen ? 'atk_eliud_hen' : 'atk_' + f.key;
    this.playAll(n, { at: f, vol: 0.9 });
  }
  attack(f) { const n = ATTACK_SFX[f.key]; if (n) this.play(n, { at: f, vol: f.isTower ? 1 : 0.8 }); }
  // announcer voice: a strict queue. A line is never cut off and never overlaps: each one plays to the end, then waits 1 s before the next.
  // Each queued line carries the banner that is shown while it is spoken.
  voice(name, prio = 1, fallback = null, banner = null) {
    this.vq = this.vq || [];
    if (this.vq.length >= 6 && prio < 4) return;   // never pile up
    this.vq.push({ name, prio, fallback, banner });
  }
  tick() {   // called every frame by the arena
    const now = this.s.time.now;
    if (this.vBusy || !this.vq?.length || now < (this.vNext || 0)) return;
    const it = this.vq.shift();
    let name = it.name;
    if (name.startsWith('v_') && this.s.player?.baseTeam === 1 && this.keys('r_' + name.slice(2))) name = 'r_' + name.slice(2);   // robot side: the robot announcer speaks
    const list = this.keys(name), key = list && list.length ? 'sfx_' + list[0] : null;
    const done = () => { this.vBusy = false; this.vNext = this.s.time.now + 1000; };
    this.vBusy = true;
    let dur = 2200;
    if (key && this.s.cache.audio.exists(key)) {
      const sn = this.s.sound.add(key, { volume: Math.min(1, vol.voice) });
      sn.once('complete', done); sn.once('stop', done); sn.play(); this.curV = sn; dur = (sn.duration || 2) * 1000;
    } else {
      if (it.fallback) this.playAll(it.fallback, { vol: 1, gap: 0 });
      this.s.time.delayedCall(dur, done);
    }
    if (it.banner) this.s.showBanner?.(it.banner, dur + 500);
  }
  clearVoice() { this.vq = []; this.vBusy = false; this.curV?.stop(); }

  // plays EVERY file listed under a name (layers), instead of one random variant
  playAll(name, o = {}) {
    const list = this.keys(name); if (!list || !list.length) return;
    const now = this.s.time.now; if (now - (this.last[name] || 0) < (o.gap ?? 60)) return; this.last[name] = now;
    const g = this.gain(o.at) * (o.vol ?? 1) * vol.sfx; if (g < 0.02) return;
    list.forEach((f, i) => { const k = 'sfx_' + f; if (this.s.cache.audio.exists(k)) this.s.sound.play(k, { volume: Math.min(1, g * (i ? 0.75 : 1)) }); });
  }

  music(name) {
    if (this.cur && this.curName === name) return;
    this.stopMusic();
    const list = this.keys(name); if (!list) return;
    const k = 'sfx_' + list[0]; if (!this.s.cache.audio.exists(k)) return;
    this.cur = this.s.sound.add(k, { loop: true, volume: vol.music }); this.curName = name; this.cur.play();
  }
  stopMusic() { this.cur?.stop(); this.cur?.destroy(); this.cur = null; this.curName = null; }
  refresh() { this.cur?.setVolume(vol.music); this.curV?.setVolume?.(Math.min(1, vol.voice)); }
}
