// Full-screen loading screen shown while the game downloads its resources (Boot scene) and until the launcher is ready.
import './launcher.css';
let el = null, bar = null, st = null;
export const bootScreen = {
  show() {
    if (el) return;
    el = document.getElementById('loading');   // already in index.html so something shows while the scripts download
    if (!el) { el = document.createElement('div'); el.id = 'loading'; el.style.zIndex = 120; el.innerHTML = '<div class="logo">SUIKA <b>FIGTHER</b></div><div class="bar"><i></i></div><div class="st">CARGANDO...</div><div class="tip">Preparando campeones, mapa, objetos y sonidos</div>'; document.body.appendChild(el); }
    bar = el.querySelector('.bar i'); st = el.querySelector('.st');
  },
  progress(pct, text) { if (!el) return; bar.style.width = Math.max(2, Math.min(100, pct)) + '%'; if (text) st.textContent = text; },
  hide() { if (!el) return; const e = el; el = null; bar && (bar.style.width = '100%'); e.style.opacity = 0; setTimeout(() => e.remove(), 650); },
};
