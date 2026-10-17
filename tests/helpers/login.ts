import type { Page } from '@playwright/test'

export interface LoginOptions {
  page: Page
  user: { email: string; password: string }
}

/** Inicia sesión en el panel de administración (usa el baseURL de Playwright). */
export async function login({ page, user }: LoginOptions): Promise<void> {
  await page.goto('/admin/login')
  await page.fill('#field-email', user.email)
  await page.fill('#field-password', user.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/admin$/)
}
