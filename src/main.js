import Phaser from 'phaser';
import { Boot, Arena } from './world.js';
import { Hud } from './hud.js';
import { Menu } from './menu.js';
import { Launcher } from './launcher.js';

new Phaser.Game({
  type: Phaser.AUTO, width: '100%', height: '100%', pixelArt: true, backgroundColor: '#1b2a14',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [Boot, Launcher, Menu, Arena, Hud],
});
