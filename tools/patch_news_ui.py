import pathlib, json
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new):
    assert old in s, old[:100]
    return s.replace(old, new, 1)

# ================= launcher.js
p = ROOT / 'src/launcher.js'; s = p.read_text(encoding='utf8')
s = rep(s, "import { CHAMPIONS, CLASSES, CLASS_TABS, classLabel, ABILITY_KEYS } from './data.js';", "import { CHAMPIONS, CLASSES, CLASS_TABS, classLabel, ABILITY_KEYS } from './data.js';\nimport { ITEM_BY_ID } from './items.js';")
a = s.index("function homeScreen() {"); b = s.index("function joinModal() {")
s = s[:a] + """// news: affected champions / items as icons with an arrow (up = buff, down = nerf, rework = changed); the written details are one click away
const ARROW = { up: ['▲', 'MEJORA'], down: ['▼', 'NERFEO'], rework: ['⟳', 'CAMBIO'] };
const changeChip = c => {
  const champ = c.k === 'champ', nm = champ ? CHAMPIONS[c.id]?.name : ITEM_BY_ID[c.id]?.name; if (!nm) return '';
  const d = ARROW[c.d] ? c.d : 'rework', img = champ ? `<div class="ci" style="${faceCss(c.id)}"></div>` : `<div class="ci"><img src="assets/items/${c.id}.png?v=${BUILD}" alt=""></div>`;
  return `<div class="chg ${d}" data-tip="${esc(`<b>${nm}</b> · ${ARROW[d][1]}${c.t ? '<br>' + esc(c.t) : ''}`)}">${img}<b class="ar">${ARROW[d][0]}</b></div>`;
};
const newsEntry = n => `<div class="nw"><div class="t"><h3>${esc(n.title)}</h3><span class="tag">${esc(n.tag || 'NOTICIA')}</span><span class="d">v${esc(n.version)} · ${esc(n.date)}</span></div>
  ${(n.changes || []).length ? `<div class="chgs">${n.changes.map(changeChip).join('')}</div>` : ''}
  <button class="ntg" data-a="ntoggle">Ver detalles ▾</button><ul hidden>${(n.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;

function homeScreen() {
  screen = 'home';
  // layout: the news box spans the full width (to the right edge) but stops above the action bar; "Unirse a partida" is always at the bottom left
  view.innerHTML = `<div class="scr">${header()}<div class="home">
    <div class="panel news"><h2>NOTICIAS Y ACTUALIZACIONES</h2><div class="list" id="news"><i style="color:var(--mut)">Cargando...</i></div></div>
    <div class="dock">
      <button class="btn big go" data-a="quick">Unirse a partida<small>Te une a una sala pública con hueco o crea una nueva.</small></button>
      <button class="btn big" data-a="create">Crear sala<small>Genera un código para invitar hasta ${MAXP} jugadores.</small></button>
      <button class="btn big" data-a="joinbox">Unirse a sala<small>Entra con el código que te pasó un amigo.</small></button>
      <button class="btn big ghost" data-a="practice">Práctica<small>Zona de entrenamiento sin conexión.</small></button>
      <div class="err"></div>
    </div></div></div>`;
  net.news().then(list => {
    const el = $('#news', view); if (!el) return;
    el.innerHTML = list.map(newsEntry).join('') || '<i>Sin noticias.</i>';
  }).catch(() => { const el = $('#news', view); if (el) el.innerHTML = '<i style="color:var(--rd)">No se pudieron cargar las noticias.</i>'; });
}

""" + s[b:]
s = rep(s, "  quick() { toast('Buscando partida...', true); send('quick_join'); },", "  ntoggle(t) { const ul = t.parentElement.querySelector('ul'); ul.hidden = !ul.hidden; t.textContent = ul.hidden ? 'Ver detalles ▾' : 'Ocultar detalles ▴'; },\n  quick() { toast('Buscando partida...', true); send('quick_join'); },")
p.write_text(s, encoding='utf8')

# ================= launcher.css
p = ROOT / 'src/launcher.css'; s = p.read_text(encoding='utf8')
a = s.index(".home{display:grid;"); b = s.index(".acts{display:flex;flex-direction:column;gap:14px}")
new = """.home{display:flex;flex-direction:column;gap:14px;flex:1;min-height:0}
.news{flex:1 1 auto;min-height:0;overflow:hidden;display:flex;flex-direction:column;width:100%}.news .list{overflow:auto;flex:1;padding-right:6px;display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px 22px;align-content:start}
.nw{border-left:3px solid var(--cy);padding:4px 0 4px 14px;margin:0}
.nw .t{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.nw h3{margin:0;font-size:19px;color:#fff;letter-spacing:.03em}
.tag{font:700 11px 'Orbitron';letter-spacing:.12em;padding:2px 8px;background:rgba(255,210,63,.15);border:1px solid var(--am);color:var(--am)}
.nw .d{color:var(--mut);font-size:13px;letter-spacing:.1em}
.chgs{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}
.chg{position:relative;width:46px;height:46px;background:#0a1020;border:2px solid var(--cy);cursor:help}.chg .ci{position:absolute;inset:0;background-size:cover;background-position:center;image-rendering:pixelated;display:flex;align-items:center;justify-content:center}.chg .ci img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
.chg .ar{position:absolute;right:-7px;bottom:-8px;min-width:20px;height:20px;line-height:20px;text-align:center;font:900 14px 'Orbitron',sans-serif;background:#060b16;border:2px solid;border-radius:3px;text-shadow:0 0 6px currentColor}
.chg.up{border-color:var(--gr)}.chg.up .ar{color:var(--gr)}.chg.down{border-color:var(--rd)}.chg.down .ar{color:var(--rd)}.chg.rework{border-color:var(--am)}.chg.rework .ar{color:var(--am)}
.ntg{background:none;border:none;color:var(--cy2);cursor:pointer;font:600 13px 'Rajdhani',sans-serif;letter-spacing:.06em;padding:4px 0;margin-top:4px;text-decoration:underline}.ntg:hover{color:#fff}
.nw ul{margin:4px 0 0;padding-left:18px;color:var(--tx);font-size:15px;line-height:1.35}.nw ul[hidden]{display:none}.nw li{margin:3px 0}
.dock{flex:none;display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;position:relative}.dock .btn.big{width:auto;flex:1 1 220px;max-width:340px;padding:14px 18px}.dock .btn.big.go{flex:1.3 1 280px}
.dock .err{position:absolute;left:0;bottom:calc(100% + 2px);margin:0;min-height:0}
"""
s = s[:a] + new + s[b:]
s = rep(s, "  .home{grid-template-columns:minmax(0,1.3fr) minmax(260px,1fr)}\n", "")
s = rep(s, "  .home,.lobby{display:flex;flex-direction:column;flex:none;min-height:auto;overflow:visible;gap:14px}", "  .home{flex:none;min-height:auto;overflow:visible}\n  .dock{position:sticky;bottom:0;z-index:4;background:linear-gradient(180deg,transparent,rgba(2,8,18,.95) 28%);padding-top:14px}\n  .lobby{display:flex;flex-direction:column;flex:none;min-height:auto;overflow:visible;gap:14px}")
s = rep(s, ".panel.scroll,.news,.news .list,.scroll{overflow:visible;max-height:none;flex:none}", ".panel.scroll,.news,.news .list,.scroll{overflow:visible;max-height:none;flex:none}.news .list{display:block}.nw{margin-bottom:16px}")
p.write_text(s, encoding='utf8')

# ================= news.json: structured changes (icons + arrows)
n = ROOT / 'server/data/news.json'; raw = n.read_text(encoding='utf8'); d = json.loads(raw)
CH = {
 '0.9.21': [dict(k='item', id='nucleo_ia', d='up', t='El escudo de su pasiva escala con el poder de IA'), dict(k='item', id='memoria_ram', d='up', t='Versión menor del Núcleo de IA')],
 '0.9.20': [dict(k='champ', id='leandro', d='down', t='Lanzamiento de contrato: el veneno es ahora la mitad del impacto'), dict(k='champ', id='leandro', d='up', t='IA voy: los bots escalan en vida y daño con tu poder de IA')],
 '0.9.19': [dict(k='item', id='tarjeta_grafica', d='rework', t='Nueva pasiva: tus ataques y habilidades dejan quemaduras'), dict(k='item', id='pantalla_holo', d='rework', t='Versión menor de la Tarjeta gráfica')],
 '0.9.15': [dict(k='champ', id='junior', d='down', t='Ancla de abordaje: solo aturde si choca con una pared')],
 '0.9.9':  [dict(k='champ', id=k, d='rework', t='Nuevo combo de ataques básicos') for k in ['leandro', 'xeviche', 'jorbi', 'axel', 'julio', 'luis', 'eliud', 'hector', 'yonaiker', 'junior']],
 '0.9.0':  [dict(k='champ', id='xeviche', d='rework', t='Rediseño y nuevo kit'), dict(k='champ', id='yonaiker', d='rework', t='Rediseño y nuevo kit'), dict(k='champ', id='junior', d='rework', t='Ajustes'), dict(k='champ', id='hector', d='rework', t='Ajustes')],
}
for e in d:
    if e['id'] in CH: e['changes'] = CH[e['id']]
n.write_text(json.dumps(d, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''), encoding='utf8')
print('patched')
