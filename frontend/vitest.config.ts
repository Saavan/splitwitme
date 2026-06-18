import { defineConfig } from 'vitest/config'
import path from 'path'

// Standalone config for vitest 1.x (does not load vite.config.ts, which uses
// @vitejs/plugin-react 6 / Vite 8). JSX is handled via esbuild instead.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
