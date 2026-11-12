// Shared pieces of the champion videos (public/assets/champvideos/<key>.mp4) and the "VS" loading screen. A champion without a video keeps its splash art.
import { CHAMPIONS, CLASSES } from './data.js';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// looping muted video; it fades in only once it plays, and removes itself if the file is missing (the splash art underneath stays)
export const videoTag = (k, cls = 'cv') => `<video class="${cls}" src="assets/champvideos/loop/${k}.mp4" autoplay loop muted playsinline preload="auto" onplaying="this.classList.add('on')" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='assets/champvideos/${k}.mp4'}else this.remove()"></video>`;   // loop/ = forward + reversed (tools/make_pingpong.py): no cut when it repeats; falls back to the original, then to the splash art
// one card per champion: splash art + video on top, champion name and player name
const card = (p, t) => `<div class="vcard t${t}"><div class="vimg" style="background-image:url(assets/concept/${p.k}.webp)"></div>${videoTag(p.k, 'vvid')}<div class="vname"><b>${esc(CHAMPIONS[p.k]?.name || p.k)}</b><small>${esc(p.label || CLASSES[CHAMPIONS[p.k]?.cls]?.label || '')}</small></div></div>`;
// teams = { blue: [{ k, label }], red: [{ k, label }] }
export const vsHtml = ({ blue, red }) =>   // blue team on top, red below, VS between the two rows (card size follows the window, see launcher.css)
  `<div class="vsx"><div class="vteam tb"><h3>EQUIPO AZUL</h3><div class="vrow">${blue.map(p => card(p, 0)).join('')}</div></div><div class="vsmid"><span>VS</span></div><div class="vteam tr"><h3>EQUIPO ROJO</h3><div class="vrow">${red.map(p => card(p, 1)).join('')}</div></div></div>`;
