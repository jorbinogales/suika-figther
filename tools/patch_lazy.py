p = 'src/world.js'; s = open(p, encoding='utf-8').read()
def sub(a, b):
    global s
    assert a in s, a[:90]; s = s.replace(a, b, 1)

# ---------- Boot: interface only ----------
a = s.index("  preload() {\n    bootScreen.show();"); b = s.index("  finish(sprites) {")
s = s[:a] + """  preload() {   // first load: only what the interface needs (the launcher is HTML). Champions, sounds and the map load when a match starts (Arena.preload)
    bootScreen.show(); this.load.on('progress', v => bootScreen.progress(v * 100, 'CARGANDO INTERFAZ...'));
    this.load.json('manifest', 'assets/sprites/manifest.json?' + Date.now());
    this.load.json('uilayout', 'assets/ui/layout.json?' + Date.now());
    this.load.json('sfx', 'assets/sfx/sfx.json?' + Date.now());
    this.load.on('loaderror', f => { if (!/^(manifest|uilayout)/.test(f.key)) console.warn('missing', f.src); });
  }

  create() { this.finish((this.cache.json.get('manifest') || {}).sprites || {}); }

""" + s[b:]
# finish: no anims here
a = s.index("  finish(sprites) {"); b = s.index("    this.registry.set('sprites', sprites);")
s = s[:a] + "  finish(sprites) {\n" + s[b:]

# ---------- Arena: lazy per-match loading ----------
sub("  get pc() { return this.ctrl && this.ctrl.alive ? this.ctrl : this.player; }", """  // champions that take part in this match (only their sprites, icons, portraits and sounds are loaded)
  matchChamps() {
    const c = this.cfg || {}, set = new Set([this.playerKey, ...(this.allyKeys || []), ...(this.enemyKeys || [])]);
    (c.roster || []).forEach(r => set.add(r.key)); if (this.enemyKey) set.add(this.enemyKey);
    return [...set].filter(k => CHAMPIONS[k]);
  }
  preload() {   // match loading screen: everything the match needs, nothing else
    const m = this.cache.json.get('manifest') || {}, t = Date.now(), all = !!this.bot, L = this.load;
    const champs = this.matchChamps(), allKeys = Object.keys(CHAMPIONS), mine = k => champs.some(c => k === c || k.startsWith(c + '_')), isChampKey = k => allKeys.some(c => k === c || k.startsWith(c + '_'));
    const ok = k => all || !isChampKey(k) || mine(k);
    if (!this.bot) { bootScreen.show(); L.on('progress', v => bootScreen.progress(8 + v * 80)); L.on('filecomplete', k => bootScreen.progress(undefined, /^sfx_/.test(k) ? 'CARGANDO SONIDOS...' : /^(atl_)/.test(k) ? 'CARGANDO CAMPEONES Y UNIDADES...' : /^(item_|icon_|class_)/.test(k) ? 'CARGANDO HABILIDADES Y OBJETOS...' : 'CONSTRUYENDO EL MAPA...')); }
    champs.forEach(k => { L.image('face_' + k, `assets/concept/${k}_face.webp`); L.image('ref_' + k, `assets/ref_${k}.png`); });
    if (champs.includes('maduro')) L.image('ref_superbigote', 'assets/ref_superbigote.png');
    L.spritesheet('fist_progress', 'assets/objects/fist_progress_sheet.png', { frameWidth: 128, frameHeight: 128 });
    L.image('shadow', 'assets/map/shadow.png'); L.image('virtual_floor', 'assets/virtual_floor.png');
    ['blue', 'red', 'gold', 'blue_l', 'red_l', 'gold_l', 'gold_plain'].forEach(c => L.image('ui_hud_banner_' + c, `assets/ui/hud_banner_${c}.png?${t}`));
    ['hud_hero', 'hud_center', 'hud_minimap', 'hud_items', 'hud_stats', 'hud_enemy', 'hud_target', 'hud_kda', 'hud_score'].forEach(n => L.image('ui_' + n, `assets/ui/${n}.png?${t}`));
    L.spritesheet('ground', 'assets/map/ground.png', { frameWidth: 32, frameHeight: 32 }); L.spritesheet('details', 'assets/map/details.png', { frameWidth: 32, frameHeight: 32 });
    ['trees', 'bushes', 'rocks'].forEach(n => L.image(n, `assets/map/${n}.png`));
    L.image('f_trail', 'assets/map/forest/trail.png'); L.image('f_gt', 'assets/map/forest/gtrans.png');
    ['zap_a', 'zap_b'].forEach(n => L.spritesheet(n, `assets/vfx/${n}.png`, { frameWidth: 112, frameHeight: 112 }));
    ['sentry_robot_fire', 'turret_robot_fire', 'fence_h', 'fence_v'].forEach(n => L.image(n, `assets/objects/${n}.png?${t}`));
    FOREST.forEach(n => L.image('f_' + n, `assets/map/forest/${n}.png`));
    VFX.forEach(n => L.spritesheet('vfx_' + n, `assets/vfx/${n}.png`, { frameWidth: 32, frameHeight: 32 }));
    const sprites = m.sprites || {};
    for (const ch in sprites) if (ok(ch)) L.multiatlas('atl_' + ch, `assets/sprites/${ch}/atlas.json?${t}`, `assets/sprites/${ch}/`);   // one atlas per unit / selected champion
    (m.icons || []).forEach(n => { if (ok(n)) L.image('icon_' + n, `assets/icons/${n}.png?${t}`); });
    (m.classes || []).forEach(n => L.image('class_' + n, `assets/classes/${n}.png?${t}`));
    (m.flags || []).forEach(n => L.spritesheet('flag_' + n, `assets/flags/${n}.png?${t}`, { frameWidth: 128, frameHeight: 128 }));
    Object.entries(m.statics || {}).forEach(([n]) => L.spritesheet('st_' + n, `assets/statics/${n}.png?${t}`, { frameWidth: 192, frameHeight: 192 }));
    (m.stats || []).forEach(n => L.image('stat_' + n, `assets/stats/${n}.png?${t}`));
    (m.items || []).forEach(n => L.image('item_' + n, `assets/items/${n}.png?${t}`));
    (m.aim || []).forEach(n => L.image(n, `assets/aim/${n}.png?${t}`));
    (m.objects || []).forEach(n => L.image(n, `assets/objects/${n}.png?${t}`));
    // sounds: the common ones plus those of the champions in the match
    const sfx = this.cache.json.get('sfx') || {}, files = new Set();
    for (const name in sfx) { const owner = allKeys.find(c => new RegExp('(^|_)' + c + '(_|$)').test(name)); if (all || !owner || champs.includes(owner)) sfx[name].forEach(f => files.add(f)); }
    files.forEach(f => L.audio('sfx_' + f, 'assets/sfx/' + f));
  }
  setupAssets() {   // animations of what was loaded, tile crops
    const m = this.cache.json.get('manifest') || {}, sprites = m.sprites || {}, A = this.anims;
    VFX.forEach(n => { if (this.textures.exists('vfx_' + n) && !A.exists('vfx_' + n)) A.create({ key: 'vfx_' + n, frames: A.generateFrameNumbers('vfx_' + n), frameRate: 18, repeat: -1 }); });
    for (const ch in sprites) {
      if (!this.textures.exists('atl_' + ch)) continue;
      for (const a in sprites[ch]) {
        if (A.exists(`${ch}_${a}`)) continue;
        const [base, dir] = splitDir(a), frames = A.generateFrameNames('atl_' + ch, { prefix: `${a}/`, start: 0, end: sprites[ch][a] - 1 });
        A.create({ key: `${ch}_${a}`, frames, frameRate: dir && CYCLE_SEC[base] ? frames.length / CYCLE_SEC[base] : ANIM_FPS[base] || 10, repeat: LOOPS.has(base) ? -1 : 0 });
        if (a === 'ultb') A.create({ key: `${ch}_ultb_loop`, frames: A.generateFrameNames('atl_' + ch, { prefix: 'ultb/', start: 2, end: sprites[ch][a] - 1 }), frameRate: 9, repeat: -1 });   // Filtraciones: from the 3rd frame on
      }
      if (sprites[ch].walk && !sprites[ch].idle && !A.exists(`${ch}_idle`)) A.create({ key: `${ch}_idle`, frames: [{ key: 'atl_' + ch, frame: 'walk/0' }], frameRate: 1, repeat: -1 });
    }
    ['zap_a', 'zap_b'].forEach(n => { if (this.textures.exists(n) && !A.exists(n)) A.create({ key: n, frames: A.generateFrameNumbers(n), frameRate: 16, repeat: -1 }); });
    for (const fl of (m.flags || [])) if (this.textures.exists('flag_' + fl) && !A.exists('flag_' + fl)) A.create({ key: 'flag_' + fl, frames: A.generateFrameNumbers('flag_' + fl), frameRate: 8, repeat: -1 });
    for (const sheet in CROPS) for (const n in CROPS[sheet]) { const tx = this.textures.get(sheet); if (!tx.has(n)) tx.add(n, 0, ...CROPS[sheet][n]); }
  }

  get pc() { return this.ctrl && this.ctrl.alive ? this.ctrl : this.player; }""")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
