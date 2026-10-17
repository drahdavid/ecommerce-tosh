import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Tests de integración: Payload + Postgres reales (base separada, ver vitest.setup.ts).
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
})
