import { defineConfig } from 'vitest/config'
import path from 'path'

// Separate config for unit tests of pure utility modules.
// Does not load vite.config.ts (which uses @vitejs/plugin-react 6 / Vite 8,
// incompatible with the workspace-level Vitest 1.x runner).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
