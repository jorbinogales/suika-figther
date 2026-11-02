// Experimental 3D view (#3d=1). The simulation stays in Phaser (world.js / fighter.js); this only draws it with three.js.
// A three.js canvas sits under Phaser's (transparent) canvas. Phaser's main camera keeps following the player (its worldView still drives
// culling, audio and the minimap) but renders nothing; a second Phaser camera draws only the overlays (bars, names, floating text) at the
// screen position of their 3D anchor. Mapping: x = game x, z = game y, y = height; 1 world unit = 1 three.js unit.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD_W, WORLD_H, GW, GH, CELL, cellWalk, walkField, isWalk, CAMP_SITES } from './mapdata.js';
import { Vfx3D } from './vfx3d.js';

const TILT = 55 * Math.PI / 180;   // camera elevation above the ground
const FOV = 30;                    // vertical field of view (degrees): low, close to an orthographic look
const FRAME_K = 0.95;               // fraction of the 2D view height (VIEW_H / zoom) framed vertically at the target
const MARGIN = 900;                // ground + forest drawn past every map edge (the camera can see past them)
const WALK_REF = 1.8, RUN_REF = 4.2;   // m/s at which the walk / run clips look right (models are ~1.67 m tall)
const COL = { me: 0x3ddc84, ally: 0x3b82f6, enemy: 0xff3b3b, team: [0x3d6fb6, 0xb5403a] };
const GD_W = 1280, GD_H = 800;     // ground decal canvas (covers the visible ground, re-fitted every frame)
const UP_K = 50;                   // upright 2D effect at (x, y) -> 3D point (x, UP_K, y + UP_K): lands within a few pixels of its 2D spot whatever its lift
// 2D textures that lie on the ground (drawn into the ground decal); every other image / sprite is an upright effect
const GROUND_KEYS = new Set(['zone', 'ink_blot', 'shadow', 'ground_crack', 'trap_plate', 'sentry_mound', 'bomber_reticle', 'st_flame_jet', 'st_beam_harem']);
const CMD = { ARC: 0, BEGIN_PATH: 1, CLOSE_PATH: 2, FILL_RECT: 3, LINE_TO: 4, MOVE_TO: 5, LINE_STYLE: 6, FILL_STYLE: 7, FILL_PATH: 8, STROKE_PATH: 9, FILL_TRIANGLE: 10, STROKE_TRIANGLE: 11, SAVE: 14, RESTORE: 15, TRANSLATE: 16, SCALE: 17, ROTATE: 18, GRADIENT_FILL_STYLE: 21, GRADIENT_LINE_STYLE: 22 };   // Phaser Graphics command ids
const rgba = (c, a) => `rgba(${(c >>> 16) & 255},${(c >>> 8) & 255},${c & 255},${a})`;
// replays a Phaser Graphics command buffer into a 2D canvas (same as Phaser's own GraphicsCanvasRenderer)
function replayGraphics(ctx, buf) {
  ctx.beginPath();
  for (let i = 0; i < buf.length; i++) {
    switch (buf[i]) {
      case CMD.ARC: ctx.arc(buf[i + 1], buf[i + 2], buf[i + 3], buf[i + 4], buf[i + 5], buf[i + 6]); i += 7; break;
      case CMD.LINE_STYLE: ctx.lineWidth = buf[i + 1]; ctx.strokeStyle = rgba(buf[i + 2], buf[i + 3]); i += 3; break;
      case CMD.FILL_STYLE: ctx.fillStyle = rgba(buf[i + 1], buf[i + 2]); i += 2; break;
      case CMD.BEGIN_PATH: ctx.beginPath(); break;
      case CMD.CLOSE_PATH: ctx.closePath(); break;
      case CMD.FILL_PATH: ctx.fill(); break;
      case CMD.STROKE_PATH: ctx.stroke(); break;
      case CMD.FILL_RECT: ctx.fillRect(buf[i + 1], buf[i + 2], buf[i + 3], buf[i + 4]); i += 4; break;
      case CMD.FILL_TRIANGLE: case CMD.STROKE_TRIANGLE: {
        ctx.beginPath(); ctx.moveTo(buf[i + 1], buf[i + 2]); ctx.lineTo(buf[i + 3], buf[i + 4]); ctx.lineTo(buf[i + 5], buf[i + 6]); ctx.closePath();
        buf[i] === CMD.FILL_TRIANGLE ? ctx.fill() : ctx.stroke(); i += 6; break;
      }
      case CMD.LINE_TO: ctx.lineTo(buf[i + 1], buf[i + 2]); i += 2; break;
      case CMD.MOVE_TO: ctx.moveTo(buf[i + 1], buf[i + 2]); i += 2; break;
      case CMD.SAVE: ctx.save(); break;
      case CMD.RESTORE: ctx.restore(); break;
      case CMD.TRANSLATE: ctx.translate(buf[i + 1], buf[i + 2]); i += 2; break;
      case CMD.SCALE: ctx.scale(buf[i + 1], buf[i + 2]); i += 2; break;
      case CMD.ROTATE: ctx.rotate(buf[i + 1]); i += 1; break;
      case CMD.GRADIENT_FILL_STYLE: i += 5; break;
      case CMD.GRADIENT_LINE_STYLE: i += 6; break;
    }
  }
}

/* ---------- GLB loading: only if the file really exists (the dev server answers unknown paths with index.html) ---------- */
const glbCache = new Map();
const gltfLoader = new GLTFLoader();
function loadGlb(url) {
  if (!glbCache.has(url)) glbCache.set(url, fetch(url).then(r => (r.ok ? r.arrayBuffer() : null)).then(buf => {
    if (!buf || buf.byteLength < 20 || new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'glTF') return null;
    return new Promise(res => gltfLoader.parse(buf, '', g => {
      g.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g.scene);
      g.minY = box.min.y; g.height = Math.max(1e-3, box.max.y - box.min.y);
      res(g);
    }, () => res(null)));
  }).catch(() => null));
  return glbCache.get(url);
}

/* ---------- cheap deterministic noise for the procedural ground ---------- */
const hash = (i, j) => { let n = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.27 + vnoise(x * 4.3 + 9.1, y * 4.3 + 3.7) * 0.15 + vnoise(x * 8.7 + 2.9, y * 8.7 + 7.4) * 0.08;

/* ---------- cel look shared by units and scenery ---------- */
const U = { time: { value: 0 }, res: { value: new THREE.Vector2(1280, 720) }, outline: { value: 1.3 }, rim: { value: new THREE.Color(0xffe6c8).multiplyScalar(0.55) } };   // shared shader uniforms
let RAMP = null;   // soft anime ramp: shade / mid / lit with smooth (not hard) steps
const toonRamp = () => RAMP ||= (() => {
  const n = 32, d = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const x = i / (n - 1); d[i] = 255 * (0.58 + 0.24 * sstep(0.30, 0.40, x) + 0.18 * sstep(0.62, 0.72, x)); }
  return Object.assign(new THREE.DataTexture(d, n, 1, THREE.RedFormat), { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, needsUpdate: true });
})();
// any glTF / standard material -> toon, keeping its maps (KHR_texture_transform lives on the texture objects) and a touch more saturation
function toonify(m) {
  const t = new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, normalMap: m.normalMap || null, emissive: m.emissive ? m.emissive.clone() : 0x000000, emissiveMap: m.emissiveMap || null,
    emissiveIntensity: m.emissiveIntensity ?? 1, alphaMap: m.alphaMap || null, transparent: !!m.transparent, opacity: m.opacity ?? 1, alphaTest: m.alphaTest || 0, side: m.side ?? THREE.FrontSide, vertexColors: !!m.vertexColors, gradientMap: toonRamp() });
  if (m.normalScale) t.normalScale.copy(m.normalScale);
  const hsl = {}; t.color.getHSL(hsl); t.color.setHSL(hsl.h, Math.min(1, hsl.s * 1.12), hsl.l);
  t.name = m.name || ''; return t;
}
// characters: rim light on the silhouette and an anime highlight band on hair
function charPatch(m) {
  const hair = /hair|beard|brow/i.test(m.name);
  m.onBeforeCompile = sh => {
    sh.uniforms.uRim = U.rim;
    sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
      float rimF = pow(1.0 - clamp(dot(normal, geometryViewDir), 0.0, 1.0), 3.0);
      outgoingLight += uRim * rimF * (0.35 + 0.65 * diffuseColor.rgb);
      ${hair ? `#if NUM_DIR_LIGHTS > 0
        float hs = smoothstep(0.88, 0.94, dot(normal, normalize(directionalLights[0].direction + geometryViewDir)));
        hs *= smoothstep(0.35, 0.8, 0.5 + 0.5 * sin(dot(normal, vec3(37.0, 23.0, 11.0))));   // strands, not a flat helmet
        outgoingLight += hs * 0.14 * vec3(1.0, 0.96, 0.9);
      #endif` : ''}
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => (hair ? 'charHair' : 'char');
  return m;
}
// foliage: sways with the height above the instance base, and is darker / bluer low down, lighter on top
function windify(mat, H, A, grad = true) {
  const wh = { value: H }, wa = { value: A };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.time; sh.uniforms.uWindH = wh; sh.uniforms.uWindA = wa;
    sh.vertexShader = 'uniform float uTime, uWindH, uWindA;\nvarying float vWH;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 wP = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 wP = vec2(0.0);
      #endif
      vWH = clamp(transformed.y / uWindH, 0.0, 1.0);
      float wH = vWH * vWH, wT = uTime * 1.7 + wP.x * 0.011 + wP.y * 0.017;
      transformed.x += (sin(wT) + 0.35 * sin(wT * 2.3 + 1.7)) * uWindA * wH;
      transformed.z += cos(wT * 0.83) * uWindA * 0.6 * wH;`);
    if (grad) sh.fragmentShader = 'varying float vWH;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(vec3(0.76, 0.86, 0.96), vec3(1.14, 1.12, 0.98), vWH);`);
    else sh.fragmentShader = 'varying float vWH;\n' + sh.fragmentShader;
  };
  mat.customProgramCacheKey = () => (grad ? 'wind2g' : 'wind2');
  return mat;
}
// average colour of a texture (for the outline tint of textured parts)
function avgTexColor(t) {
  try { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.drawImage(t.image, 0, 0, 4, 4); const d = x.getImageData(0, 0, 4, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < 64; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } return new THREE.Color().setRGB(r / 4080, g / 4080, b / 4080, THREE.SRGBColorSpace); }
  catch (e) { return new THREE.Color(0.5, 0.5, 0.5); }
}
// outline: inverted hull pushed out along the normal in screen space (constant width in pixels, works with skinning); its colour is
// each part's albedo darkened (vertex colours of the merged outline geometry), not pure black
let OUTLINE = null;
const outlineMat = () => OUTLINE ||= (() => {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.BackSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uRes = U.res; sh.uniforms.uOutline = U.outline;
    sh.vertexShader = 'uniform vec2 uRes; uniform float uOutline; attribute float olw;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      #ifdef USE_SKINNING
        vec3 oN = objectNormal;
      #else
        vec3 oN = normal;
      #endif
      vec4 cN = projectionMatrix * vec4(normalize(normalMatrix * oN), 0.0);
      gl_Position.xy += normalize(cN.xy + vec2(1e-6)) * max(0.8, uOutline * olw) * 2.0 / uRes * gl_Position.w;`);
  };
  m.customProgramCacheKey = () => 'outline1';
  return m;
})();
// one merged geometry per model for its outline (position / normal / skin only): +1 draw call per unit instead of one per part
function outlineGeometry(g) {
  if (g.outline !== undefined) return g.outline;
  const meshes = []; g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (o.isMesh && !o.material?.transparent) meshes.push(o); });
  const skinned = meshes.some(o => o.isSkinnedMesh), keep = skinned ? ['position', 'normal', 'skinIndex', 'skinWeight'] : ['position', 'normal'];
  let geos = meshes.filter(o => !!o.isSkinnedMesh === skinned && keep.every(k => o.geometry.attributes[k])).map(o => {
    const src = o.geometry, ge = new THREE.BufferGeometry();
    for (const k of keep) { const a = src.attributes[k], n = a.itemSize, arr = new Float32Array(a.count * n); for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) arr[i * n + c] = a.getComponent(i, c); ge.setAttribute(k, new THREE.BufferAttribute(arr, n)); }
    if (src.index) ge.setIndex(new THREE.BufferAttribute(Uint32Array.from(src.index.array), 1));
    const mt = Array.isArray(o.material) ? o.material[0] : o.material, oc = (mt.color ? mt.color.clone() : new THREE.Color(1, 1, 1)).multiply(mt.map ? avgTexColor(mt.map) : new THREE.Color(1, 1, 1)).multiplyScalar(0.45);
    const col = new Float32Array(src.attributes.position.count * 3); for (let i = 0; i < col.length; i += 3) { col[i] = oc.r; col[i + 1] = oc.g; col[i + 2] = oc.b; }
    ge.setAttribute('color', new THREE.BufferAttribute(col, 3));   // outline colour = albedo darkened
    ge.setAttribute('olw', new THREE.BufferAttribute(new Float32Array(src.attributes.position.count).fill(/skin|iris|white|brow|eye|hair|beard|frame|lens|glass|vent|goggle/i.test(mt.name || '') ? 0.55 : 1), 1));   // thinner line on face, hair and small details
    if (!skinned) ge.applyMatrix4(o.matrixWorld);   // static models: bake into model space
    return ge;
  });
  if (geos.some(ge => !ge.index)) geos = geos.map(ge => (ge.index ? ge.toNonIndexed() : ge));
  return (g.outline = geos.length ? { geo: mergeGeometries(geos), skinned } : null);
}

/* ---------- small procedural textures (canvas) ---------- */
const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const leafTex = () => canvasTex(128, 128, (x, w, h) => {   // a clump of leaves with a darker rim, for the alpha leaf cards
  const R = rng(91);
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 52, px = 64 + Math.cos(a) * r, py = 64 + Math.sin(a) * r, s = 7 + R() * 7, l = 120 + R() * 110;
    x.save(); x.translate(px, py); x.rotate(R() * Math.PI); x.fillStyle = `rgb(${l * 0.55 | 0},${l | 0},${l * 0.35 | 0})`; x.strokeStyle = 'rgba(20,40,12,0.9)'; x.lineWidth = 1.5;
    x.beginPath(); x.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); x.fill(); x.stroke(); x.restore();
  }
});
const grassTex = () => canvasTex(64, 64, (x, w, h) => {   // tapered blades, lighter tips
  const R = rng(17);
  for (let i = 0; i < 26; i++) {
    const bx = 4 + R() * 56, top = 6 + R() * 26, lean = (R() - 0.5) * 14, wd = 2 + R() * 2.5, g = x.createLinearGradient(0, 64, 0, top);
    g.addColorStop(0, '#2f5a1c'); g.addColorStop(1, R() < 0.15 ? '#d8d070' : '#9fd860');
    x.fillStyle = g; x.beginPath(); x.moveTo(bx - wd, 64); x.quadraticCurveTo(bx + lean * 0.4, (64 + top) / 2, bx + lean, top); x.lineTo(bx + wd, 64); x.closePath(); x.fill();
  }
});
const barkTex = () => canvasTex(64, 128, (x, w, h) => {   // vertical bark grooves
  x.fillStyle = '#7a5434'; x.fillRect(0, 0, w, h); const R = rng(5);
  for (let i = 0; i < 70; i++) { const px = R() * w, l = 20 + R() * 60, py = R() * h; x.strokeStyle = R() < 0.6 ? 'rgba(52,32,18,0.8)' : 'rgba(150,110,72,0.5)'; x.lineWidth = 1 + R() * 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 4, py + l); x.stroke(); }
});
const blobTex = () => canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, false);
const detailTex = () => { const t = canvasTex(256, 256, (x, w, h) => {   // tiling grey detail multiplied into the ground (blades, specks)
  const img = x.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = 128 + (vnoise(i / 9, j / 9) - 0.5) * 70 + (hash(i, j) - 0.5) * 50 + (vnoise(i / 2.2, j / 14) - 0.5) * 60; const o = (j * w + i) * 4; d[o] = d[o + 1] = d[o + 2] = Math.max(0, Math.min(255, v)); d[o + 3] = 255; }
  x.putImageData(img, 0, 0);
}, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

// grass, dirt where the walk field says path (soft, noisy border), stone plazas at the two bases
function paintGround(S) {
  const M = MARGIN, cw = Math.ceil((WORLD_W + 2 * M) / S), ch = Math.ceil((WORLD_H + 2 * M) / S);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(cw, ch), d = img.data;
  const bases = [[190, 756, [92, 112, 150]], [WORLD_W - 190, 756, [150, 98, 92]]];
  for (let j = 0; j < ch; j++) {
    const z = -M + (j + 0.5) * S;
    for (let i = 0; i < cw; i++) {
      const x = -M + (i + 0.5) * S, inside = x >= 0 && z >= 0 && x < WORLD_W && z < WORLD_H;
      const wf = inside ? walkField(x, z) : 0, n1 = fbm(x / 260, z / 260), n2 = fbm(x / 48 + 31, z / 48 + 17), n3 = vnoise(x / 11, z / 11), k = 0.94 + 0.12 * hash(i, j);
      const hue = vnoise(x / 520 + 7, z / 520 + 3);   // big patches: yellow-green <-> blue-green
      const deep = 1 - sstep(0.04, 0.32, wf + (n2 - 0.5) * 0.12);   // forest floor: darker, browner
      let R = 70 + 30 * n1 + 12 * n3 + 22 * hue - 14 * deep, G = 140 + 32 * n1 + 14 * n3 - 14 * deep, B = 124 + 22 * n1 - 22 * hue + 2 * deep;   // fresh blue-green (the reference), warmer patches   // fresh blue-green, warmer patches
      const dirt = sstep(0.4, 0.58, wf + (n2 - 0.5) * 0.16);   // the border wobbles, the inside stays clearly dirt
      if (dirt > 0) {
        const rut = sstep(0.75, 1, wf) * (vnoise(x / 20, z / 90) - 0.5) * 22;   // worn tracks along the paths
        const dr = 198 + 22 * n2 + 12 * n3 - rut, dg = 142 + 20 * n2 + 10 * n3 - rut, db = 112 + 16 * n2 - rut * 0.7;   // soft pinkish-beige dirt
        R += (dr - R) * dirt; G += (dg - G) * dirt; B += (db - B) * dirt;
        const pb = hash(Math.floor(x / 7), Math.floor(z / 7));   // pebbles: small light stones with a dark side
        if (pb > 0.975) { const sh = hash(i, j) > 0.5 ? 34 : -30; R += sh; G += sh; B += sh + 6; }
      }
      const edge = dirt * (1 - dirt) * 4; R -= 10 * edge; G -= 4 * edge; B -= 2 * edge;   // slightly darker band where grass meets the path
      for (const [bx, bz, c] of bases) {
        const dd = Math.hypot(x - bx, z - bz); if (dd > 280) continue;
        const t = sstep(272, 238, dd), rim = sstep(262, 252, dd) * sstep(232, 244, dd), tile = ((Math.floor(x / 40) + Math.floor(z / 40)) & 1) * 10;
        R += (c[0] + 18 * n2 + tile - R) * t; G += (c[1] + 18 * n2 + tile - G) * t; B += (c[2] + 18 * n2 + tile - B) * t;
        R += 60 * rim; G += 60 * rim; B += 60 * rim;
      }
      const o = (j * cw + i) * 4; d[o] = R * k; d[o + 1] = G * k; d[o + 2] = B * k; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* ---------- environment kits: GLB from public/assets/models/env/ when present, stylised procedural otherwise ---------- */
// every part: { geo, mat, col } with the base on y = 0 at nominal size (an instance scale of 1 = the nominal height)
const toonMat = (opts) => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), ...opts });
const at = (g, x, y, z) => g.translate(x, y, z);
// organic blob: icosahedron pushed in / out by position noise (same position -> same offset, so no cracks between faces)
function blob(r, x, y, z, amp = 0.18) {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), n = 1 + (vnoise(vx / 22 + x, vz / 22 + vy / 30) - 0.5) * 2 * amp; p.setXYZ(i, vx * n, vy * n * 0.92, vz * n); }
  g.computeVertexNormals(); return at(g, x, y, z);
}
// vertical colour gradient (darker at the bottom = fake occlusion), multiplied by the instance tint
function shadeY(g, y0, y1, lo = 0.55, hi = 1.05) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0))), v = lo + (hi - lo) * t + (vnoise(p.getX(i) / 30, p.getZ(i) / 30) - 0.5) * 0.12; c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
// alpha leaf cards scattered on the surface of blobs ([x, y, z, r] each): fluffy, irregular silhouettes
function leafCards(blobs, n, size, seed) {
  const R = rng(seed), cards = [];
  for (let i = 0; i < n; i++) {
    const [bx, by, bz, br] = blobs[i % blobs.length], a = R() * Math.PI * 2, e = (R() - 0.3) * 1.6, d = br * (0.82 + R() * 0.25);
    const q = new THREE.PlaneGeometry(size * (0.8 + R() * 0.5), size * (0.8 + R() * 0.5));
    q.rotateZ(R() * Math.PI); q.rotateX((R() - 0.5) * 1.6); q.rotateY(R() * Math.PI);
    cards.push(at(q, bx + Math.cos(a) * Math.cos(e) * d, by + Math.sin(e) * d * 0.8, bz + Math.sin(a) * Math.cos(e) * d));
  }
  return mergeGeometries(cards);
}
let TEX = null;   // procedural textures shared by every kit (rebuilt per match)
const tex = () => TEX ||= { leaf: leafTex(), grass: grassTex(), bark: barkTex() };
const PROC = {
  tree_broad: () => {
    const B = [[0, 178, 0, 76], [50, 162, 22, 56], [-48, 166, -22, 58], [12, 218, -12, 54], [-22, 150, 42, 50], [38, 204, -38, 48], [-40, 205, 20, 46]];
    const crown = shadeY(mergeGeometries(B.map(([x, y, z, r], i) => blob(r, x, y, z, 0.2 + i * 0.01))), 110, 260);
    const trunk = mergeGeometries([at(new THREE.CylinderGeometry(9, 16, 130, 8), 0, 65, 0), at(new THREE.CylinderGeometry(4, 7, 70, 6).rotateZ(0.7), 26, 120, 0), at(new THREE.CylinderGeometry(4, 6, 60, 6).rotateZ(-0.8).rotateY(1.2), -20, 118, 14)]);
    return [
      { geo: trunk, mat: toonMat({ map: tex().bark, name: 'bark' }), col: 0xb08868 },
      { geo: crown, mat: windify(toonMat({ vertexColors: true }), 260, 5), col: 0x58a46a },
      { geo: leafCards(B, 46, 64, 3), mat: windify(toonMat({ map: tex().leaf, alphaTest: 0.45, side: THREE.DoubleSide }), 260, 6), col: 0xa8e0b0 },
    ];
  },
  tree_pine: () => {
    const tiers = [];
    for (let i = 0; i < 5; i++) {   // jagged star-shaped tiers, each a bit narrower and drooping at the rim
      const r = 80 - i * 13, h = 104 - i * 9, g = new THREE.ConeGeometry(r, h, 12, 1), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) if (p.getY(k) < -h / 2 + 0.01) { const a = Math.atan2(p.getZ(k), p.getX(k)), jag = (Math.round(a / (Math.PI / 6)) & 1) ? 0.7 : 1; p.setXYZ(k, p.getX(k) * jag, p.getY(k) - (jag === 1 ? 10 : 0), p.getZ(k) * jag); }
      g.computeVertexNormals(); tiers.push(at(g, 0, 92 + i * 44, 0));
    }
    return [
      { geo: at(new THREE.CylinderGeometry(7, 12, 110, 7), 0, 55, 0), mat: toonMat({ map: tex().bark, name: 'bark' }), col: 0x9a7458 },
      { geo: shadeY(mergeGeometries(tiers), 40, 300, 0.5, 1.05), mat: windify(toonMat({ vertexColors: true }), 300, 4), col: 0x3a8466 },
    ];
  },
  bush: () => {
    const B = [[0, 26, 0, 34], [26, 22, 12, 26], [-24, 20, -10, 26], [6, 36, -16, 22]];
    return [
      { geo: shadeY(mergeGeometries(B.map(([x, y, z, r]) => blob(r, x, y, z, 0.22))), 0, 60, 0.6, 1.05), mat: windify(toonMat({ vertexColors: true }), 62, 2), col: 0x56a468 },
      { geo: leafCards(B, 16, 34, 9), mat: windify(toonMat({ map: tex().leaf, alphaTest: 0.45, side: THREE.DoubleSide }), 62, 2.5), col: 0xb4e4b4 },
    ];
  },
  rock: () => {
    const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const n = 1 + (vnoise(p.getX(i) * 2.3, p.getZ(i) * 2.3 + p.getY(i)) - 0.5) * 0.35; p.setXYZ(i, p.getX(i) * n * 40, p.getY(i) * n * 26, p.getZ(i) * n * 33); }
    g.computeVertexNormals(); at(g, 0, 8, 0);
    const c = new Float32Array(p.count * 3), nm = g.attributes.normal;   // moss on the top faces
    for (let i = 0; i < p.count; i++) { const moss = Math.max(0, nm.getY(i) - 0.55) * 1.8, v = 0.85 + (hash(i, 1) - 0.5) * 0.1; c[i * 3] = v * (1 - 0.35 * moss); c[i * 3 + 1] = v * (1 + 0.1 * moss); c[i * 3 + 2] = v * (1 - 0.45 * moss); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return [{ geo: g, mat: toonMat({ vertexColors: true }), col: 0x9a978c }];
  },
  grass: () => [{ geo: mergeGeometries([0, 1, 2].map(i => at(new THREE.PlaneGeometry(26, 26).rotateY(i * Math.PI / 3), 0, 13, 0))), mat: windify(toonMat({ map: tex().grass, alphaTest: 0.5, side: THREE.DoubleSide }), 26, 3), col: 0xc8f0d0 }],
  crate: () => [{ geo: at(new THREE.BoxGeometry(40, 40, 40), 0, 20, 0), mat: toonMat({ color: 0xffffff }), col: 0x8a6238 }],
};
const NOMINAL_H = { tree_pine: 300, tree_broad: 260, tree_broad2: 250, bush: 62, rock: 34, crate: 40, fern: 40, log: 30, grass: 26, flower: 22, flower_pink: 22, flower_yellow: 22, mushroom: 18, pebble: 9 };
const KIT_MAX_VERTS = 12000;   // instanced hundreds of times: a heavier GLB would cost tens of millions of triangles per frame
const WIND = { tree_pine: 4, tree_broad: 6, tree_broad2: 6, bush: 2.5, fern: 3, grass: 3, flower: 2.5, flower_pink: 2.5, flower_yellow: 2.5 };   // sway amplitude (world units at the top) for GLB kits too
const FOLIAGE = /leaf|leaves|needle|twig|foliage|crown|grass|fern|flower|petal|bush/i;   // GLB materials that get the height colour gradient
async function loadKit(name) {
  const g = await loadGlb(`assets/models/env/${name}.glb`);
  let verts = 0; g?.scene.traverse(o => { if (o.isMesh) verts += o.geometry.attributes.position.count; });
  if (g && verts > KIT_MAX_VERTS) console.warn(`[3d] env/${name}.glb has ${verts} vertices (max ${KIT_MAX_VERTS} for instancing): using the procedural one`);
  if (!g || verts > KIT_MAX_VERTS) return PROC[name] ? PROC[name]() : null;
  const parts = [], k = NOMINAL_H[name] / g.height, box = new THREE.Box3().setFromObject(g.scene), cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const fix = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-cx, -g.minY, -cz));
  g.scene.traverse(o => {
    if (!o.isMesh) return;
    const mat = toonify(o.material);
    if (mat.transparent) { mat.transparent = false; mat.alphaTest = 0.5; mat.depthWrite = true; }   // blended foliage cannot be sorted per instance: cut it out instead
    if (WIND[name]) windify(mat, NOMINAL_H[name], WIND[name], FOLIAGE.test(mat.name) || name === 'bush' || name === 'grass');
    parts.push({ geo: o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(fix, o.matrixWorld)), mat, col: 0xffffff });
  });
  return parts;
}

/* ---------- unit placeholders (until public/assets/models/<key>.glb exists): built at height 1, scaled by def.height ---------- */
let PH = null;
const placeholderGeos = () => PH ||= {
  body: at(new THREE.CapsuleGeometry(0.2, 0.52, 4, 10), 0, 0.46, 0),
  head: at(new THREE.SphereGeometry(0.12, 12, 8), 0, 0.87, 0),
  visor: at(new THREE.BoxGeometry(0.16, 0.06, 0.06), 0, 0.89, 0.11),
  minion: at(new THREE.CapsuleGeometry(0.22, 0.42, 4, 8), 0, 0.43, 0),
  mvisor: at(new THREE.BoxGeometry(0.26, 0.1, 0.12), 0, 0.72, 0.18),
  towerBase: at(new THREE.CylinderGeometry(0.17, 0.22, 0.72, 8), 0, 0.36, 0),
  towerTop: at(new THREE.CylinderGeometry(0.2, 0.15, 0.2, 8), 0, 0.82, 0),
  towerCap: at(new THREE.ConeGeometry(0.16, 0.18, 8), 0, 1.0, 0),
  nexusBase: at(new THREE.CylinderGeometry(0.3, 0.36, 0.22, 10), 0, 0.11, 0),
  crystal: new THREE.OctahedronGeometry(0.2, 0),
  box: at(new THREE.BoxGeometry(1, 1, 1), 0, 0.5, 0),
  ring: new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2),
};

export class Render3D {
  constructor(scene) {
    this.w = scene; this.units = new Map(); this.frame = 0; this.dead = false;
    this._v = new THREE.Vector3(); this._o = { x: 0, y: 0 }; this._ray = new THREE.Raycaster(); this._ndc = new THREE.Vector2(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    const R = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.0;   // keeps hues and saturation (ACES washed the palette out)
    const cv = this.canvas = R.domElement;
    Object.assign(cv.style, { position: 'fixed', left: '0', top: '0', zIndex: '0', pointerEvents: 'none', imageRendering: 'auto' });
    const gc = scene.game.canvas; Object.assign(gc.style, { position: 'relative', zIndex: '1' });
    gc.parentNode.insertBefore(cv, gc);

    const S = this.scene = new THREE.Scene();
    S.background = new THREE.Color(0xa8d6da); S.fog = new THREE.Fog(0xa8d6da, 2000, 5000);   // blue-green haze that lightens the far ground
    this.cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 8000);
    S.add(new THREE.HemisphereLight(0xc4ecff, 0x5c8e8c, 1.45));   // sky-blue fill: shadows come out blue / teal, never grey
    const rim = new THREE.DirectionalLight(0x9fd4ff, 0.8); rim.position.set(500, 700, -900); S.add(rim);   // cool back light: separates the champions from the ground
    const sun = this.sun = new THREE.DirectionalLight(0xfff0dc, 2.05);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);   // ~1.8 world units per texel over the shadow box: soft enough, and 2048 cost ~6 fps
    Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 100, far: 4000 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1.5;
    S.add(sun, sun.target);

    // ground
    TEX = null; RAMP = null; OUTLINE = null;   // per-renderer GPU objects (the previous match disposed them)
    const tex = new THREE.CanvasTexture(paintGround(2.5)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = R.capabilities.getMaxAnisotropy();
    const gw = WORLD_W + 2 * MARGIN, gh = WORLD_H + 2 * MARGIN, gmat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }), det = this.detailTex = detailTex();
    gmat.onBeforeCompile = sh => {   // a tiling detail layer (blades, specks) multiplied in: crisp up close, the painted map gives the large shapes
      sh.uniforms.uDetail = { value: det }; sh.uniforms.uDetRep = { value: new THREE.Vector2(gw / 150, gh / 150) };
      sh.fragmentShader = 'uniform sampler2D uDetail; uniform vec2 uDetRep;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= mix(0.84, 1.16, texture2D(uDetail, vMapUv * uDetRep).r);`);
    };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh).rotateX(-Math.PI / 2).translate(WORLD_W / 2, 0, WORLD_H / 2), gmat);
    ground.receiveShadow = true; S.add(ground);
    // contact shadow under every unit (soft dark blob, grounds them even where the real shadow falls behind)
    this.blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); this.blobMat = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.6 });
    // post-process (one combined pass: soft glow + teal / warm grade + vignette); #fx=0 renders straight to the screen
    this.fx = new URLSearchParams(location.hash.slice(1)).get('fx') !== '0';
    if (this.fx) {
      this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
      this.postMat = new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: this.rt.texture }, uPx: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, uT: U.time },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uPx; uniform float uT; varying vec2 vUv;
          void main() {
            vec3 c = texture2D(tDiffuse, vUv).rgb, g = vec3(0.0);
            for (int i = 0; i < 8; i++) {   // glow: what is brighter than ~0.8 bleeds over two rings around the pixel
              float a = float(i) * 0.7854;
              vec3 s1 = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * uPx * 5.0).rgb, s2 = texture2D(tDiffuse, vUv + vec2(cos(a + 0.39), sin(a + 0.39)) * uPx * 13.0).rgb;
              g += max(s1 - 0.8, 0.0) * 0.6 + max(s2 - 0.8, 0.0) * 0.4;
            }
            c += g * 0.09;
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            c *= mix(vec3(0.8, 0.97, 1.08), vec3(1.04, 1.0, 0.95), smoothstep(0.12, 0.9, l));   // teal shadows and mid-tones, subtly warm lights
            c = mix(c, vec3(0.46, 0.68, 0.74), smoothstep(0.5, 1.0, vUv.y) * 0.2);              // blue haze towards the top (the far ground)
            vec2 q = vUv - vec2(-0.08, 1.12); float ang = atan(q.x, -q.y), fall = 1.0 - smoothstep(0.2, 1.25, length(q));
            c += vec3(1.0, 0.92, 0.78) * smoothstep(0.62, 1.0, sin(ang * 26.0 + uT * 0.25) * 0.5 + 0.5) * smoothstep(0.62, 1.0, sin(ang * 11.0 - uT * 0.13 + 1.3) * 0.5 + 0.5) * fall * 0.07;   // soft sun shafts from the top-left
            c = mix(vec3(l), c, 1.1);                                                           // a little more saturation
            c = c * 0.95 + vec3(0.016, 0.026, 0.032);                                           // pastel lift (haze)
            c *= mix(0.78, 1.0, smoothstep(0.82, 0.3, length((vUv - 0.5) * vec2(1.25, 1.0))));   // light vignette
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
        depthTest: false, depthWrite: false,
      });
      this.postScene = new THREE.Scene(); this.postScene.add(Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat), { frustumCulled: false })); this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.buildForest();
    this.buildCamps();
    this.vfx3d = new Vfx3D(S);   // 3D particles / meshes for the game's effects (vfx3d.js)

    this.ringMats = {};

    // ground decal: the game's own ground drawings (aim guides, zones, rings, decals...) replayed into a canvas laid on the ground
    const gdc = this.gdCanvas = document.createElement('canvas'); gdc.width = GD_W; gdc.height = GD_H; this.gdCtx = gdc.getContext('2d');
    this.gdTex = new THREE.CanvasTexture(gdc); this.gdTex.colorSpace = THREE.SRGBColorSpace;
    this.gdMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.gdTex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    this.gdMesh.position.y = 1.2; this.gdMesh.renderOrder = 1; this.gdMesh.visible = false; S.add(this.gdMesh);
    this.tintCache = new Map(); this._hide = new Set(); this._saved = []; this._gi = []; this.dirty = false;

    // overlay camera: screen space (world = screen / zoom) for bars, names, floating text and the upright effects
    this.ov = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'overlay3d').setOrigin(0, 0);
    scene.events.on('prerender', this._pre = () => this.preRender());
    scene.events.on('render', this._post = () => this.postRender());
    this.resize();
  }

  /* ---------- forest: instanced trees / bushes / rocks on every non-walkable cell + a band around the map ---------- */
  async buildForest() {
    const names = ['tree_pine', 'tree_broad', 'tree_broad2', 'bush', 'rock', 'fern', 'log', 'grass', 'flower', 'flower_pink', 'flower_yellow', 'mushroom', 'pebble'], kits = {};   // without GLB nor procedural (tree_broad2, fern, log, flower...): skipped
    await Promise.all(names.map(async n => { kits[n] = await loadKit(n); }));
    if (this.dead) return;
    const R = rng(777), rnd = (a, b) => a + R() * (b - a), list = Object.fromEntries(names.map(n => [n, []]));
    const W = (i, j) => cellWalk(i, j);
    const near = (i, j) => { for (let d = 1; d <= 4; d++) for (let dj = -d; dj <= d; dj++) for (let di = -d; di <= d; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === d && W(i + di, j + dj)) return d; return 5; };
    const clear = (x, z, r) => !isWalk(x, z) && !isWalk(x + r, z) && !isWalk(x - r, z) && !isWalk(x, z + r) && !isWalk(x, z - r);
    const put = (kind, x, z, s, r) => { if (x < 0 || z < 0 || x >= WORLD_W || z >= WORLD_H || clear(x, z, r)) list[kind].push([x, z, s, R() * Math.PI * 2]); };
    const tree = () => { const u = R(); return u < 0.45 ? 'tree_pine' : u < 0.8 || !kits.tree_broad2 ? 'tree_broad' : 'tree_broad2'; };   // a few autumn trees when that model exists
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      if (W(i, j)) continue;
      const d = near(i, j), cx = i * CELL + CELL / 2, cz = j * CELL + CELL / 2;
      // the camera looks north: a tall tree just south of a path would hide the path behind its crown, so low vegetation there
      const lowOnly = d <= 3 && (W(i, j - 1) || W(i, j - 2) || W(i, j - 3) || W(i - 1, j - 2) || W(i + 1, j - 2));
      if (lowOnly) { put('bush', cx + rnd(-14, 14), cz + rnd(-14, 14), rnd(0.8, 1.2), 26); if (R() < 0.5) put('bush', cx + rnd(-26, 26), cz + rnd(-26, 26), rnd(0.6, 0.95), 22); if (R() < 0.25) put('rock', cx + rnd(-24, 24), cz + rnd(-24, 24), rnd(0.7, 1.2), 18); }
      else if (d === 1) { put('bush', cx + rnd(-10, 10), cz + rnd(-10, 10), rnd(0.8, 1.15), 26); if (R() < 0.45) put('bush', cx + rnd(-22, 22), cz + rnd(-22, 22), rnd(0.6, 0.9), 22); if (R() < 0.15) put('rock', cx + rnd(-20, 20), cz + rnd(-20, 20), rnd(0.6, 1.1), 18); }
      else if (d <= 3) { put(tree(), cx + rnd(-12, 12), cz + rnd(-12, 12), rnd(0.62, 0.9), 14); if (R() < 0.6) put(tree(), cx + rnd(-28, 28), cz + rnd(-28, 28), rnd(0.5, 0.75), 14); if (R() < 0.3) put('rock', cx + rnd(-24, 24), cz + rnd(-24, 24), rnd(0.7, 1.3), 18); if (R() < 0.35) put('bush', cx + rnd(-26, 26), cz + rnd(-26, 26), rnd(0.7, 1), 22); }
      else { put(tree(), cx + rnd(-14, 14), cz + rnd(-14, 14), rnd(0.9, 1.25), 14); if (R() < 0.7) put(tree(), cx + rnd(-30, 30), cz + rnd(-30, 30), rnd(0.6, 0.95), 14); }
      if (kits.fern && d <= 2 && R() < 0.12) put('fern', cx + rnd(-28, 28), cz + rnd(-28, 28), rnd(0.7, 1.2), 30);
      if (kits.log && d >= 2 && R() < 0.05) put('log', cx + rnd(-16, 16), cz + rnd(-16, 16), rnd(0.8, 1.1), 30);
    }
    // outside the map: dense forest, only as far as the camera (clamped to the map bounds) can ever see
    for (let z = -560; z < WORLD_H + 480; z += 74) for (let x = -320; x < WORLD_W + 320; x += 74) {
      const px = x + rnd(-28, 28), pz = z + rnd(-28, 28);
      if (px >= -10 && pz >= -10 && px <= WORLD_W + 10 && pz <= WORLD_H + 10) continue;
      const u = R(); list[u < 0.08 ? 'rock' : u < 0.2 ? 'bush' : tree()].push([px, pz, u < 0.2 ? rnd(0.8, 1.3) : rnd(0.85, 1.35), R() * Math.PI * 2]);
    }
    const flower = () => { const v = ['flower', 'flower_pink', 'flower_yellow'].filter(n => kits[n]); return v.length ? v[R() * v.length | 0] : 'flower'; };
    // ground cover: grass tufts and flowers just outside the paths (never on the dirt), mushrooms on the forest floor, pebbles on the path borders
    for (let z = 8; z < WORLD_H; z += 17) for (let x = 8; x < WORLD_W; x += 17) {
      const px = x + rnd(-8, 8), pz = z + rnd(-8, 8), wf = walkField(px, pz), base = Math.hypot(px - 190, pz - 756) < 290 || Math.hypot(px - WORLD_W + 190, pz - 756) < 290;
      if (base) continue;
      if (wf > 0.1 && wf < 0.36) { if (R() < 0.62) list.grass.push([px, pz, rnd(0.7, 1.35), R() * 6.283]); else if (R() < 0.18) list[flower()].push([px, pz, rnd(0.7, 1.2), R() * 6.283]); }
      else if (wf <= 0.1) { const u = R(); if (u < 0.07) list.grass.push([px, pz, rnd(0.8, 1.4), R() * 6.283]); else if (u < 0.085) list.mushroom.push([px, pz, rnd(0.7, 1.3), R() * 6.283]); else if (u < 0.095) list[flower()].push([px, pz, rnd(0.7, 1.1), R() * 6.283]); }
      else if (wf >= 0.4 && wf < 0.56 && R() < 0.05) list.pebble.push([px, pz, rnd(0.6, 1.4), R() * 6.283]);
    }
    // one InstancedMesh per kit part and per 1000-unit square: chunks off screen (or outside the sun's shadow box) are culled
    const m = this._m, q = this._q, s = this._s, p = this._v, up = new THREE.Vector3(0, 1, 0), c = this._c, CH = 1000;
    for (const n of names) {
      if (!list[n].length || !kits[n]) continue;
      const chunks = new Map();
      list[n].forEach((it, k) => { const key = Math.floor((it[0] + MARGIN) / CH) + ',' + Math.floor((it[1] + MARGIN) / CH); if (!chunks.has(key)) chunks.set(key, []); chunks.get(key).push([...it, k]); });
      for (const items of chunks.values()) for (const part of kits[n]) {
        const im = new THREE.InstancedMesh(part.geo, part.mat, items.length);
        items.forEach(([x, z, sc, rot, id], k) => {
          q.setFromAxisAngle(up, rot); s.set(sc, sc * (0.9 + hash(id, 7) * 0.2), sc); p.set(x, 0, z);
          im.setMatrixAt(k, m.compose(p, q, s));
          c.setHex(part.col).multiplyScalar(0.84 + hash(id, 3) * 0.28); c.offsetHSL((hash(id, 5) - 0.5) * 0.05, 0, 0);   // tint: brightness and a slight hue drift per instance
          im.setColorAt(k, c);
        });
        im.castShadow = !/^(rock|fern|grass|flower.*|mushroom|pebble)$/.test(n) && !/bark|trunk|stem|wood/i.test(part.mat.name || '');   // trunks hide under the crowns: only the foliage casts (big saving in the shadow pass) im.receiveShadow = true; im.computeBoundingSphere();
        this.scene.add(im);
      }
    }
    this.forestCount = names.reduce((a, n) => a + (kits[n] ? list[n].length : 0), 0);
  }

  // neutral camps: a flag in the owner's colour (the capture ring / progress pie is the game's own drawing, in the ground decal)
  buildCamps() {
    this.campObjs = CAMP_SITES.map(cs => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 130, 6).translate(0, 65, 0), toonMat({ color: 0x3a4250 }));
      const flag = new THREE.Mesh(new THREE.BoxGeometry(64, 38, 2).translate(34, 108, 0), windify(toonMat({ color: 0xc9d1dd }), 130, 3, false));
      pole.position.set(cs.x, 0, cs.y + 14); flag.position.copy(pole.position); pole.castShadow = flag.castShadow = true;
      this.scene.add(pole, flag);
      return { flag, pole, owner: undefined };
    });
  }

  resize() {
    const s = this.w.scale, W = s.width, H = s.height;
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H; this.renderer.setSize(W, H); this.cam.aspect = W / H; this.cam.updateProjectionMatrix(); this.ov.setSize(W, H);
    const pr = this.renderer.getPixelRatio(), bw = Math.round(W * pr), bh = Math.round(H * pr);
    U.res.value.set(bw, bh);   // outline width is in drawing-buffer pixels
    if (this.rt) { this.rt.setSize(bw, bh); this.postMat.uniforms.uPx.value.set(1 / bw, 1 / bh); }
  }

  // the three.js frame: through the post-process pass when it is on
  draw() {
    const R = this.renderer;
    R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = (this.frame & 1) === 0;   // shadows at half rate (~30 Hz): invisible, and the shadow pass was a large share of the frame
    if (!this.rt) { R.render(this.scene, this.cam); return; }
    R.setRenderTarget(this.rt); R.render(this.scene, this.cam); R.setRenderTarget(null); R.render(this.postScene, this.postCam);
  }

  /* ---------- camera: perspective, tilted, framing what the 2D camera frames (follows its smoothed midpoint and zoom) ---------- */
  camera3d() {
    if (this.dead) return;
    this.resize();
    const s = this.w, mid = s.cameras.main.midPoint, zoom = s.zoom || 1;
    const vis = this.H / zoom * FRAME_K, D = vis / (2 * Math.tan(FOV * Math.PI / 360)), tx = mid.x, tz = mid.y + 30;
    this.cam.position.set(tx, D * Math.sin(TILT), tz + D * Math.cos(TILT)); this.cam.lookAt(tx, 0, tz);
    this.cam.near = D * 0.25; this.cam.far = D * 5; this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
    this.scene.fog.near = D * 1.0; this.scene.fog.far = D * 2.4;   // depth: the far (upper) part of the view melts into the blue haze   // the far (upper) part of the view fades into the haze
    this.sun.position.set(tx - 700, 1500, tz + 600); this.sun.target.position.set(tx, 0, tz); this.sun.target.updateMatrixWorld();
    this.ov.setZoom(zoom).setScroll(0, 0);
    U.outline.value = Math.min(1.8, Math.max(0.9, 1.25 * zoom / 1.125));   // the closer the camera, the thicker the line
  }

  // world point -> screen pixels (reused object)
  toScreen(x, h, z) { const v = this._v.set(x, h, z).project(this.cam), o = this._o; o.x = (v.x + 1) / 2 * this.W; o.y = (1 - v.y) / 2 * this.H; return o; }
  // world point -> overlay-camera coordinates
  ovPoint(x, h, z) { const o = this.toScreen(x, h, z), k = this.w.zoom || 1; o.x /= k; o.y /= k; return o; }
  // overlay anchor above a unit's head (bars / names)
  headOv(f) { return this.ovPoint(f.x, f.def.height + (f.def.fly ? 50 : 0), f.y); }
  // screen pixels -> ground point (game x, y)
  groundAt(sx, sy) {
    this._ndc.set(sx / this.W * 2 - 1, -(sy / this.H) * 2 + 1); this._ray.setFromCamera(this._ndc, this.cam);
    const p = this._ray.ray.intersectPlane(this.groundPlane, this._v);
    return p ? { x: p.x, y: p.z } : { x: this.cam.position.x, y: this.cam.position.z };
  }
  // is a screen point over a unit's on-screen silhouette box?
  hitTest(f, sx, sy) {
    const a = this.toScreen(f.x, 0, f.y), fx = a.x, fy = a.y, b = this.toScreen(f.x, f.def.height, f.y), hy = b.y, hw = Math.max(22, (fy - hy) * 0.35);
    return Math.abs(sx - fx) < hw && sy > hy - 10 && sy < fy + 15;
  }

  /* ---------- units ---------- */
  ringMat(col, sel) { const k = col + (sel ? 's' : ''); return (this.ringMats[k] ||= new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: sel ? 1 : 0.8, depthWrite: false })); }

  makeUnit(f) {
    const root = new THREE.Group(), u = { root, body: null, mats: [], mixer: null, actions: null, cur: null, curAct: null, lastT: 0, px: f.x, pz: f.y, spd: 0, yaw: Math.atan2(f.ax, f.ay), alpha: 1, flash: false, glb: false, seen: 0, ring: null, dead: false,
      turnRate: 0, bank: 0, pitch: 0, squash: 0, wasDrop: !!f.drop, outline: null };
    const H = f.def.height, r = f.isChamp ? H * 0.425 : f.isTower ? (f.def.radius || 40) * 1.05 : H * 0.3;
    u.ring = new THREE.Mesh(placeholderGeos().ring, this.ringMat(COL.enemy, false)); u.ring.scale.setScalar(r); u.ring.position.y = 1.5; u.ring.renderOrder = 2;
    u.blob = new THREE.Mesh(this.blobGeo, this.blobMat); u.blob.scale.setScalar(f.isTower ? r * 2.2 : H * 0.62); u.blob.position.y = 0.8; u.blob.renderOrder = 1;
    root.add(u.ring, u.blob);
    this.setBody(u, this.placeholder(f, u));
    this.scene.add(root);
    loadGlb(`assets/models/${f.key}.glb`).then(g => { if (g && !u.dead && !this.dead) this.useGlb(u, f, g); });
    return u;
  }

  placeholder(f, u) {
    const G = placeholderGeos(), H = f.def.height, team = COL.team[f.baseTeam] ?? 0x888888, grp = new THREE.Group();
    const mat = (color, extra) => { const m = charPatch(toonMat({ color, ...extra })); u.mats.push(m); return m; };
    const add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; grp.add(o); return o; };
    if (f.isNexus) {
      add(G.nexusBase, mat(0x6d7178)); u.crystal = add(G.crystal, mat(team, { emissive: team, emissiveIntensity: 0.6 })); u.crystal.position.y = 0.62; u.crystal.scale.set(1, 1.6, 1);
    } else if (f.isTower) {
      add(G.towerBase, mat(0x7a7d84)); add(G.towerTop, mat(team)); add(G.towerCap, mat(0x40444c));
    } else if (f.def.bot === 'wall') {
      const L = f.def.len || 300, b = add(G.box, mat(0x6a7a8a)); b.scale.set(f.def.vert ? 20 / H : L / H, 40 / H, f.def.vert ? L / H : 20 / H); u.noYaw = true;
    } else if (f.isBot || f.isMinion) {
      add(G.minion, mat(team)); add(G.mvisor, mat(0x1a1d24));
    } else {
      add(G.body, mat(team)); add(G.head, mat(0xd9a57a)); add(G.visor, mat(0x111318));
    }
    grp.scale.setScalar(H);
    if (f.isTower || f.isNexus) u.noYaw = true;
    return grp;
  }

  setBody(u, obj) { if (u.body) u.root.remove(u.body); u.body = obj; u.root.add(obj); }

  useGlb(u, f, g) {
    const model = SkeletonUtils.clone(g.scene), k = f.def.height / g.height;
    u.mats.forEach(m => m.dispose()); u.mats = []; u.crystal = null;
    const toon = m => { const t = charPatch(toonify(m)); u.mats.push(t); return t; };   // per unit (flash / transparency are per unit)
    let firstSkin = null;
    model.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = false; o.material = Array.isArray(o.material) ? o.material.map(toon) : toon(o.material); if (o.isSkinnedMesh && !firstSkin) firstSkin = o; });
    const ol = outlineGeometry(g);   // coloured outline: one extra draw per unit
    if (ol) {
      let om;
      if (ol.skinned && firstSkin) { om = new THREE.SkinnedMesh(ol.geo, outlineMat()); om.bind(firstSkin.skeleton, firstSkin.bindMatrix); firstSkin.parent.add(om); }
      else if (!ol.skinned) { om = new THREE.Mesh(ol.geo, outlineMat()); model.add(om); }
      if (om) {   // the merged outline geometry also casts the unit's shadow (the shadow pass ignores the screen-space push): 1 shadow draw instead of one per part
        om.castShadow = true; u.outline = om;
        model.traverse(o => { if (o.isMesh && o !== om) o.castShadow = false; });
      }
    }
    const holder = new THREE.Group(); model.scale.setScalar(k); model.position.y = -g.minY * k; holder.add(model);
    this.setBody(u, holder);
    u.glb = true; u.mixer = new THREE.AnimationMixer(model); u.actions = {}; u.cur = null; u.curAct = null; u.alpha = 1; u.flash = false;
    for (const clip of g.animations) u.actions[clip.name] = u.mixer.clipAction(clip);
  }

  dropUnit(u) {
    u.dead = true; this.scene.remove(u.root);
    if (u.mixer) { u.mixer.stopAllAction(); u.mixer.uncacheRoot(u.mixer.getRoot()); }
    u.mats.forEach(m => m.dispose());
  }

  // which clip a fighter should be playing
  animate(u, f, dt) {
    let name = 'idle', loop = true, ts = 1, restart = false;
    const scale = f.def.height / 1.67;
    if (!f.alive) { name = 'death'; loop = false; }
    else if (f.state === 'cast') {
      name = u.actions[f.anim] ? f.anim : f.anim === 'dash' ? 'run' : /^attack/.test(f.anim || '') ? 'attack' : (u.actions.power1 ? 'power1' : 'cast');   // clips are named like the sprite anims: attack, attack3, power1-3, ult, dash
      loop = name === 'run' || name === 'dash'; restart = f.stateT < u.lastT;
      const a = u.actions[name]; if (a && !loop) ts = a.getClip().duration / Math.max(0.15, f.stateDur || 0.4);
      if (loop) ts = 1.6;
    } else if (f.state === 'walk' || f.state === 'run') { name = f.state; ts = Math.min(2.2, Math.max(0.5, u.spd / ((name === 'run' ? RUN_REF : WALK_REF) * scale))); }
    u.lastT = f.stateT;
    if (!u.actions[name]) name = u.actions.idle ? 'idle' : null;
    if (!name) return;
    const next = u.actions[name];
    next.timeScale = ts;
    if (name !== u.cur || restart) {
      if (f.state === 'cast' && f.alive) u.squash = 1;   // a little squash at the start of every attack / cast
      next.reset(); next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); next.clampWhenFinished = !loop; next.enabled = true; next.setEffectiveWeight(1); next.play();
      if (u.curAct && u.curAct !== next) next.crossFadeFrom(u.curAct, 0.15, false);
      u.cur = name; u.curAct = next;
    }
    u.mixer.update(dt);
  }

  // procedural motion for the placeholder bodies
  animatePlaceholder(u, f, t) {
    const b = u.body; let oy = 0, rx = 0, sy = 1;
    if (u.crystal) { u.crystal.rotation.y = t * 0.8; u.crystal.position.y = 0.62 + Math.sin(t * 1.6) * 0.03; }
    if (f.isTower) { if (!f.alive) { b.scale.y = f.def.height * 0.22; b.children.forEach(m => m.material.color.setHex(0x333333)); } return; }
    if (!f.alive) rx = -Math.min(1, f.stateT / 0.5) * Math.PI / 2;
    else if (f.state === 'walk' || f.state === 'run') oy = Math.abs(Math.sin(t * (f.state === 'run' ? 14 : 9))) * f.def.height * 0.04;
    else if (f.state === 'cast') { const p = Math.min(1, f.stateT / (f.stateDur || 0.4)); b.position.z = Math.sin(p * Math.PI) * f.def.height * (f.anim === 'attack' ? 0.15 : 0.03); sy = 1 - Math.sin(p * Math.PI) * 0.06; }
    else if (f.state === 'stun') b.rotation.z = Math.sin(t * 30) * 0.06;
    if (f.state !== 'cast') b.position.z = 0;
    if (f.state !== 'stun') b.rotation.z = 0;
    b.position.y = oy; b.rotation.x = rx; b.scale.y = f.def.height * sy;
  }

  syncUnit(u, f, dt, t) {
    const w = this.w, me = w.player, root = u.root;
    const hidden = f.hiddenFor(me) || w.blindVis(f) <= 0;
    // measured velocity (works for AI, players and network ghosts alike)
    const dx = f.x - u.px, dz = f.y - u.pz, raw = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
    if (raw < 2000) u.spd += (raw - u.spd) * Math.min(1, dt * 10); else u.spd = 0;
    u.px = f.x; u.pz = f.y;
    root.visible = !hidden;
    if (hidden) { if (u.mixer) u.mixer.update(dt); return; }
    // height: drones hover, dropped reinforcements fall from the ship
    let lift = 0, alpha = 1;
    if (f.def.fly && f.alive) lift = 50 + Math.sin(t * 3.8 + f.nid * 1.7) * 5;
    if (f.drop) { const d = f.drop, p = Math.max(0, Math.min(1, d.t / d.dur)); lift = d.slide ? Math.sin(p * Math.PI) * 60 + d.h * (1 - p) : d.h * (1 - p * p); if (d.t < 0) alpha = 0; }
    root.position.set(f.x, lift, f.y);
    u.blob.position.y = 0.8 - lift;   // the contact shadow stays on the ground while the unit is lifted
    if (u.wasDrop && !f.drop) u.squash = 1;   // landed from the ship
    u.wasDrop = !!f.drop;
    // facing: where it walks while moving, where it aims otherwise (attacks / casts / standing); eased, with a capped turn speed
    const moving = u.spd > 20 && f.state !== 'cast' && Math.hypot(dx, dz) > 0.01;
    if (!u.noYaw) {
      const want = moving ? Math.atan2(dx, dz) : Math.atan2(f.ax, f.ay);
      let dy = want - u.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const step = Math.max(-13 * dt, Math.min(13 * dt, dy * Math.min(1, dt * 12)));
      u.yaw += step; u.turnRate += ((dt > 0 ? step / dt : 0) - u.turnRate) * Math.min(1, dt * 8);
      if (f.alive || !u.glb) root.rotation.y = u.yaw;
    }
    if (u.glb && !u.noYaw) {   // body language: bank into turns, lean forward when running, squash on attacks / landing
      const run = Math.min(1, u.spd / (RUN_REF * f.def.height / 1.67)), on = f.alive && moving;
      u.bank += ((on ? Math.max(-0.22, Math.min(0.22, -u.turnRate * 0.045 * (0.4 + run))) : 0) - u.bank) * Math.min(1, dt * 8);
      u.pitch += ((on ? 0.13 * run : 0) - u.pitch) * Math.min(1, dt * 6);
      u.squash = Math.max(0, u.squash - dt * 5);
      const s = Math.sin(u.squash * Math.PI) * 0.5 + u.squash * 0.5;
      u.body.rotation.set(u.pitch, 0, u.bank); u.body.scale.set(1 + 0.06 * s, 1 - 0.1 * s, 1 + 0.06 * s);
    }
    // transparency: invisible allies / ghosts, the blinded player's vision, corpses fading out
    if (f.away || f.fogHidden || f.invis || (f.antivirus && f.owner?.invis)) alpha = Math.min(alpha, 0.4);
    alpha *= Math.min(1, w.blindVis(f));
    if (!f.alive && !f.isChamp && !f.isTower) alpha *= Math.max(0, 1 - Math.max(0, f.stateT - 2) / 0.6);
    if (Math.abs(alpha - u.alpha) > 0.01) { u.alpha = alpha; for (const m of u.mats) { m.transparent = alpha < 1; m.opacity = alpha; m.depthWrite = alpha >= 1; } if (u.outline) u.outline.visible = alpha >= 0.99; u.blob.visible = alpha > 0.3; }
    // damage flash (Fighter.flash sets flashT)
    const fl = f.flashT > 0; if (fl) f.flashT -= dt;
    if (fl !== u.flash) { u.flash = fl; for (const m of u.mats) if (m.emissive) { if (fl) { m.userData.em ??= m.emissive.getHex(); m.userData.ei ??= m.emissiveIntensity; m.emissive.setHex(0xff2a2a); m.emissiveIntensity = 0.45; } else { m.emissive.setHex(m.userData.em ?? 0); m.emissiveIntensity = m.userData.ei ?? 1; } } }
    // team ring
    const col = f === me ? COL.me : f.team === me.baseTeam ? COL.ally : COL.enemy, sel = w.selected === f;
    u.ring.visible = f.alive; u.ring.material = this.ringMat(col, sel);
    if (u.glb) { this.animate(u, f, dt); if (!f.isChamp && !f.alive && f.isTower) u.body.scale.y = 0.25; }
    else this.animatePlaceholder(u, f, t);
  }

  syncCamps() {
    const camps = this.w.camps || [];
    this.campObjs.forEach((o, i) => {
      const c = camps[i]; o.flag.visible = o.pole.visible = !!c;
      if (!c || o.owner === c.owner) return;
      o.owner = c.owner; o.flag.material.color.setHex(this.w.campOwnerColor(c.owner));
    });
  }

  syncFog() {
    const F = this.w.fog; if (!F) return;
    if (!this.fogMesh) {
      this.fogTex = new THREE.CanvasTexture(F.tex.getSourceImage()); this.fogTex.colorSpace = THREE.SRGBColorSpace;
      this.fogMesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W, WORLD_H).rotateX(-Math.PI / 2).translate(WORLD_W / 2, 4, WORLD_H / 2), new THREE.MeshBasicMaterial({ map: this.fogTex, transparent: true, depthWrite: false, depthTest: false, fog: false, toneMapped: false }));
      this.fogMesh.renderOrder = 10; this.scene.add(this.fogMesh);
    }
    this.fogTex.needsUpdate = true;
  }

  sync(dt) {
    if (this.dead) return;
    const w = this.w, t = w.time.now / 1000, fr = ++this.frame;
    U.time.value = t;   // wind
    for (const f of w.fighters) {
      let u = this.units.get(f);
      if (!u) { u = this.makeUnit(f); this.units.set(f, u); }
      u.seen = fr; this.syncUnit(u, f, dt, t);
    }
    for (const [f, u] of this.units) if (u.seen !== fr) { this.dropUnit(u); this.units.delete(f); }
    this.syncCamps(); this.syncFog(); this.vfx3d.sync(w, dt);
    this.dirty = true;   // the three.js frame is drawn in preRender, together with the ground decal
  }

  /* ---------- the game's own 2D drawings, shown in 3D ----------
     'hide'   : replaced by the 3D view (unit sprites, shadows, rings, camp flags, fog overlay)
     'ground' : lies on the ground (Graphics, ground decals, 'below' vfx, shadow ellipses) -> replayed into the ground decal canvas
     'up'     : upright effects (vfx, projectiles, ability objects, icons) -> drawn by the overlay camera at their projected screen spot */
  kind(o) {
    if (this._hide.has(o) || o.__hide3d || this.vfx3d.claim(o)) return 'hide';
    switch (o.type) {
      case 'Graphics': return o.__anchor ? 'up' : 'ground';
      case 'Ellipse': case 'Arc': return o.depth < 90000 ? 'ground' : 'up';
    }
    const key = o.texture?.key;
    if (!key) return 'up';
    if (key === 'fogmask') return 'hide';
    if (GROUND_KEYS.has(key) || key.startsWith('aim_') || key.startsWith('inktrail')) return 'ground';
    if (key.startsWith('vfx_') && o.depth < o.y) return 'ground';   // vfx(..., { below: true })
    return 'up';
  }

  // world point -> scale of one world unit on screen, relative to the overlay camera zoom
  ovScale(x, h, z) {
    const c = this.cam, e = c.matrixWorld.elements, depth = -((x - c.position.x) * e[8] + (h - c.position.y) * e[9] + (z - c.position.z) * e[10]);
    return depth > 1 ? this.H / (2 * Math.tan(FOV * Math.PI / 360) * depth) / (this.w.zoom || 1) : 0;
  }

  preRender() {
    if (this.dead) return;
    const s = this.w, mainId = s.cameras.main.id, both = mainId | this.ov.id, list = s.children.list, hide = this._hide, saved = this._saved, gi = this._gi;
    hide.clear(); saved.length = 0; gi.length = 0;
    for (const f of s.fighters) {
      hide.add(f.spr); hide.add(f.shadow); if (f.ring) hide.add(f.ring); if (f.auraSpr) hide.add(f.auraSpr);
      if (f.shieldG) f.shieldG.__anchor = f; if (f.auraG) f.auraG.__anchor = f;   // upright auras drawn around the unit
    }
    for (const c of s.camps || []) if (c.flag) hide.add(c.flag);
    for (const o of this.vfx3d.hidden) hide.add(o);   // 2D sprites / graphics replaced by 3D effects
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.__ov) { o.cameraFilter = mainId; if (o.__w) { const p = this.ovPoint(o.__w.x, o.__w.h || 0, o.__w.y); o.setPosition(p.x, p.y - (o.__rise || 0)); } continue; }
      const k = this.kind(o);
      o.cameraFilter = both;
      if (!o.visible || k === 'hide') continue;
      if (k === 'ground') { gi.push(o); continue; }
      // upright: move to its projected spot (and perspective size) for this render only; postRender puts the world values back
      const an = o.__anchor, ax = an ? an.x : o.x, ay = an ? an.y : o.y, gh = an ? 0 : UP_K, gz = an ? ay : ay + UP_K, sc = this.ovScale(ax, gh, gz);
      if (!sc) continue;
      const p = this.ovPoint(ax, gh, gz);
      saved.push(o, o.x, o.y, o.scaleX, o.scaleY);
      if (an) { o.x = p.x - (ax - o.x) * sc; o.y = p.y - (ay - o.y) * sc; } else { o.x = p.x; o.y = p.y; }
      o.scaleX *= sc; o.scaleY *= sc; o.cameraFilter = mainId;
    }
    this.upCount = saved.length / 5; this.groundCount = gi.length;   // (stats for the tests)
    if (!this.dirty) return;   // paused: nothing moved, keep the last 3D frame
    this.drawGround(gi);
    this.vfx3d.write();
    this.draw();
    this.dirty = false;
  }

  postRender() {
    const sv = this._saved;
    for (let i = 0; i < sv.length; i += 5) { const o = sv[i]; o.x = sv[i + 1]; o.y = sv[i + 2]; o.scaleX = sv[i + 3]; o.scaleY = sv[i + 4]; }
    sv.length = 0;
  }

  // a texture frame as a drawable (tinted copy cached per colour; Phaser's tint is multiplicative)
  frameImage(o) {
    const fr = o.frame, tint = o.isTinted ? o.tintTopLeft : 0xffffff;
    if (!fr?.source?.image) return null;
    const key = fr.texture.key + '|' + fr.name + '|' + tint;
    let c = this.tintCache.get(key);
    if (!c) {
      const w = fr.cutWidth, h = fr.cutHeight; c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(fr.source.image, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
      if (tint !== 0xffffff) { x.globalCompositeOperation = 'multiply'; x.fillStyle = rgba(tint, 1); x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in'; x.drawImage(fr.source.image, fr.cutX, fr.cutY, w, h, 0, 0, w, h); }
      if (this.tintCache.size > 400) this.tintCache.clear();
      this.tintCache.set(key, c);
    }
    return c;
  }

  // ground decal: everything classified 'ground' drawn in world coordinates over the visible ground
  drawGround(items) {
    const m = this.gdMesh;
    if (!items.length) { m.visible = false; return; }
    const pts = [this.groundAt(0, 0), this.groundAt(this.W, 0), this.groundAt(0, this.H), this.groundAt(this.W, this.H)];
    const x0 = Math.max(-300, Math.min(...pts.map(p => p.x)) - 40), x1 = Math.min(WORLD_W + 300, Math.max(...pts.map(p => p.x)) + 40);
    const z0 = Math.max(-500, Math.min(...pts.map(p => p.y)) - 40), z1 = Math.min(WORLD_H + 400, Math.max(...pts.map(p => p.y)) + 40);
    const k = Math.min(GD_W / Math.max(1, x1 - x0), GD_H / Math.max(1, z1 - z0)), ctx = this.gdCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, GD_W, GD_H);
    for (const o of items) {
      if (o.alpha <= 0.002) continue;
      ctx.setTransform(k, 0, 0, k, -x0 * k, -z0 * k);
      ctx.globalAlpha = o.alpha; ctx.globalCompositeOperation = o.blendMode === 1 ? 'lighter' : 'source-over';
      ctx.translate(o.x, o.y); if (o.rotation) ctx.rotate(o.rotation);
      if (o.type === 'Graphics') { ctx.scale(o.scaleX, o.scaleY); replayGraphics(ctx, o.commandBuffer); continue; }
      ctx.scale(o.scaleX * (o.flipX ? -1 : 1), o.scaleY * (o.flipY ? -1 : 1));
      const dx = -o.displayOriginX, dy = -o.displayOriginY, w = o.width, h = o.height;
      if (o.type === 'Ellipse' || o.type === 'Arc') {
        ctx.beginPath(); ctx.ellipse(dx + w / 2, dy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (o.isFilled) { ctx.fillStyle = rgba(o.fillColor, o.fillAlpha); ctx.fill(); }
        if (o.isStroked) { ctx.lineWidth = o.lineWidth; ctx.strokeStyle = rgba(o.strokeColor, o.strokeAlpha); ctx.stroke(); }
        continue;
      }
      const img = this.frameImage(o); if (!img) continue;
      if (o.type === 'TileSprite') {
        const pat = ctx.createPattern(img, 'repeat'), tsx = o.tileScaleX ?? o._tileScale?.x ?? 1, tsy = o.tileScaleY ?? o._tileScale?.y ?? 1;
        pat.setTransform(new DOMMatrix().translate(dx, dy).scale(tsx, tsy).translate(-(o.tilePositionX || 0), -(o.tilePositionY || 0)));
        ctx.fillStyle = pat; ctx.fillRect(dx, dy, w, h);
      } else ctx.drawImage(img, dx, dy, w, h);
    }
    this.gdTex.needsUpdate = true;
    const sw = GD_W / k, sh = GD_H / k;
    m.scale.set(sw, 1, sh); m.position.set(x0 + sw / 2, 1.2, z0 + sh / 2); m.visible = true;
  }

  destroy() {
    if (this.dead) return;
    this.dead = true; this.postRender(); this.vfx3d.dispose();
    this.w.events.off('prerender', this._pre); this.w.events.off('render', this._post);
    this.tintCache.clear();
    for (const u of this.units.values()) this.dropUnit(u);
    this.units.clear();
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => { m.map?.dispose(); m.dispose(); });
    });
    Object.values(this.ringMats).forEach(m => m.dispose());
    this.fogTex?.dispose(); this.detailTex?.dispose(); this.blobGeo.dispose(); this.blobMat.map?.dispose(); this.blobMat.dispose();
    this.rt?.dispose(); this.postMat?.dispose(); RAMP?.dispose(); OUTLINE?.dispose(); RAMP = null; OUTLINE = null; TEX = null;
    PH = null;   // placeholder geometries were disposed with the scene
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.canvas.remove();
    try { this.w.cameras.remove(this.ov); } catch (e) { /* scene already torn down */ }
  }
}
