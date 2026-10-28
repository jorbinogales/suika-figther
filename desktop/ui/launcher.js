// Renders the state pushed by the main process (see desktop/main.js).
const $ = (id) => document.getElementById(id);
const mb = (n) => (n / 1048576).toFixed(1);
const TITLES = { checking: 'BUSCANDO ACTUALIZACIONES', verifying: 'VERIFICANDO ARCHIVOS', downloading: 'DESCARGANDO', installing: 'INSTALANDO', ready: 'LISTO PARA JUGAR', offline: 'SIN CONEXIÓN', error: 'ERROR' };

window.launcher.onState((s) => {
  $('status').textContent = TITLES[s.phase] || s.phase.toUpperCase();
  const bar = document.querySelector('.bar');
  let pct = 0, detail = '';
  if (s.phase === 'downloading') {
    pct = s.bytes.total ? s.bytes.done / s.bytes.total * 100 : 0;
    detail = `Descargando ${Math.min(s.files.done + 1, s.files.total)} de ${s.files.total} archivos · ${mb(s.bytes.done)} / ${mb(s.bytes.total)} MB`;
  } else if (s.phase === 'verifying') {
    pct = s.files.total ? s.files.done / s.files.total * 100 : 0;
    detail = `Verificando ${s.files.done} de ${s.files.total} archivos`;
  } else if (s.phase === 'ready' || s.phase === 'offline') {
    pct = 100;
    detail = s.phase === 'offline' ? 'No se pudo comprobar si hay actualizaciones. Se usará la versión instalada (para jugar online hace falta conexión).' : s.updated ? 'Juego actualizado.' : 'El juego está al día.';
  } else if (s.phase === 'installing') { pct = 100; detail = 'Aplicando la actualización…'; }
  else if (s.phase === 'checking') detail = 'Conectando con ' + (s.server || '') + '…';
  bar.classList.toggle('busy', s.phase === 'checking' || s.phase === 'installing');
  $('fill').style.width = pct + '%';
  $('detail').textContent = detail || ' ';
  $('err').textContent = s.phase === 'error' ? s.error : '';
  $('play').disabled = !s.canPlay;
  $('retry').hidden = !(s.phase === 'error' || s.phase === 'offline');
  const inst = s.installed ? 'v' + String(s.installed).slice(-6) : 'no instalado';
  $('ver').textContent = `Juego: ${inst}${s.available && s.available !== s.installed ? ' → nueva v' + String(s.available).slice(-6) : ''} · Launcher ${s.appVersion || ''}`;
});
$('play').onclick = () => window.launcher.play();
$('retry').onclick = () => window.launcher.retry();
window.launcher.ready();
