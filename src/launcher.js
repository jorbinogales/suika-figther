import Phaser from 'phaser';
import './launcher.css';
import { net } from './net.js';
import { STAT_STYLE, statCss, scaleRows, rowStat, pct } from './stats.js';
import { CHAMPIONS, CLASSES, CLASS_TABS, classLabel, ABILITY_KEYS } from './data.js';
import { vol, saveVol } from './audio.js';
import { bootScreen } from './bootscreen.js';

// Launcher: login / register, news, room buttons, lobby with champion pick and the loading screen.
// It is plain HTML/CSS over the (idle) Phaser canvas; the Phaser scene only owns its lifetime.
const BUILD = typeof __BUILD_ID__ === 'undefined' ? Date.now() : __BUILD_ID__;   // new build -> icons are fetched again
const KEYS = Object.keys(CHAMPIONS), MAXP = 10, PER_TEAM = 5;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, el = document) => el.querySelector(sel);

/* ---------- sound (synthesised by tools/gen_menu_audio.py) ---------- */
const cache = {};
// navigation sounds: the same 24-bit set the training menu always used (ui_select / ui_confirm...) from assets/sfx; [file, volume]
const UI_SND = { ui_click: ['ui_select_0.wav', 0.9], ui_tab: ['ui_select_1.wav', 0.9], ui_confirm: ['ui_confirm_0.wav', 0.9], ui_back: ['ui_back_0.wav', 0.8], ui_error: ['ui_error_0.wav', 0.8],
  ui_open: ['ui_open_0.wav', 0.8], ui_start: ['levelup_0.wav', 0.9], ui_join: ['ui_confirm_0.wav', 0.8] };
const snd = n => { const u = UI_SND[n]; if (!u) return; try { const a = (cache[n] ||= new window.Audio(`assets/sfx/${u[0]}`)).cloneNode(); a.volume = Math.min(1, vol.sfx * u[1]); a.play().catch(() => {}); } catch (e) { /* ignore */ } };
let music = null, musicWanted = false;
const startMusic = () => {
  musicWanted = true;
  if (!music) { music = new window.Audio('assets/menu/music_launcher.wav'); music.loop = true; }
  music.volume = Math.min(1, vol.music); music.play().catch(() => {});   // blocked until the first click: retried on the first gesture
};
const stopMusic = () => { musicWanted = false; if (music) { let v = music.volume; const iv = setInterval(() => { v -= 0.06; if (v <= 0) { clearInterval(iv); music.pause(); } else music.volume = v; }, 60); } };

/* ---------- helpers ---------- */
const faceCss = k => `background-image:url(assets/concept/${k}_face.webp);background-size:cover;background-position:center`;
const face = k => `<div class="face" style="${k ? faceCss(k) : ''}"></div>`;
let root, view, scene, unsub, screen = null, chat = [], hoverAt = 0, picked = null, clsFilter = 'todos', locked = false, fxNext = false;

const toast = (msg, good) => { const e = $('.err', view); if (e) { e.textContent = msg; e.classList.toggle('ok', !!good); } if (!good) snd('ui_error'); };

/* ---------- screens ---------- */
function header() {
  return `<div class="hdr"><div class="logo">SUIKA <b>FIGTHER</b></div><div class="sp"></div>
    <div class="vol">${['music', 'sfx'].map(k => `<span>${k === 'music' ? 'MÚSICA' : 'EFECTOS'}</span><input type="range" min="0" max="100" value="${Math.round(vol[k] * 100)}" data-vol="${k}" style="--v:${Math.round(vol[k] * 100)}%"><b class="pc" id="pc-${k}">${Math.round(vol[k] * 100)}%</b>`).join('')}</div>
    <div class="chip"><span class="dot ${net.online ? 'on' : ''}" id="dot"></span>${esc(net.user?.name || '')}</div>
    <button class="btn sm ghost" data-a="logout">Salir</button></div>`;
}

function loginScreen(mode = 'login') {
  const again = screen === 'login'; screen = 'login';
  view.innerHTML = `<div class="scr ${again ? 'noanim' : ''}"><div class="center">
    <div class="logo">SUIKA <b>FIGTHER</b></div><div class="sub">LAUNCHER · ACCESO</div>
    <div class="panel"><div class="tabs"><button class="btn ${mode === 'login' ? 'on' : ''}" data-tab="login">Iniciar sesión</button><button class="btn ${mode === 'register' ? 'on' : ''}" data-tab="register">Registrarme</button></div>
    <form id="f" autocomplete="on">
      ${mode === 'register' ? '<label class="l">Nombre de jugador</label><input class="fld" name="name" maxlength="16" autocomplete="nickname">' : ''}
      <label class="l">Correo</label><input class="fld" name="email" type="email" autocomplete="email">
      <label class="l">Contraseña</label><input class="fld" name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}">
      <div class="err"></div>
      <button class="btn go" style="width:100%" type="submit">${mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
    </form>
    <button class="lnk" data-a="practice">Jugar sin conexión (práctica y entrenamiento)</button></div></div></div>`;
  $('[data-tab]', view).parentElement.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) loginScreen(t.dataset.tab); });
  $('#f', view).addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = $('button[type=submit]', view);
    if (!d.email || !d.password || (mode === 'register' && !d.name)) return toast('Completa todos los campos.');
    b.disabled = true; toast('Conectando...', true);
    try { await net.auth(mode, d); snd('ui_confirm'); route(); } catch (err) { toast(err.message); b.disabled = false; }
  });
}

function homeScreen() {
  screen = 'home';
  view.innerHTML = `<div class="scr">${header()}<div class="home">
    <div class="panel news"><h2>NOTICIAS Y ACTUALIZACIONES</h2><div class="list" id="news"><i style="color:var(--mut)">Cargando...</i></div></div>
    <div class="acts">
      <div class="panel"><h2>JUGAR</h2><div class="acts">
        <button class="btn big go" data-a="quick">Unirse a partida<small>Te une a una sala pública con hueco o crea una nueva.</small></button>
        <button class="btn big" data-a="create">Crear sala<small>Genera un código para invitar hasta ${MAXP} jugadores.</small></button>
        <button class="btn big" data-a="joinbox">Unirse a sala<small>Entra con el código que te pasó un amigo.</small></button>
      </div><div class="err"></div></div>
      <div class="panel"><h2>SIN CONEXIÓN</h2><button class="btn ghost" style="width:100%" data-a="practice">Práctica y zona de entrenamiento</button></div>
    </div></div></div>`;
  net.news().then(list => {
    const el = $('#news', view); if (!el) return;
    el.innerHTML = list.map(n => `<div class="nw"><div class="t"><h3>${esc(n.title)}</h3><span class="tag">${esc(n.tag || 'NOTICIA')}</span><span class="d">v${esc(n.version)} · ${esc(n.date)}</span></div><ul>${(n.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('') || '<i>Sin noticias.</i>';
  }).catch(() => { const el = $('#news', view); if (el) el.innerHTML = '<i style="color:var(--rd)">No se pudieron cargar las noticias.</i>'; });
}

function joinModal() {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel"><h2>UNIRSE A SALA</h2><label class="l">Código de sala</label><input class="fld codein" maxlength="6" id="code" autocomplete="off" placeholder="XXXXXX"><div class="err"></div><div class="row" style="margin-top:14px"><button class="btn ghost" data-m="x">Cancelar</button><button class="btn go" data-m="ok">Entrar</button></div></div>`;
  view.appendChild(m); const inp = $('#code', m); inp.focus();
  const go = () => { const c = inp.value.trim().toUpperCase(); if (c.length !== 6) { $('.err', m).textContent = 'El código tiene 6 caracteres.'; return snd('ui_error'); } send('join_room', { code: c }); m.remove(); };
  m.addEventListener('click', e => { const b = e.target.closest('[data-m]')?.dataset.m; if (b === 'x') m.remove(); if (b === 'ok') go(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); if (e.key === 'Escape') m.remove(); });
}

function send(t, o) { if (!net.online) { toast('Sin conexión con el servidor. Reintentando...'); return false; } snd('ui_join'); net.send(t, o); return true; }

const champTabs = () => `<div class="ctabs">${CLASS_TABS.map(c => `<button class="ctab ${clsFilter === c ? 'on' : ''}" data-cls="${c}" title="${esc(classLabel(c))}"><img src="assets/classes/${c}.png" alt="" onerror="this.style.display='none'"><span>${esc(classLabel(c))}</span><i>${c === 'todos' ? KEYS.length : KEYS.filter(k => CHAMPIONS[k].cls === c).length}</i></button>`).join('')}</div>`;
const champGrid = (sel, taken = () => false) => `<div class="champs" id="champs">${KEYS.filter(k => clsFilter === 'todos' || CHAMPIONS[k].cls === clsFilter).map(k => `<div class="cc ${k === sel ? 'sel' : ''} ${taken(k) ? 'taken' : ''}" data-k="${k}"><div class="im" style="${faceCss(k)}"></div><div class="lb">${esc(CHAMPIONS[k].name)}</div></div>`).join('')}</div>`;
const lockedCard = (k, d) => { const fx = fxNext; fxNext = false; return `<div class="panel pick ${fx ? 'fx' : ''}"><div class="bg" style="background-image:url(assets/concept/${k}.webp)"></div><img class="sp" src="assets/concept/${k}.webp" alt=""><div class="ov"><div class="sn">${esc(d.name)}<small>${esc(CLASSES[d.cls]?.label || '')}</small></div>${abilityStrip(d)}<button class="btn ghost" data-a="unlock">Cambiar campeón</button></div>${fx ? '<div class="glt"></div>' : ''}</div>`; };
const splash = (k, d) => `<div class="splash" style="background-image:url(assets/concept/${k}.webp)"><div class="sn">${esc(d.name)}<small>${esc(CLASSES[d.cls]?.label || '')}</small></div></div>`;
const si = k => `<img class="si" src="assets/stats/${k}.png?v=${BUILD}" alt="">`;
const scaleHtml = (ab, st) => {   // [stat icon] (value at rank 1 -> rank 3) in the stat color + formula; uses the champion's level-1 stats
  const v = { ap: st.ap, atk: st.atk, maxHp: st.hp }, r1 = scaleRows(ab, 1, v), r3 = scaleRows(ab, 3, v);
  return r1.map((r, i) => { const s2 = rowStat(r), col = s2 ? statCss(s2) : '#cfe3ff', f = r.parts.length ? `${Math.round(r.base)} + ${r.parts.map(p => `${pct(p.k)} <span style="color:${statCss(p.stat)}">${si(p.stat)}${STAT_STYLE[p.stat].label}</span>`).join(' + ')}` : '';
    return `<div class="scl"><b>${r.label}</b> ${r.parts.map(p => si(p.stat)).join('')}<span style="color:${col};font-weight:700">(${Math.round(r.total)} → ${Math.round(r3[i].total)})</span>${f ? `<small>${f}</small>` : ''}</div>`; }).join('');
};
const abilityStrip = d => `<div class="abis">${ABILITY_KEYS.map((a, i) => { const ab = d.abilities[a], sc = scaleHtml(ab, d.stats); return `<div class="abi" data-tip="${esc(`<b>[${'QFER'[i]}] ${ab.name}${ab.passive ? ' · pasiva' : ''}</b><br>${ab.desc}${sc ? `<div class="scb"><em>Escala (nivel 1 → nivel 3 de la habilidad)</em>${sc}</div>` : ''}`)}"><img src="assets/icons/${esc(ab.icon)}.png?v=${BUILD}" alt=""><span>${'QFER'[i]}</span></div>`; }).join('')}</div>`;
const refresh = () => (screen === 'practice' ? practiceScreen() : lobbyScreen());

function lobbyScreen() {
  const r = net.room; if (!r) return homeScreen();
  const keep = { txt: $('#chatin', view)?.value || '', focus: document.activeElement?.id === 'chatin', sc: $('#champs', view)?.parentElement?.scrollTop || 0 };
  const first = screen !== 'lobby'; screen = 'lobby';
  const me = net.me, host = me?.host || r.host === net.user.id, pl = r.players || [];
  const sel = picked || me?.champ || KEYS[0], d = CHAMPIONS[sel], st = d.stats;
  const team = t => { const ps = pl.filter(p => p.team === t); let h = '';
    for (let i = 0; i < PER_TEAM; i++) { const p = ps[i]; h += p ? `<div class="pl ${p.id === net.user.id ? 'me' : ''}">${face(p.champ)}<div class="nm">${p.host ? '<span class="crown">♛</span> ' : ''}${esc(p.name)}<div class="ch">${p.champ ? esc(CHAMPIONS[p.champ]?.name || p.champ) : 'Sin campeón'}${p.connected === false ? ' · desconectado' : ''}</div></div><span class="rd ${p.ready ? 'on' : ''}">${p.ready ? 'LISTO' : 'ESPERA'}</span></div>` : '<div class="pl empty"><div class="face"></div><div class="nm ch">Libre</div></div>'; }
    return `<div class="team t${t}"><h4>${t === 0 ? 'EQUIPO AZUL · MILITARES' : 'EQUIPO ROJO · ROBOTS'} (${ps.length}/${PER_TEAM}) ${me && me.team !== t && ps.length < PER_TEAM ? `<button class="btn sm ghost" style="padding:3px 10px" data-a="team" data-t="${t}">Unirme</button>` : ''}</h4>${h}</div>`; };
  const allPicked = pl.length && pl.every(p => p.champ), allReady = pl.filter(p => !p.host).every(p => p.ready);
  view.innerHTML = `<div class="scr ${first ? '' : 'noanim'}" data-map="${prac.map}" data-scene="${mapOf(prac.map).scene ? 1 : ''}">${header()}<div class="lobby">
    <div class="col"><div class="panel"><h2>CÓDIGO DE SALA</h2><div class="code" data-a="copy" title="Clic para copiar">${esc(r.code)}</div><div style="text-align:center;color:var(--mut);font-size:14px;margin-top:4px">${pl.length}/${MAXP} jugadores · clic para copiar</div></div>
      <div class="panel scroll">${team(0)}${team(1)}</div></div>
    <div class="col">${locked ? lockedCard(sel, d) : `<div class="panel scroll"><h2>ELIGE TU CAMPEÓN</h2>
      ${champTabs()}
      ${champGrid(sel, k => pl.some(p => p.champ === k && p.id !== net.user.id))}
</div>
      <div class="panel info">${abilityStrip(d)}<button class="btn go" data-a="lock">Seleccionar</button></div>`}</div>
    <div class="col"><div class="panel chat"><h2>CHAT</h2><div class="log" id="log"></div><input class="fld" id="chatin" maxlength="200" placeholder="Escribe y pulsa Enter" autocomplete="off"></div>
      <div class="panel"><div class="row" style="margin-bottom:10px"><button class="btn ${me?.ready ? 'warn' : 'go'}" data-a="ready">${me?.ready ? 'Cancelar listo' : 'Estoy listo'}</button><button class="btn ghost" data-a="leave">Salir</button></div>
      ${host ? `<button class="btn go" style="width:100%" data-a="start" ${allPicked ? '' : 'disabled'}>Iniciar partida${allReady ? '' : ' (hay jugadores sin marcar listo)'}</button>` : '<div style="text-align:center;color:var(--mut)">Esperando a que el anfitrión inicie la partida...</div>'}
      <div class="err"></div></div></div></div></div>`;
  renderChat();
  const ci = $('#chatin', view); ci.value = keep.txt; if (keep.focus) ci.focus();
  ci.addEventListener('keydown', e => { if (e.key === 'Enter' && ci.value.trim()) { net.send('chat', { text: ci.value.trim() }); ci.value = ''; } });
  if (!first && $('#champs', view)) $('#champs', view).parentElement.scrollTop = keep.sc;
  if (me && !me.champ && !picked) { picked = KEYS.filter(k => !pl.some(p => p.champ === k))[0] || KEYS[0]; net.send('pick_champ', { key: picked }); }   // everyone always has a champion
  wireStage();
}


/* ---- champion stage (Fase 1): big animated champion + stats at max level, real game art only ---- */
let SPRITES = null, stageIv = null, stageF = 0;
fetch('assets/sprites/manifest.json').then(r => r.json()).then(j => { SPRITES = j.sprites || null; wireStage(); }).catch(() => {});
const stat12 = (d, k) => Math.round(d.stats[k] * (1 + (d.grow?.[k] || 0) * 11));   // the game's own growth formula at level 12
const STAT_ROWS = [['hp', 'VIDA', 'assets/stats/hp.png'], ['mana', 'MANÁ', 'assets/stats/mana.png'], ['atk', 'ATAQUE FÍSICO', 'assets/stats/atk.png'], ['ap', 'PODER IA', 'assets/stats/ap.png'], ['armor', 'ARMADURA', 'assets/stats/armor.png'], ['mr', 'RES. IA', 'assets/stats/mr.png'], ['speed', 'VELOCIDAD', 'assets/stats/speed.png'], ['range', 'RANGO', 'assets/aim/aim_ring.png']];
/* Escenarios: los PNG conceptuales mandan en el MENÚ (fondo ambiental + miniaturas).
   En partida manda el sistema de mapas del juego: nada de pegar la imagen como fondo jugable (eso es la Fase 3). */
/* Los archivos en public/assets/maps/ quedaron con nombres UUID (la descarga del chat los renombró);
   el contenido es el correcto, verificado por md5. Si se renombran a esc-*.webp, actualizar aquí. */
const MAPS = [
  { id: 'ruinas', name: 'Ruinas del Bosque Esmeralda', img: 'assets/maps/0fb27c0f-253c-423f-b36c-1416a0aad065.webp', thumb: 'assets/maps/aa0be35d-85b5-4c8e-974f-6568b33e9d42.webp', scene: 'assets/maps/escena-ruinas.webp' },
  { id: 'templo', name: 'Templo Ancestral', img: 'assets/maps/189846c2-616d-4511-b278-1fd8b5d37bb7.webp', thumb: 'assets/maps/f787857b-05d0-429d-bd62-d59da73876c0.webp', soon: true },
  { id: 'ciudad', name: 'Ciudad Neo-Suika', img: 'assets/maps/fb448626-7fd0-4d95-aa1a-483833d69070.webp', thumb: 'assets/maps/36219378-8c8c-4871-9e6b-aee620875d28.webp', soon: true },
];
const mapOf = id => MAPS.find(m => m.id === id) || MAPS[0];
/* Sombra de contacto del menú (PNG de Elis incrustado como data URI, 412 B): [ancho, centro] como fracción del cuadro del sprite,
   medidos del ancho real de los pies de cada campeón en su idle (span × 1.45 de margen suave). */
const SHADOW = { leandro: [.48, .512], xeviche: [.49, .510], jorbi: [.62, .496], axel: [.40, .502], julio: [.47, .514], luis: [.43, .508], eliud: [.42, .518], hector: [.60, .496] };
const sceneOf = m => m.scene || m.img;   // escena a nivel de suelo si el escenario la tiene; si no, su pintura cenital
const ambHtml = () => `<div class="amb"><img class="bg" src="${sceneOf(mapOf(prac.map))}" alt=""><div class="amb-shade"></div></div>`;
/* Flechas del selector: navegan solo entre los campeones del filtro activo; con 1 o 0 disponibles se desactivan. */
const navList = () => KEYS.filter(k => clsFilter === 'todos' || CHAMPIONS[k].cls === clsFilter);
const navHtml = () => { const dis = navList().length <= 1; return `<button class="st-nav prev" data-a="pnav" data-d="-1" title="Campeón anterior" aria-label="Campeón anterior" ${dis ? 'disabled' : ''}></button><button class="st-nav next" data-a="pnav" data-d="1" title="Campeón siguiente" aria-label="Campeón siguiente" ${dis ? 'disabled' : ''}></button>`; };
const stageHtml = (d, id, nav = false) => {
  const m = mapOf(prac.map);   // dirección artística nueva aplicada a los tres escenarios (aprobada la dirección en Ruinas)
  const open = !!m.scene;   // con escena a nivel de suelo, la tarima se abre: una sola imagen, la de pantalla completa, y el campeón se para en ella
  const rows = STAT_ROWS.map(([k, lb, src]) => {
    const val = k === 'mana' ? (d.rage ? 100 : d.stats.mana) : (k === 'hp' || k === 'atk' || k === 'ap') ? stat12(d, k) : d.stats[k];
    return `<div class="srow"><img src="${src}" alt="" onerror="this.style.visibility='hidden'"><span>${k === 'mana' && d.rage ? 'IRA' : lb}</span><b>${val}</b></div>`;
  }).join('');
  const champ = `<div class="cspr" id="cspr" data-id="${id}" style="background-image:url(assets/sprites/${id}/idle.png)"></div>`;
  return `<div class="stage art m-${m.id}${open ? ' open' : ''}">
    ${open ? '' : `<div class="st-scene" style="background-image:url(${sceneOf(m)})"></div><div class="st-shade"></div>`}
    <div class="cwrap"><img class="cshadow-img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAAAwCAYAAADZ9HK+AAABY0lEQVR4nO3a2U7CUBCA4UFxB6nQ93/CUqsg7suFM/Fk0lJjVzn/d/MT0ouG9AxwWhEAAAAAAAAAAHDIJkOfQJVlkp7qy0vXc9czrR1/op26HmsnrubT9V375vqqfdE+a59cd2HzIrPjR+Vo6BPAsHqfAMsktYtuob3WzrUz7ZXWT4ALra38sbBJ8KjduT5ot9qN9l57JyKSF9lHVydYhgkQuc4mQLDSb1wXrn4C2Eo/VDYRSidA0NuwXU0GJkDkWpsAwYpf2VvaugmAb3sngIjk2rVIexOBCRC5xhMg+L+ealeutvITrR2PcrZfUGhtAqxdM5Hm+wtMgMhN6w+pNa/ozJWV/zv2Odnn5nce/Q6kTYQ/YQJEjgsgclwAkWvjN4DtaPm7clV35/gtsJ99x29dNxVthAkQOXYCx4OdQPSPu4H9424gxoMngtrDE0H4f3gq+AdPBQMAAAAAAAAAAOCwfAEAHnooEzuXFgAAAABJRU5ErkJggg==" alt="" style="width:${Math.round((SHADOW[id]?.[0] ?? .48) * 100)}%;left:${((SHADOW[id]?.[1] ?? .51) * 100).toFixed(1)}%">${champ}${nav ? navHtml() : ''}</div>${!open && m.id === 'ruinas' ? '<img class="st-fg fg-tree" src="assets/map/forest/tree3.png" alt=""><img class="st-fg fg-bush" src="assets/map/forest/bush2.png" alt="">' : ''}<div class="st-fx"><i class="fx1"></i><i class="fx2"></i></div>${m.id === 'ruinas' ? '<div class="st-dust"><i></i><i></i><i></i><i></i><i></i><i></i></div>' : ''}
    <div class="st-pill">${esc(d.name.toUpperCase())}<span>Nv. 12</span></div>
    <div class="st-stats"><div class="st-head">${esc(CLASSES[d.cls]?.label || '')}</div>${rows}</div>
  </div>`;
};
function wireStage() {
  const el = view?.querySelector('#cspr'); if (!el) return;
  const n = SPRITES?.[el.dataset.id]?.idle || 4, h = el.clientHeight || 248;
  el.dataset.n = n; el.style.backgroundSize = `${h * n}px ${h}px`; el.style.backgroundPositionX = '0px'; stageF = 0;
  clearInterval(stageIv);
  stageIv = setInterval(() => {
    const e = view?.querySelector('#cspr');
    if (!e || e.dataset.id !== el.dataset.id) { clearInterval(stageIv); stageIv = null; return; }
    stageF = (stageF + 1) % (+e.dataset.n || n);
    e.style.backgroundPositionX = `${-stageF * (e.clientHeight || h)}px`;
  }, 230);
}
window.addEventListener('resize', () => wireStage());

// ---- practice & training: same champion select as the lobby ----
const prac = { mode: 1, me: 'leandro', team: 0, allies: [], enemies: [], map: 'ruinas' };
function pracFill(reroll = false) {   // keeps both teams the right size for the mode, filling new slots with random champions
  const pool = () => KEYS[Math.random() * KEYS.length | 0], make = (arr, n, avoid) => { const out = reroll ? [] : arr.slice(0, n); while (out.length < n) { const free = KEYS.filter(c => !avoid.includes(c) && !out.includes(c)); out.push(free.length ? free[Math.random() * free.length | 0] : pool()); } return out; };
  prac.allies = make(prac.allies, prac.mode - 1, [prac.me]); prac.enemies = make(prac.enemies, prac.mode, [prac.me, ...prac.allies]);
}
function practiceScreen() {
  const first = screen !== 'practice'; screen = 'practice'; pracFill();
  const d = CHAMPIONS[prac.me], keep = $('#champs', view)?.parentElement?.scrollTop || 0;
  const slots = (arr, g) => (arr.length ? arr.map((k, i) => `<div class="pl slot" data-a="pslot" data-g="${g}" data-i="${i}" title="Clic para cambiar de campeón">${face(k)}<div class="nm">${esc(CHAMPIONS[k].name)}<div class="ch">${esc(CLASSES[CHAMPIONS[k].cls]?.label || '')}</div></div></div>`).join('') : '<div class="pl empty"><div class="nm ch">Sin aliados en 1 vs 1</div></div>');
  const hdr = `<div class="hdr"><div class="logo">SUIKA <b>FIGTHER</b></div><div class="sp"></div><div class="vol">${['music', 'sfx'].map(k => `<span>${k === 'music' ? 'MÚSICA' : 'EFECTOS'}</span><input type="range" min="0" max="100" value="${Math.round(vol[k] * 100)}" data-vol="${k}" style="--v:${Math.round(vol[k] * 100)}%"><b class="pc" id="pc-${k}">${Math.round(vol[k] * 100)}%</b>`).join('')}</div><button class="btn sm ghost" data-a="pback">Volver</button></div>`;
  view.innerHTML = `<div class="scr ${first ? '' : 'noanim'} prac" data-map="${prac.map}" data-scene="${mapOf(prac.map).scene ? 1 : ''}">${ambHtml()}${hdr}<div class="lobby prac">
    <div class="col"><div class="panel"><h2>MODO DE JUEGO</h2><div class="row">${[1, 3, 5].map(m => `<button class="btn mbtn ${prac.mode === m ? 'on' : ''}" data-a="pmode" data-m="${m}">${m} vs ${m}</button>`).join('')}</div>
        <h2 style="margin-top:14px">TU BANDO</h2><div class="row"><button class="btn mbtn ${prac.team === 0 ? 'on' : ''}" data-a="pteam" data-t="0">AZUL</button><button class="btn mbtn red ${prac.team === 1 ? 'on' : ''}" data-a="pteam" data-t="1">ROJO</button></div>
        <button class="btn ghost" style="width:100%;margin-top:14px" data-a="prand">Equipos al azar</button></div>
      <div class="panel scroll"><div class="team t0"><h4>TUS ALIADOS (${prac.allies.length})</h4>${slots(prac.allies, 'allies')}</div><div class="team t1"><h4>EQUIPO ENEMIGO (${prac.enemies.length})</h4>${slots(prac.enemies, 'enemies')}</div></div></div>
    <div class="col">${locked ? lockedCard(prac.me, d) : `<div class="panel scroll"><h2>ELIGE TU CAMPEÓN</h2>
      ${champTabs()}
      ${champGrid(prac.me)}
</div>
      <div class="panel info">${abilityStrip(d)}<button class="btn go" data-a="lock">Seleccionar</button></div>`}</div>
    <div class="col"><div class="panel"><h2>JUGAR</h2><div class="acts">
        <button class="btn big go" data-a="pplay">Jugar partida<small>${prac.mode} vs ${prac.mode} contra la IA, con oleadas, torres y nexos.</small></button>
        <button class="btn big" data-a="ptrain">Zona de entrenamiento<small>Nivel 12, sin costo de maná y un muñeco para practicar.</small></button></div></div>
      <div class="panel"><h2>CONTROLES</h2><div style="font-size:15px;line-height:1.5;color:var(--tx)">WASD mover · Shift correr · clic o J atacar<br>Q F E R poderes (clic para lanzar) · Ctrl + tecla sube el poder<br>B tienda en la base · 1-6 usar objetos · Esc menú</div></div></div></div></div>`;
  if (!first && $('#champs', view)) $('#champs', view).parentElement.scrollTop = keep;
}
function practiceStart(training) {
  snd('ui_confirm'); stopMusic();
  scene.scene.start('arena', { training, mode: training ? 1 : prac.mode, player: prac.me, enemies: prac.enemies.slice(0, training ? 1 : 99), allies: training ? [] : prac.allies, team: prac.team, haveSprites: scene.registry.get('sprites') });
}

function renderChat() {
  const el = $('#log', view); if (!el) return;
  el.innerHTML = chat.slice(-60).map(c => c.sys ? `<i>${esc(c.text)}</i>` : `<div><b>${esc(c.name)}:</b> ${esc(c.text)}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}

/* ---------- loading screen + game start ---------- */
let loadEl = null;
function loading(players) {
  loadEl?.remove();
  loadEl = document.createElement('div'); loadEl.id = 'loading';
  const tm = t => `<div class="tm t${t}"><b>${t === 0 ? 'EQUIPO AZUL' : 'EQUIPO ROJO'}</b>${players.filter(p => p.team === t).map(p => `<div style="display:flex;gap:8px;align-items:center">${face(p.champ)}<span>${esc(p.name)} · ${esc(CHAMPIONS[p.champ]?.name || '')}</span></div>`).join('')}</div>`;
  loadEl.innerHTML = `<div class="logo">SUIKA <b>FIGTHER</b></div><div class="vs">${tm(0)}${tm(1)}</div><div class="bar"><i></i></div><div class="st"></div><div class="tip"></div>`;
  document.body.appendChild(loadEl);
  const TIPS = ['Las torres solo reciben daño de ataques básicos. Los súbditos sirven de escudo.', 'Vuelve a la base para curarte y comprar objetos (tecla B).', 'Mejora tus objetos con oro: gris, verde, azul, morado y rojo.', 'Ctrl + tecla de habilidad sube su rango.', 'Las definitivas se desbloquean en los niveles 4, 8 y 12.'];
  $('.tip', loadEl).textContent = 'CONSEJO: ' + TIPS[Math.random() * TIPS.length | 0];
  return (pct, text) => { if (!loadEl) return; $('.bar i', loadEl).style.width = pct + '%'; $('.st', loadEl).textContent = text; };
}
function hideLoading() { const e = loadEl; if (!e) return; loadEl = null; e.style.opacity = 0; setTimeout(() => e.remove(), 650); }

function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// canonical roster (identical on every client: same players, same seed): humans by id, then bots for the empty seats so both sides are even
function buildCfg(players, seed) {
  const rnd = rng(seed), H = t => players.filter(p => p.team === t).sort((a, b) => a.id - b.id), n = Math.max(H(0).length, H(1).length, 1), roster = [];
  for (const t of [0, 1]) {
    const used = []; H(t).forEach(p => { roster.push({ key: p.champ, team: t, pid: p.id }); used.push(p.champ); });
    for (let i = H(t).length; i < n; i++) { const l = KEYS.filter(c => !used.includes(c)), c = (l.length ? l : KEYS)[Math.floor(rnd() * (l.length || KEYS.length))]; used.push(c); roster.push({ key: c, team: t, pid: null }); }
  }
  const me = players.find(p => p.id === net.user.id) || players[0];
  return { roster, me: me.id, hostId: net.room?.host, team: me.team, player: me.champ, mode: n, haveSprites: scene.registry.get('sprites') };
}

function beginGame(m) {
  if (m.rejoin && net.user.id === m.host) { net.send('leave_room'); net.room = null; route(); return toast('Tu partida terminó al cerrar la página: el anfitrión no puede reconectarse.'); }   // the host's match lived in the page that closed
  const players = m.players || net.room?.players || [], prog = loading(players);
  prog(8, 'SINCRONIZANDO SALA...'); snd('ui_start'); stopMusic();
  let sent = false, done = false;
  const off = net.on(x => { if (x.t === 'go') { done = true; prog(100, '¡COMIENZA LA PARTIDA!'); setTimeout(hideLoading, 400); off(); } });
  setTimeout(() => { if (!done) { hideLoading(); off(); } }, 75000);   // safety net: never leave the player stuck
  const ready = () => { if (sent) return; sent = true; prog(88, 'ESPERANDO A LOS DEMÁS JUGADORES...'); net.send('loaded'); };
  scene.game.events.once('arena-ready', ready);
  setTimeout(() => prog(30, 'CARGANDO CAMPEONES, MAPA Y OBJETOS...'), 300);
  setTimeout(() => { prog(55, 'CONSTRUYENDO EL MAPA...'); scene.scene.start('arena', { ...buildCfg(players, m.seed ?? 1), rejoin: !!m.rejoin && m.state === 'playing' }); if (m.rejoin && m.state === 'playing') { done = true; setTimeout(hideLoading, 1800); off(); } }, 900);
}

/* ---------- routing & events ---------- */
function route() { picked = null; if (!net.user) loginScreen(); else if (net.room?.state === 'lobby' || net.room?.state === undefined && net.room) lobbyScreen(); else homeScreen(); }

function onNet(m) {
  if (!root) return;
  if (m.t === '_online' || m.t === '_offline') { $('#dot', view)?.classList.toggle('on', net.online); if (m.t === '_online' && screen === 'home') return; return; }
  if (m.t === 'room') { if (m.state === 'lobby' || !m.state) { if (screen !== 'lobby') { chat = [{ sys: 1, text: `Entraste a la sala ${m.code}.` }]; picked = null; } lobbyScreen(); } }
  else if (m.t === 'chat') { chat.push(m); renderChat(); }
  else if (m.t === 'error') toast(m.msg || 'Error');
  else if (m.t === 'start') beginGame(m);
  else if (m.t === 'left') { net.room = null; route(); }
}

const actions = {
  logout() { net.logout(); chat = []; loginScreen(); },
  practice() { snd('ui_confirm'); locked = false; practiceScreen(); },
  lock() { snd('ui_confirm'); locked = true; fxNext = true; refresh(); },
  unlock() { locked = false; refresh(); },
  pback() { snd('ui_back'); route(); },
  pmode(el) { prac.mode = +el.dataset.m; practiceScreen(); },
  pteam(el) { prac.team = +el.dataset.t; practiceScreen(); },
  prand() { pracFill(true); practiceScreen(); },
  pmap(el) { if (MAPS.find(m => m.id === el.dataset.map)?.soon) return; prac.map = el.dataset.map; snd('ui_tab'); practiceScreen(); },
  pnav(el) { const list = navList(); if (list.length <= 1) return; const i = list.indexOf(prac.me), d = +el.dataset.d || 1; prac.me = i < 0 ? (d > 0 ? list[0] : list[list.length - 1]) : list[(i + d + list.length) % list.length]; snd('ui_tab'); practiceScreen(); },
  pslot(el) { const arr = prac[el.dataset.g], i = +el.dataset.i; arr[i] = KEYS[(KEYS.indexOf(arr[i]) + 1) % KEYS.length]; practiceScreen(); },
  pplay() { practiceStart(false); },
  ptrain() { practiceStart(true); },
  quick() { toast('Buscando partida...', true); send('quick_join'); },
  create() { send('create_room', { public: false }); },
  joinbox() { snd('ui_open'); joinModal(); },
  copy() { try { navigator.clipboard.writeText(net.room.code); } catch (e) { /* ignore */ } toast('Código copiado.', true); },
  ready() { net.send('set_ready', { ready: !net.me?.ready }); },
  leave() { net.send('leave_room'); net.room = null; chat = []; snd('ui_back'); route(); },
  start() { net.send('start_game'); },
  team(el) { net.send('set_team', { team: +el.dataset.t }); },
};

export class Launcher extends Phaser.Scene {
  constructor() { super('launcher'); }
  create() {
    scene = this; this.cameras.main.setBackgroundColor('#050a14'); this.input.enabled = false;
    root = document.createElement('div'); root.id = 'ui';
    root.innerHTML = '<div class="grid"></div><div id="view"></div><div class="scan"></div><div class="vig"></div>';
    document.body.appendChild(root); view = $('#view', root);
    unsub = net.on(onNet);
    const tip = document.createElement('div'); tip.id = 'tip'; root.appendChild(tip);
    root.addEventListener('mousemove', e => { const t = e.target.closest?.('[data-tip]'); if (!t) { tip.style.display = 'none'; return; } tip.innerHTML = t.dataset.tip; tip.style.display = 'block'; const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 12, Math.max(12, e.clientX - r.width / 2)) + 'px'; tip.style.top = Math.max(12, e.clientY - r.height - 18) + 'px'; });
    root.addEventListener('mouseover', e => { if (e.target.closest('.btn:not(:disabled),.cc') && performance.now() - hoverAt > 90) { hoverAt = performance.now(); snd('ui_hover'); } });
    root.addEventListener('click', e => {
      if (musicWanted && music?.paused) music.play().catch(() => {});
      const t = e.target.closest('[data-a]'); if (t) { if (!['logout', 'leave', 'practice', 'quick', 'create', 'joinbox'].includes(t.dataset.a)) snd('ui_click'); actions[t.dataset.a]?.(t); return; }
      const ct = e.target.closest('[data-cls]'); if (ct) { clsFilter = ct.dataset.cls; snd('ui_tab'); refresh(); return; }
      const c = e.target.closest('.cc'); if (c && screen === 'practice') { prac.me = c.dataset.k; snd('ui_tab'); practiceScreen(); return; }
      if (c && net.room) { picked = c.dataset.k; snd('ui_tab'); net.send('pick_champ', { key: picked }); lobbyScreen(); }
      else if (e.target.closest('.btn') && !e.target.closest('[data-m],[data-tab]')) snd('ui_click');
    });
    root.addEventListener('input', e => { const k = e.target.dataset?.vol; if (!k) return; vol[k] = e.target.value / 100; saveVol(); e.target.style.setProperty('--v', e.target.value + '%'); const pc = $('#pc-' + k, root); if (pc) pc.textContent = e.target.value + '%'; if (k === 'music' && music) music.volume = Math.min(1, vol.music); });
    startMusic(); document.addEventListener('pointerdown', () => { if (musicWanted && music?.paused) music.play().catch(() => {}); }, { once: true });
    this.events.once('shutdown', () => { unsub?.(); root.remove(); root = null; stopMusic(); });
    net.restore().then(() => route());
    loginScreen();
    setTimeout(() => bootScreen.hide(), 350);   // the loading screen fades out once the launcher is on screen   // shown immediately; replaced by home/lobby when the saved session is valid
  }
}
