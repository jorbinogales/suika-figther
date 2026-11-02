import Phaser from 'phaser';
import { Boot, Arena, R3D_ON } from './world.js';
import { Hud } from './hud.js';
import { Menu } from './menu.js';
import { Launcher } from './launcher.js';
import { watchVersion } from './version.js';
import { BOT } from './net.js';

if (!BOT) watchVersion();
// the 3D flag is read once at load: reload when it is added to / removed from the address of an open tab
window.addEventListener('hashchange', () => { if ((new URLSearchParams(location.hash.slice(1)).get('3d') === '1') !== R3D_ON) location.reload(); });
// phones / tablets: index.html shows a notice instead (window.__mobileBlocked)
// server host (?bot=): same scenes and simulation, but nothing is drawn or heard
if (BOT) window.__phaserGame = new Phaser.Game({ type: Phaser.HEADLESS, width: 1280, height: 720, audio: { noAudio: true }, scene: [Boot, Arena] });
else if (!window.__mobileBlocked) new Phaser.Game({
  type: Phaser.AUTO, width: '100%', height: '100%', pixelArt: true, backgroundColor: '#1b2a14', transparent: R3D_ON,   // 3D mode: the three.js canvas shows through
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [Boot, Launcher, Menu, Arena, Hud],
});
