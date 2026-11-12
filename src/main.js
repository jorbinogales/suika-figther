import Phaser from 'phaser';
import { Boot, Arena } from './world.js';
import { Hud } from './hud.js';
import { Menu } from './menu.js';
import { Launcher } from './launcher.js';
import { watchVersion } from './version.js';
import { BOT } from './net.js';

if (!BOT) watchVersion();
// service worker: the whole game (assets/**) is cached per build, so later visits load from disk; a new build = new cache (see public/sw.js, version.js)
window.__swReady = Promise.resolve();
if (!BOT && 'serviceWorker' in navigator && typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__ !== 'dev') {
  window.__swReady = new Promise(done => {
    const t = setTimeout(done, 3000), ok = () => { clearTimeout(t); done(); };
    navigator.serviceWorker.register('/sw.js?v=' + __BUILD_ID__).then(() => { if (navigator.serviceWorker.controller) ok(); else navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true }); }).catch(ok);
  });
}
// phones / tablets: index.html shows a notice instead (window.__mobileBlocked)
// server host (?bot=): same scenes and simulation, but nothing is drawn or heard
if (BOT) window.__phaserGame = new Phaser.Game({ type: Phaser.HEADLESS, width: 1280, height: 720, audio: { noAudio: true }, scene: [Boot, Arena] });
else if (!window.__mobileBlocked) new Phaser.Game({
  type: Phaser.AUTO, width: '100%', height: '100%', pixelArt: true, backgroundColor: '#1b2a14',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [Boot, Launcher, Menu, Arena, Hud],
});
