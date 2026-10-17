import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Tests unitarios de lógica pura (sin DB ni Next): precios, envíos, firma de MP, estados.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
