// Sandboxed preload (must be CommonJS): the launcher window only gets these four calls.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('launcher', {
  onState: (cb) => { ipcRenderer.on('state', (_e, s) => cb(s)); },
  ready: () => ipcRenderer.send('launcher:ready'),   // the UI is listening: start (or replay) the update
  retry: () => ipcRenderer.send('launcher:retry'),
  play: () => ipcRenderer.send('launcher:play'),
});
