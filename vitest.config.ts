import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Tests do not load Module Federation: they exercise the code, not the loading of remotes (vite.config.ts).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Vitest replaces every imported stylesheet with an empty string unless told to process it, and the design tests read the
    // CSS itself (src/styles/design.test.ts).
    css: { include: [/src\/styles\/.*\.css/] },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
