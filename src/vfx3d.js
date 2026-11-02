// 3D effects for the experimental 3D view (#3d=1). Cartoon style: clean shapes, saturated colours, bright cores.
// Two instanced billboard pools (additive glow / normal-blended smoke), no allocation per frame, plus a few pooled meshes
// (ground rings, light columns, shield domes, laser beams, falling missiles). Everything is depth-tested, so trees and
// units hide the effects behind them. Render3D calls: sync(dt) after the simulation, claim(o) while sorting Phaser objects,
// write() right before drawing. The simulation never reads anything from here.
import * as THREE from 'three';

const UP_K = 50;   // same mapping as the upright 2D effects in render3d.js: 2D (x, y) -> 3D (x, UP_K, y + UP_K)
const FR = { glow: 0, dot: 1, star: 2, flame: 3, smoke: 4, ring: 5, plus: 6, bubble: 7, shard: 8 };   // atlas cells (4 x 4)
const PROJ = { bullet_tracer: 0xffe27a, cannonball: 0x4a4a52, plasma_shot: 0xff5a4a, energy_bolt: 0x66e0ff, magic_missile: 0xc07dff, rock_throw: 0x9a7a5a, poison_dart: 0x7dff5a, spark: 0xffd070 };
const SMOKY = new Set(['cannonball', 'rock_throw']);   // dark projectiles: normal-blended head and a smoke trail

// procedural atlas: 4 x 4 cells of 64 px, white shapes (tinted per particle)
function makeAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), C = 64;
  const cell = (i, draw) => { x.save(); x.translate((i % 4) * C + C / 2, Math.floor(i / 4) * C + C / 2); draw(); x.restore(); };
  const rad = (r, stops) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, r); stops.forEach(([o, a]) => g.addColorStop(o, `rgba(255,255,255,${a})`)); return g; };
  cell(FR.glow, () => { x.fillStyle = rad(30, [[0, 1], [0.35, 0.55], [1, 0]]); x.fillRect(-32, -32, 64, 64); });
  cell(FR.dot, () => { x.fillStyle = rad(24, [[0, 1], [0.75, 1], [1, 0]]); x.beginPath(); x.arc(0, 0, 24, 0, 7); x.fill(); });
  cell(FR.star, () => {   // 4-point sparkle with a halo
    x.fillStyle = rad(28, [[0, 0.7], [1, 0]]); x.fillRect(-32, -32, 64, 64); x.fillStyle = '#fff'; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 28; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill();
  });
  cell(FR.flame, () => {   // teardrop tongue, tip up
    const g = x.createRadialGradient(0, 8, 2, 0, 4, 26); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -30); x.bezierCurveTo(16, -10, 24, 10, 0, 28); x.bezierCurveTo(-24, 10, -16, -10, 0, -30); x.fill();
  });
  cell(FR.smoke, () => {   // cartoon cloud: overlapping puffs, lighter on top
    [[0, 6, 18], [-12, 2, 13], [12, 3, 14], [-5, -8, 13], [8, -7, 12]].forEach(([px, py, r]) => {
      const g = x.createRadialGradient(px - r * 0.3, py - r * 0.4, 1, px, py, r); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.7, 'rgba(225,225,225,0.85)'); g.addColorStop(1, 'rgba(200,200,200,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    });
  });
  cell(FR.ring, () => { x.strokeStyle = '#fff'; x.lineWidth = 6; x.shadowColor = '#fff'; x.shadowBlur = 8; x.beginPath(); x.arc(0, 0, 22, 0, 7); x.stroke(); });
  cell(FR.plus, () => { x.fillStyle = rad(30, [[0, 0.5], [1, 0]]); x.fillRect(-32, -32, 64, 64); x.fillStyle = '#fff'; x.fillRect(-6, -20, 12, 40); x.fillRect(-20, -6, 40, 12); });
  cell(FR.bubble, () => { x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 20, 0, 7); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-7, -8, 5, 0, 7); x.fill(); });
  cell(FR.shard, () => { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -28); x.lineTo(9, 0); x.lineTo(0, 28); x.lineTo(-9, 0); x.closePath(); x.fill(); });
  const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; return t;
}

// one pool of camera-facing particles drawn as a single instanced mesh
class Pool {
  constructor(map, additive, cap) {
    this.cap = cap; this.n = 0;
    const F32 = () => new Float32Array(cap);
    Object.assign(this, { px: F32(), py: F32(), pz: F32(), vx: F32(), vy: F32(), vz: F32(), life: F32(), max: F32(), s0: F32(), s1: F32(), cr: F32(), cg: F32(), cb: F32(), a0: F32(), rot: F32(), rv: F32(), fr: F32(), grav: F32(), drag: F32() });
    const base = new THREE.PlaneGeometry(1, 1), g = this.geo = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    const ia = (n) => new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos = ia(3)); g.setAttribute('iCol', this.aCol = ia(4)); g.setAttribute('iSR', this.aSR = ia(3));   // iSR = size, rotation, atlas cell
    g.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map } },
      vertexShader: `attribute vec3 iPos; attribute vec4 iCol; attribute vec3 iSR; varying vec2 vUv; varying vec4 vCol;
        void main() {
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0); float c = cos(iSR.y), s = sin(iSR.y);
          mv.xy += mat2(c, s, -s, c) * position.xy * iSR.x;
          gl_Position = projectionMatrix * mv;
          vUv = (uv + vec2(mod(iSR.z, 4.0), 3.0 - floor(iSR.z / 4.0))) / 4.0; vCol = iCol;
        }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
        void main() { vec4 t = texture2D(map, vUv); gl_FragColor = vec4(vCol.rgb * t.rgb, vCol.a * t.a); if (gl_FragColor.a < 0.004) discard;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 6 : 5;
  }
  // c: THREE.Color (linear; may be > 1 for glowing particles)
  spawn(x, y, z, vx, vy, vz, life, s0, s1, c, a, fr, grav = 0, drag = 0, rv = 0) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz; this.life[i] = 0; this.max[i] = life;
    this.s0[i] = s0; this.s1[i] = s1; this.cr[i] = c.r; this.cg[i] = c.g; this.cb[i] = c.b; this.a0[i] = a; this.rot[i] = Math.random() * 6.283; this.rv[i] = rv; this.fr[i] = fr; this.grav[i] = grav; this.drag[i] = drag;
  }
  step(dt) {
    const K = ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'life', 'max', 's0', 's1', 'cr', 'cg', 'cb', 'a0', 'rot', 'rv', 'fr', 'grav', 'drag'];
    for (let i = 0; i < this.n; i++) {
      if ((this.life[i] += dt) >= this.max[i]) {   // dead: the last particle takes its slot
        const j = --this.n; if (i !== j) for (const k of K) this[k][i] = this[k][j];
        i--; continue;
      }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= d; this.vz[i] *= d; this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt; this.rot[i] += this.rv[i] * dt;
    }
  }
  write() {
    const P = this.aPos.array, C = this.aCol.array, S = this.aSR.array;
    for (let i = 0; i < this.n; i++) {
      const t = this.life[i] / this.max[i], fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      P[i * 3] = this.px[i]; P[i * 3 + 1] = this.py[i]; P[i * 3 + 2] = this.pz[i];
      C[i * 4] = this.cr[i]; C[i * 4 + 1] = this.cg[i]; C[i * 4 + 2] = this.cb[i]; C[i * 4 + 3] = this.a0[i] * Math.max(0, fade);
      S[i * 3] = this.s0[i] + (this.s1[i] - this.s0[i]) * t; S[i * 3 + 1] = this.rot[i]; S[i * 3 + 2] = this.fr[i];
    }
    this.geo.instanceCount = this.n;
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSR.needsUpdate = true;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

const fresnelMat = (col) => new THREE.ShaderMaterial({   // holographic dome / column: bright rim, faint core, scrolling bands
  uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 1 }, uT: { value: 0 }, uCore: { value: 0.06 } },
  vertexShader: 'varying vec3 vN, vV; varying vec2 vUv; void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vUv = uv; gl_Position = projectionMatrix * mv; }',
  fragmentShader: `uniform vec3 uCol; uniform float uA, uT, uCore; varying vec3 vN, vV; varying vec2 vUv;
    void main() { float f = pow(1.0 - abs(dot(vN, vV)), 2.2), band = 0.5 + 0.5 * sin(vUv.y * 38.0 - uT * 5.0), top = 1.0 - smoothstep(0.55, 1.0, vUv.y);
      gl_FragColor = vec4(uCol * (1.0 + f), (f * 0.85 + uCore + band * 0.06) * uA * top);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});

export class Vfx3D {
  constructor(scene) {
    this.scene = scene; this.atlas = makeAtlas();
    this.add = new Pool(this.atlas, true, 2600); this.norm = new Pool(this.atlas, false, 900);
    scene.add(this.add.mesh, this.norm.mesh);
    this.hidden = new Set(); this.acc = new WeakMap(); this.c = new THREE.Color(); this.t = 0; this.live = false;
    // pooled meshes
    this.ringGeo = new THREE.RingGeometry(0.78, 1, 48).rotateX(-Math.PI / 2);
    this.colGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0);
    this.domeGeo = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62);
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    this.rings = []; this.cols = []; this.beams = []; this.domes = new Map(); this.auras = new Map(); this.missiles = new Map();
    this.misBody = new THREE.CylinderGeometry(4.5, 4.5, 34, 8).translate(0, 17, 0); this.misNose = new THREE.ConeGeometry(4.5, 12, 8).rotateX(Math.PI).translate(0, -6, 0);
    this.misMatA = new THREE.MeshBasicMaterial({ color: 0xd8dde4 }); this.misMatB = new THREE.MeshBasicMaterial({ color: 0xff4a3a });
  }

  col(hex, boost = 1) { return this.c.setHex(hex).multiplyScalar(boost); }
  // 2D effect position -> 3D (upright effects float at chest height, 'below' ones sit on the ground)
  pos(x, y, below) { return below ? [x, 3, y] : [x, UP_K, y + UP_K]; }

  ring(x, z, r0, r1, life, hex, a = 0.9) {
    let o = this.rings.find(q => !q.on);
    if (!o) { if (this.rings.length >= 16) return; o = { mesh: new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })) }; o.mesh.renderOrder = 6; this.scene.add(o.mesh); this.rings.push(o); }
    Object.assign(o, { on: true, t: 0, T: life, r0, r1, a }); o.mesh.material.color.setHex(hex).multiplyScalar(1.6); o.mesh.position.set(x, 2.5, z); o.mesh.visible = true;
  }
  column(x, z, r, h, life, hex) {
    let o = this.cols.find(q => !q.on);
    if (!o) { if (this.cols.length >= 10) return; o = { mesh: new THREE.Mesh(this.colGeo, fresnelMat(0xffffff)) }; o.mesh.renderOrder = 6; this.scene.add(o.mesh); this.cols.push(o); }
    Object.assign(o, { on: true, t: 0, T: life }); o.mesh.material.uniforms.uCol.value.setHex(hex); o.mesh.material.uniforms.uCore.value = 0.18;
    o.mesh.position.set(x, 0, z); o.mesh.scale.set(r, h, r); o.mesh.visible = true;
  }
  // laser / beam between two 3D points: white core + coloured glow, fades in ~0.2 s
  beam(x0, y0, z0, x1, y1, z1, hex, life = 0.2, w = 5) {
    let o = this.beams.find(q => !q.on);
    if (!o) {
      if (this.beams.length >= 8) return;
      const core = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const glow = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      o = { core, glow }; core.renderOrder = glow.renderOrder = 6; this.scene.add(core, glow); this.beams.push(o);
    }
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz) || 1, q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
    for (const [m, r] of [[o.core, w * 0.35], [o.glow, w]]) { m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.quaternion.copy(q); m.scale.set(r, L, r); m.visible = true; }
    o.glow.material.color.setHex(hex).multiplyScalar(1.4); Object.assign(o, { on: true, t: 0, T: life });
    const c = this.col(hex, 2.5); for (let i = 0; i < 6; i++) this.add.spawn(x1, y1, z1, (Math.random() - 0.5) * 160, Math.random() * 120, (Math.random() - 0.5) * 160, 0.3, 9, 0, c, 1, FR.star, -200, 2);
  }

  /* ---------- the game's vfx(name, x, y, opts): returns true when drawn in 3D (the 2D sprite is then not created) ---------- */
  vfx(name, x, y, o = {}) {
    if (!this.live) return false;
    const sc = o.scale ?? 3, S = sc * 10, tint = o.tint, A = this.add, N = this.norm, R = Math.random;
    const [px, py, pz] = this.pos(x, y, o.below), gx = x, gz = o.below ? y : y + 20;   // gx / gz: ground point under the effect
    const burst = (pool, n, fr, hex, boost, sp, up, life, s0, s1, grav = 0, drag = 0, spread = 0) => {
      const c = this.col(hex, boost);
      for (let i = 0; i < n; i++) { const a = R() * 6.283, v = sp * (0.5 + R() * 0.5); pool.spawn(px + Math.cos(a) * spread * R(), py, pz + Math.sin(a) * spread * R(), Math.cos(a) * v, up * (0.4 + R() * 0.8), Math.sin(a) * v, life * (0.7 + R() * 0.5), s0 * (0.7 + R() * 0.5), s1, c, 1, fr, grav, drag, (R() - 0.5) * 6); }
    };
    switch (name) {
      case 'spark': burst(A, 6 + sc * 2 | 0, FR.star, tint ?? 0xffd070, 2.2, 70 + sc * 26, 140, 0.45, S * 0.45, 0, -320, 2); burst(A, 1, FR.glow, tint ?? 0xffd070, 1.6, 0, 0, 0.14, S * 1.3, S * 1.6); return true;
      case 'punch': burst(A, 1, FR.glow, 0xffffff, 1.8, 0, 0, 0.14, S * 1.6, S * 2); burst(A, 1, FR.ring, tint ?? 0xffe9a0, 1.8, 0, 0, 0.22, S * 0.6, S * 2.2); burst(A, 8, FR.star, tint ?? 0xffd070, 2.2, 200, 160, 0.4, S * 0.4, 0, -300, 3); return true;
      case 'block': burst(A, 1, FR.star, 0xbfe8ff, 2.4, 0, 0, 0.2, S * 1.4, S * 0.4); burst(A, 1, FR.ring, 0x9fdcff, 1.8, 0, 0, 0.25, S * 0.5, S * 1.8); return true;
      case 'shockwave': {
        const r1 = sc * 16; this.ring(gx, gz, r1 * 0.25, r1, 0.45, tint ?? 0xffe2b8, 0.95);
        const c = this.col(0xd8c4a8, 1); for (let i = 0; i < 10; i++) { const a = R() * 6.283; N.spawn(gx + Math.cos(a) * r1 * 0.4, 8, gz + Math.sin(a) * r1 * 0.4, Math.cos(a) * r1 * 1.4, 25, Math.sin(a) * r1 * 1.4, 0.7, r1 * 0.25, r1 * 0.5, c, 0.55, FR.smoke, 0, 3, (R() - 0.5) * 2); }
        return true;
      }
      case 'run_dust': { const c = this.col(0xe0d4c4, 1); for (let i = 0; i < 3; i++) N.spawn(px + (R() - 0.5) * S * 0.4, 6, pz + (R() - 0.5) * S * 0.3, (R() - 0.5) * 30, 18 + R() * 20, (R() - 0.5) * 30, 0.6 + R() * 0.3, S * 0.25, S * 0.6, c, 0.45, FR.smoke, 0, 1.5, (R() - 0.5) * 2); return true; }
      case 'heal': burst(A, 7, FR.plus, tint ?? 0x7dff9a, 1.8, 30, 90, 0.9, S * 0.22, S * 0.1, 0, 1, S * 0.5); burst(A, 1, FR.glow, tint ?? 0x7dff9a, 1, 0, 0, 0.5, S * 1.2, S * 1.6); return true;
      case 'levelup': this.column(gx, gz, 34, 260, 1.0, tint ?? 0xffd23f); burst(A, 18, FR.star, tint ?? 0xffe27a, 2.2, 40, 220, 1.0, 9, 2, -40, 0.5, 30); return true;
      case 'summon': this.ring(gx, gz, 10, S * 1.2, 0.5, tint ?? 0x7ee0ff); this.column(gx, gz, S * 0.5, 140, 0.55, tint ?? 0x7ee0ff); burst(A, 10, FR.star, tint ?? 0x9fefff, 2, 60, 160, 0.6, 8, 1, -60, 1, 20); return true;
      case 'buff': burst(A, 10, FR.glow, tint ?? 0xffe27a, 1.6, 30, 110, 0.8, S * 0.25, S * 0.05, 0, 1, S * 0.5); burst(A, 6, FR.star, tint ?? 0xffffff, 2, 40, 140, 0.6, 8, 0, -80, 1, S * 0.4); return true;
      case 'shield': this.flashDome(gx, 0, gz, S * 0.5, tint ?? 0x7ee0ff); return true;
      case 'poison_hit': case 'poison_cloud': {
        const hex = tint ?? 0x8dff5a; burst(A, 6, FR.bubble, hex, 1.3, 25, 70, 0.9, S * 0.16, S * 0.06, 0, 1, S * 0.5);
        const c = this.col(hex, 0.45); for (let i = 0; i < 3; i++) A.spawn(px + (R() - 0.5) * S, py - 20, pz + (R() - 0.5) * S * 0.6, (R() - 0.5) * 20, 15, (R() - 0.5) * 20, 1.2, S * 0.5, S * 0.9, c, 0.6, FR.smoke, 0, 1);
        return true;
      }
      case 'burning_ground': case 'fire_trail': this.flames(gx, 0, gz, S * 0.6, 5, tint); return true;
    }
    return false;
  }

  flames(x, y, z, r, n, tint) {
    const R = Math.random, hot = this.col(tint ?? 0xff8a2a, 1.5), core = this.col(0xffd890, 1.8);
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * r;
      this.add.spawn(x + Math.cos(a) * d, y + 6, z + Math.sin(a) * d * 0.8, (R() - 0.5) * 14, 50 + R() * 50, (R() - 0.5) * 14, 0.45 + R() * 0.35, 13 + R() * 9, 3, i % 3 ? hot : core, 0.8, FR.flame, 30, 1, (R() - 0.5) * 1.5);
    }
  }
  flashDome(x, y, z, r, hex) { const d = this.dome({ flash: true }, hex); d.x = x; d.z = z; d.r = Math.max(30, r); d.t = 0; d.T = 0.45; }
  dome(key, hex) {
    let d = this.domes.get(key);
    if (!d) { const mesh = new THREE.Mesh(this.domeGeo, fresnelMat(hex)); mesh.renderOrder = 7; this.scene.add(mesh); d = { mesh }; this.domes.set(key, d); }
    d.mesh.material.uniforms.uCol.value.setHex(hex); d.seen = this.frame; return d;
  }

  // emits a few flames per second at a 2D burning sprite (fire patches, craters): called while Render3D sorts the Phaser objects
  claim(o) {
    const k = o.texture?.key;
    if (k !== 'vfx_burning_ground' && k !== 'vfx_fire_trail') return false;
    if (this.live && this.emitting) {
      const a = (this.acc.get(o) || 0) + this.dt * 9 * Math.min(1, o.alpha * 1.2);
      const n = a | 0; this.acc.set(o, a - n);
      if (n) this.flames(o.x, 0, o.y + 6, 16 * (o.scaleX / 3), n);
    }
    return true;
  }

  /* ---------- per-frame: effects that follow the game state ---------- */
  sync(w, dt) {
    this.live = true; this.dt = dt; this.t += dt; this.frame = (this.frame || 0) + 1; this.emitting = true;
    this.add.step(dt); this.norm.step(dt);
    const H = this.hidden, A = this.add, N = this.norm, R = Math.random, me = w.player; H.clear();
    // projectiles: glowing head + trail (sprite projectiles stay 2D; objects like laptops keep their art)
    for (const p of w.projs) {
      const key = p.s?.texture?.key; if (!key || !key.startsWith('vfx_')) continue;
      H.add(p.s);
      const name = p.vfx || 'energy_bolt', hex = p.tint ?? PROJ[name] ?? 0x9fe8ff, sz = Math.min(26, (p.r || 12) * 1.5) * (p.big ? 1.3 : 1), smoky = SMOKY.has(name);
      if (smoky) { N.spawn(p.x, p.lift, p.y, 0, 0, 0, 0.0001, sz * 0.9, sz * 0.9, this.col(hex, 1), 1, FR.dot); N.spawn(p.x, p.lift, p.y, (R() - 0.5) * 20, 10, (R() - 0.5) * 20, 0.5, sz * 0.6, sz * 1.3, this.col(0xd0d0d0, 1), 0.45, FR.smoke, 0, 2); }
      else {
        A.spawn(p.x, p.lift, p.y, 0, 0, 0, 0.0001, sz * 2.2, sz * 2.2, this.col(hex, 1.4), 1, FR.glow);
        A.spawn(p.x, p.lift, p.y, 0, 0, 0, 0.0001, sz * 0.7, sz * 0.7, this.col(0xffffff, 2), 1, FR.dot);
        for (let k = 0; k < 2; k++) { const u = R(); A.spawn(p.x - (p.x - p.px) * u, p.lift, p.y - (p.y - p.py) * u, 0, 0, 0, 0.22, sz * 1.1, 0, this.col(hex, 1.6), 0.9, FR.glow); }
      }
    }
    // flamethrower cone
    for (const f of w.fighters) {
      const F = f.flame; if (!F) continue;
      if (F.spr) H.add(F.spr);
      if (f.hiddenFor(me)) continue;
      const a = F.a, L = a.length, ux = f.ax, uy = f.ay, mx = f.x + ux * 34, mz = f.y + uy * 34, h = f.def.height * 0.48, hot = this.col(0xff7a20, 1.35), core = this.col(0xffd080, 1.7);
      for (let i = 0; i < 3; i++) {
        const sp = L / 0.42 * (0.75 + R() * 0.3), side = (R() - 0.5) * (a.farW / L) * 0.9, vx = (ux - uy * side) * sp, vz = (uy + ux * side) * sp;
        A.spawn(mx, h, mz, vx, (R() - 0.3) * 40, vz, 0.42, 8 + R() * 4, a.farW * 0.24, i === 0 ? core : hot, 0.55, i % 2 ? FR.glow : FR.flame, 40, 0.6, (R() - 0.5) * 3);
      }
      if (R() < 0.5) N.spawn(mx + ux * L * 0.9, h + 20, mz + uy * L * 0.9, ux * 40, 40, uy * 40, 0.9, 20, 46, this.col(0x6a6a72, 1), 0.35, FR.smoke, 0, 1);
    }
    // Yonaiker's smoke clouds
    for (const m of w.smokes || []) {
      if (m.spr) H.add(m.spr);
      const a = (this.acc.get(m) || 0) + dt * 14, n = a | 0; this.acc.set(m, a - n);
      const k = Math.min(1, m.t / Math.max(0.1, m.T) * 3), c = this.col(m.owner ? 0x7f9a7c : 0x8a979e, 1);   // darker than the ground so the cloud reads
      for (let i = 0; i < n; i++) { const an = R() * 6.283, d = Math.sqrt(R()) * m.r * 0.85; N.spawn(m.x + Math.cos(an) * d, 10 + R() * 40, m.y + Math.sin(an) * d * 0.75, (R() - 0.5) * 16, 8 + R() * 10, (R() - 0.5) * 16, 1.8, m.r * 0.5, m.r * 0.85, c, 0.75 * k, FR.smoke, 0, 0.5, (R() - 0.5) * 0.6); }
    }
    // falling missiles (Yonaiker's bomber, Junior's bombardment): body + nose, flame and smoke trail
    const seen = new Set();
    for (const [list, top] of [[w.yMissiles, 800], [w.missiles, 700]]) for (const m of list || []) {
      if (m.img) H.add(m.img);
      const k = Math.min(1, m.t / m.fall), y = top * (1 - k * k) + 10; seen.add(m);
      let g = this.missiles.get(m);
      if (!g) { g = new THREE.Group(); g.add(new THREE.Mesh(this.misBody, this.misMatA), new THREE.Mesh(this.misNose, this.misMatB)); this.scene.add(g); this.missiles.set(m, g); }
      g.position.set(m.x, y, m.y);
      A.spawn(m.x, y + 36, m.y, 0, 0, 0, 0.0001, 26, 26, this.col(0xffb040, 2.2), 1, FR.glow);
      N.spawn(m.x + (R() - 0.5) * 6, y + 40, m.y + (R() - 0.5) * 6, (R() - 0.5) * 10, 30, (R() - 0.5) * 10, 0.9, 12, 34, this.col(0xd8d8dc, 1), 0.5, FR.smoke, 0, 1);
    }
    for (const [m, g] of this.missiles) if (!seen.has(m)) { this.scene.remove(g); this.missiles.delete(m); }
    // shields (dome), Xeviche's arepa aura (golden column), stun (orbiting stars)
    for (const f of w.fighters) {
      if (f.shieldG) H.add(f.shieldG); if (f.auraG) H.add(f.auraG); if (f.stunBirds) f.stunBirds.forEach(b => H.add(b));
      if (!f.alive || f.hiddenFor(me)) continue;
      const hgt = f.def.height;
      if (f.shieldHp > 0) { const d = this.dome(f, 0xbfe8ff); d.x = f.x; d.z = f.y; d.r = hgt * 0.52; d.T = 0; }
      if (f.key === 'xeviche' && f.arepaUp && !f.invis) {
        const d = this.dome('arepa' + f.nid, 0xffd23f); d.x = f.x; d.z = f.y; d.r = hgt * 0.42; d.T = 0; d.col = true;
        if (R() < dt * 14) { const an = R() * 6.283; A.spawn(f.x + Math.cos(an) * hgt * 0.36, 4, f.y + Math.sin(an) * hgt * 0.3, 0, 90 + R() * 60, 0, 0.7, 7, 2, this.col(0xffd23f, 2), 0.9, FR.flame); }
      }
      if (f.isChamp && f.stunT > 0) for (let i = 0; i < 3; i++) { const an = this.t * 5 + i * 2.094; A.spawn(f.x + Math.cos(an) * 26, hgt + 14, f.y + Math.sin(an) * 20, 0, 0, 0, 0.0001, 20, 20, this.col(0xffe27a, 2), 1, FR.star); }
    }
    // pooled meshes
    for (const o of this.rings) if (o.on) { o.t += dt; const k = o.t / o.T; if (k >= 1) { o.on = false; o.mesh.visible = false; continue; } const e = 1 - (1 - k) * (1 - k); o.mesh.scale.setScalar(o.r0 + (o.r1 - o.r0) * e); o.mesh.material.opacity = o.a * (1 - k); }
    for (const o of this.cols) if (o.on) { o.t += dt; const k = o.t / o.T; if (k >= 1) { o.on = false; o.mesh.visible = false; continue; } const u = o.mesh.material.uniforms; u.uA.value = Math.sin(Math.PI * Math.min(1, k * 1.4)) * 1.2; u.uT.value = this.t; }
    for (const o of this.beams) if (o.on) { o.t += dt; const k = o.t / o.T; if (k >= 1) { o.on = false; o.core.visible = o.glow.visible = false; continue; } o.core.material.opacity = 1 - k; o.glow.material.opacity = 0.55 * (1 - k); }
    for (const [key, d] of this.domes) {
      let a;
      if (d.T) { d.t += dt; a = Math.max(0, 1 - d.t / d.T); if (a <= 0) { this.scene.remove(d.mesh); d.mesh.material.dispose(); this.domes.delete(key); continue; } }
      else { if (d.seen !== this.frame) { this.scene.remove(d.mesh); d.mesh.material.dispose(); this.domes.delete(key); continue; } a = d.col ? 0.55 : 0.9; }
      d.mesh.position.set(d.x, 0, d.z); d.mesh.scale.set(d.r, d.r * (d.col ? 2.4 : 1.25), d.r);
      const u = d.mesh.material.uniforms; u.uA.value = a; u.uT.value = this.t;
    }
  }

  write() { this.add.write(); this.norm.write(); this.emitting = false; }

  dispose() {
    this.add.dispose(); this.norm.dispose(); this.atlas.dispose();
    [this.ringGeo, this.colGeo, this.domeGeo, this.beamGeo, this.misBody, this.misNose].forEach(g => g.dispose());
    this.misMatA.dispose(); this.misMatB.dispose();
    for (const o of this.rings) o.mesh.material.dispose(); for (const o of this.cols) o.mesh.material.dispose();
    for (const o of this.beams) { o.core.material.dispose(); o.glow.material.dispose(); }
    for (const d of this.domes.values()) d.mesh.material.dispose();
  }
}
