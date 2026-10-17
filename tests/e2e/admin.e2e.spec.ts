import { expect, test, type Page } from '@playwright/test'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

test.describe('Panel de administración', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    page = await browser.newPage({ baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100' })
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('muestra las colecciones de la tienda', async () => {
    await page.goto('/admin')
    for (const name of ['Productos', 'Pedidos', 'Cupones', 'Zonas de envío']) {
      await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible()
    }
  })

  test('lista productos y abre el alta con selector de moneda', async () => {
    await page.goto('/admin/collections/products')
    await expect(page.getByRole('heading', { name: 'Productos' }).first()).toBeVisible()
    await page.goto('/admin/collections/products/create')
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await page.getByRole('button', { name: 'Precio', exact: true }).click()
    await expect(page.getByText('Pesos (ARS)')).toBeVisible()
    await expect(page.getByRole('spinbutton', { name: /^Precio/ }).first()).toBeVisible()
  })

  test('muestra la cotización vigente del dólar', async () => {
    await page.goto('/admin/globals/exchange-rate')
    await expect(page.getByText('Cotización vigente (ARS por USD)')).toBeVisible()
  })
})
