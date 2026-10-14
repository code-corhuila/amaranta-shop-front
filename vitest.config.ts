import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Tests do not load Module Federation: they exercise the code, not the loading of remotes (vite.config.ts).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
