import { defineConfig } from 'vite';

// every build gets an id; the server publishes it (dist/version.json) and the client forces a reload when it differs from the one it was built with
const BUILD_ID = process.env.BUILD_ID || String(Date.now());
const versionFile = () => ({ name: 'version-file', apply: 'build', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) }); } });

export default defineConfig(({ command }) => ({
  define: { __BUILD_ID__: JSON.stringify(command === 'build' ? BUILD_ID : 'dev') },
  plugins: [versionFile()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
}));
