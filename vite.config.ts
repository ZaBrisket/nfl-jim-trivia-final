import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

// Simple plugin to emit service worker to /dist/sw.js
function emitSW() {
  return {
    name: 'emit-sw',
    closeBundle() {
      const src = resolve(__dirname, 'src/service-worker.ts');
      const out = resolve(__dirname, 'dist/sw.js');
      const code = readFileSync(src, 'utf-8')
        .replace(/: any/g, '');
      mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
      writeFileSync(out, code);
    }
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), emitSW()],
  build: {
    sourcemap: false
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    testTimeout: 15000
  }
}));
