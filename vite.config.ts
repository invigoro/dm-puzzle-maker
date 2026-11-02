/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the same build works at daedalus.invigoro.me, at
  // invigoro.github.io/dm-puzzle-maker/, or under `vite preview`.
  base: './',
  plugins: [react()],
  test: {
    // The kit and the engines are plain TypeScript. Page tests opt into a DOM with
    // `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
