import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 4200, strictPort: true },
  build: { target: 'es2022' },
});
