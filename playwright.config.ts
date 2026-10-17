import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3100'

/** E2E contra el servidor de desarrollo con los datos del seed (pnpm seed). */
export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  use: {
    baseURL,
    locale: 'es-AR',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: true,
    url: baseURL,
    timeout: 180_000,
  },
})
