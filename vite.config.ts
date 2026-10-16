import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Module Federation (Annex H, React). The shell is the host: it loads each portal when its route is opened, and it LENDS
 * the portals its HTTP client as `shell/apiClient`, so a portal never makes one of its own (which would send requests with
 * no token). Where the portals live is configuration of the shell and is written only here.
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      filename: 'remoteEntry.js',
      exposes: { './apiClient': './src/core/http/exposed.ts' },
      remotes: {
        catalogPortal: { type: 'module', name: 'catalogPortal', entry: 'http://localhost:4201/remoteEntry.js' },
        salesPortal: { type: 'module', name: 'salesPortal', entry: 'http://localhost:4202/remoteEntry.js' },
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
      },
      // A portal is downloaded when its route is opened. The default, `version-first`, downloads every remote at start to
      // compare versions, and one portal that is down leaves the whole application blank.
      shareStrategy: 'loaded-first',
    }),
  ],
  server: { port: 4200, strictPort: true },
  build: { target: 'esnext' },
});
