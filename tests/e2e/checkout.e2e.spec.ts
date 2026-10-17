import { expect, test } from '@playwright/test'
import { cancelE2eOrders } from '../helpers/cleanupOrders'

test.afterAll(async () => {
  await cancelE2eOrders()
})

/**
 * Flujo de compra completo con los datos del seed: producto con variantes → carrito con
 * cupón → checkout con retiro en local y transferencia → página del pedido.
 * (El pago con Mercado Pago se prueba en sandbox: ver README.)
 */
test('compra como invitado con transferencia y retiro en local', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.goto('/productos/remera-oversize-algodon')
  await expect(page.getByRole('heading', { name: 'Remera Oversize Algodón' })).toBeVisible()
  await expect(page.getByText(/cuotas sin interés de/)).toBeVisible()
  await expect(page.getByText(/Precio sin impuestos nacionales/)).toBeVisible()

  // XL / Negro no tiene stock en el seed: se muestra tachado y no se puede agregar.
  await page.getByRole('button', { name: 'XL', exact: true }).click()
  await page.getByRole('button', { name: 'Negro', exact: true }).click()
  await expect(page.getByText('Sin stock').first()).toBeVisible()

  await page.getByRole('button', { name: 'M', exact: true }).click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await expect(page.getByRole('button', { name: /Agregado/ })).toBeVisible()

  await page.goto('/carrito')
  await expect(page.getByRole('link', { name: 'Remera Oversize Algodón' })).toBeVisible()
  await expect(page.getByText('M / Negro')).toBeVisible()

  // Cupón inválido y después el válido (mínimo $20.000: la remera sale $24.900).
  await page.getByPlaceholder('Cupón de descuento').fill('NOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('El cupón no existe')).toBeVisible()
  await page.getByPlaceholder('Cupón de descuento').fill('BIENVENIDA10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupón BIENVENIDA10 aplicado.')).toBeVisible()

  await page.getByRole('link', { name: 'Iniciar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Finalizar compra' })).toBeVisible()

  const email = `e2e+${Date.now()}@test.com`
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel('Nombre', { exact: true }).fill('Lucía')
  await page.getByLabel('Apellido').fill('Pérez')
  await page.getByLabel('Teléfono').fill('1155554444')
  await page.getByLabel('DNI o CUIT').fill('30123456')

  // Con CP de CABA aparecen el retiro y el envío a domicilio de la zona CABA.
  await page.getByLabel('Código postal').fill('1425')
  await page.getByLabel('Provincia').selectOption('CABA')
  await expect(page.getByText(/Envío a domicilio — CABA/)).toBeVisible()
  await page.getByText(/^Retiro en local/).click()

  await page.getByText('Transferencia bancaria').click()
  await expect(page.getByText('Descuento por transferencia')).toBeVisible()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()

  await expect(page).toHaveURL(/\/pedido\/[A-Z]+-\d+\?t=/, { timeout: 30_000 })
  await expect(page.getByText('¡Recibimos tu pedido!')).toBeVisible()
  await expect(page.getByText('Datos para la transferencia')).toBeVisible()
  await expect(page.getByText('Pendiente de pago').first()).toBeVisible()
  // $24.900 − 10% cupón = $22.410 − 10% transferencia = $20.169
  await expect(page.getByText('$ 20.169').first()).toBeVisible()

  // El carrito quedó vacío.
  await page.goto('/carrito')
  await expect(page.getByText('Tu carrito está vacío.')).toBeVisible()
})

test('el pedido no es visible sin el token del link', async ({ page }) => {
  const res = await page.goto('/pedido/TOSH-001001')
  expect(res?.status()).toBe(404)
})

test('botón de arrepentimiento entrega un código', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Botón de arrepentimiento' }).click()
  await page.getByLabel('Número de pedido').fill('TOSH-001001')
  await page.getByLabel('Email usado en la compra').fill('alguien@test.com')
  await page.getByLabel('Nombre y apellido').fill('Alguien')
  await page.getByRole('button', { name: /Enviar solicitud/ }).click()
  await expect(page.getByText(/ARR-[0-9A-F]{8}/)).toBeVisible()
})
