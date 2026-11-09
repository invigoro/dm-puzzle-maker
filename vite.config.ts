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
    // A maker's test types and clicks a good deal, and makes slow fingerprints, which a slow machine,
    // such as CI's, can take more than the usual five seconds over.
    testTimeout: 15_000,
  },
});
