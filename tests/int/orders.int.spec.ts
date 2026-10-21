import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { placeOrder } from '@/lib/orders/placeOrder'
import { releaseExpiredReservations } from '@/lib/orders/releaseExpired'
import { processPayment, type PaymentResponse } from '@/lib/payments/mercadopago/processPayment'

let payload: Payload
let variantId: number
let productId: number

const STOCK = 5

const checkoutInput = (over: Record<string, unknown> = {}) => ({
  lines: [{ variantId, qty: 1 }],
  contact: { email: 'comprador@test.com', firstName: 'Ana', lastName: 'García', phone: '1155555555', dni: '30111222' },
  shippingRateId: 'pickup:store',
  paymentMethod: 'transfer',
  acceptTerms: true,
  ...over,
})

const stockOf = async (id = variantId) => (await payload.findByID({ collection: 'variants', id, depth: 0 })).stock

const fakePayment = (orderId: number, over: Partial<PaymentResponse> = {}): PaymentResponse =>
  ({
    id: Math.floor(Math.random() * 1e9),
    status: 'approved',
    status_detail: 'accredited',
    external_reference: String(orderId),
    currency_id: 'ARS',
    transaction_amount: 0,
    date_last_updated: new Date().toISOString(),
    date_approved: new Date().toISOString(),
    payment_type_id: 'credit_card',
    payment_method_id: 'visa',
    installments: 3,
    transaction_details: { net_received_amount: 0 },
    ...over,
  }) as PaymentResponse

const wipe = async () => {
  for (const collection of ['payment-events', 'orders', 'variants', 'products', 'coupons'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } }, context: { skipEmails: true } })
  }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await wipe()
  await payload.updateGlobal({
    slug: 'store-settings',
    data: {
      storeName: 'Test',
      transferEnabled: true,
      transferDiscountPercent: 10,
      mercadoPagoEnabled: true,
      priceRoundingStep: 1,
      reservationTtlHoursTransfer: 48,
      adminNotificationEmails: [],
      // Los tests de concurrencia usan el mismo email: el límite se prueba aparte.
      maxPendingOrdersPerEmail: 1000,
      maxPendingOrdersPerIp: 1000,
    },
  })
  await payload.updateGlobal({ slug: 'shipping-settings', data: { pickup: { enabled: true, address: 'Local' }, rateTable: { enabled: false } } })
  await payload.updateGlobal({ slug: 'exchange-rate', data: { mode: 'manual', manualRate: 1000 } })
})

beforeEach(async () => {
  await payload.delete({ collection: 'payment-events', where: { id: { exists: true } } })
  await payload.delete({ collection: 'orders', where: { id: { exists: true } }, context: { skipEmails: true } })
  await payload.delete({ collection: 'variants', where: { id: { exists: true } } })
  await payload.delete({ collection: 'products', where: { id: { exists: true } } })
  await payload.delete({ collection: 'coupons', where: { id: { exists: true } } })
  const product = await payload.create({
    collection: 'products',
    data: { title: `Producto ${Date.now()}`, currency: 'USD', price: 10, taxRate: '21', weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10, _status: 'published' },
  })
  productId = product.id
  const { docs } = await payload.find({ collection: 'variants', where: { product: { equals: product.id } }, depth: 0 })
  variantId = docs[0].id
  await payload.update({ collection: 'variants', id: variantId, data: { stock: STOCK } })
})

afterAll(async () => {
  await wipe()
})

describe('placeOrder', () => {
  it('crea el pedido con precios recalculados, cotización congelada y stock reservado', async () => {
    const res = await placeOrder(payload, checkoutInput({ lines: [{ variantId, qty: 2 }] }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const { docs } = await payload.find({ collection: 'orders', where: { orderNumber: { equals: res.orderNumber } }, depth: 0 })
    const order = docs[0]
    // USD 10 × 1000 = $10.000 c/u; 2 u = $20.000; −10% transferencia = $18.000; retiro gratis.
    expect(order.totals?.subtotal).toBe(20000)
    expect(order.totals?.transferDiscount).toBe(2000)
    expect(order.totals?.total).toBe(18000)
    expect(order.exchangeRate?.rate).toBe(1000)
    expect(order.status).toBe('pending_payment')
    expect(order.accessToken).toBeTruthy()
    expect(order.orderNumber).toMatch(/^[A-Z]+-\d{6}$/)
    expect(await stockOf()).toBe(STOCK - 2)
  })

  it('no vende de más con checkouts concurrentes', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => placeOrder(payload, checkoutInput())))
    const ok = results.filter((r) => r.ok)
    expect(ok).toHaveLength(STOCK)
    expect(await stockOf()).toBe(0)
    const { totalDocs } = await payload.count({ collection: 'orders' })
    expect(totalDocs).toBe(STOCK)
  })

  it('rechaza si el total cambió respecto de lo que vio el comprador', async () => {
    const res = await placeOrder(payload, checkoutInput({ expectedTotalCents: 1 }))
    expect(res).toMatchObject({ ok: false, priceChanged: true })
    expect(await stockOf()).toBe(STOCK)
  })

  it('limita los pedidos impagos simultáneos por email y por IP', async () => {
    await payload.updateGlobal({ slug: 'store-settings', data: { maxPendingOrdersPerEmail: 2, maxPendingOrdersPerIp: 3 } })
    try {
      const ip = { clientIp: '203.0.113.7' }
      expect((await placeOrder(payload, checkoutInput(), null, ip)).ok).toBe(true)
      expect((await placeOrder(payload, checkoutInput(), null, ip)).ok).toBe(true)
      const third = await placeOrder(payload, checkoutInput(), null, ip)
      expect(third).toMatchObject({ ok: false })
      if (!third.ok) expect(third.error).toMatch(/pedidos esperando el pago/)

      // Otro email desde la misma conexión: entra uno más y después corta el límite por IP.
      const other = (n: number) => checkoutInput({ contact: { ...checkoutInput().contact, email: `otro${n}@test.com` } })
      expect((await placeOrder(payload, other(1), null, ip)).ok).toBe(true)
      expect(await placeOrder(payload, other(2), null, ip)).toMatchObject({ ok: false })

      // Un pedido pagado o con la reserva vencida ya no cuenta.
      const { docs } = await payload.find({ collection: 'orders', where: { email: { equals: 'comprador@test.com' } }, limit: 1 })
      await payload.update({ collection: 'orders', id: docs[0].id, data: { status: 'paid' }, context: { skipEmails: true } })
      expect((await placeOrder(payload, checkoutInput(), null, { clientIp: '198.51.100.1' })).ok).toBe(true)
      expect(await stockOf()).toBe(STOCK - 4)
    } finally {
      await payload.updateGlobal({ slug: 'store-settings', data: { maxPendingOrdersPerEmail: 1000, maxPendingOrdersPerIp: 1000 } })
    }
  })

  it('valida los datos del checkout', async () => {
    const res = await placeOrder(payload, checkoutInput({ acceptTerms: false, contact: { email: 'mal' } }))
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.fieldErrors?.['contact.email']).toBeDefined()
    expect(res.fieldErrors?.acceptTerms).toBeDefined()
  })

  it('respeta el límite de usos del cupón con pedidos concurrentes', async () => {
    await payload.create({ collection: 'coupons', data: { code: 'UNICO', type: 'percent', value: 50, usageLimit: 1, active: true } })
    const results = await Promise.all([
      placeOrder(payload, checkoutInput({ couponCode: 'unico' })),
      placeOrder(payload, checkoutInput({ couponCode: 'UNICO', contact: { ...checkoutInput().contact, email: 'otro@test.com' } })),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    const coupon = (await payload.find({ collection: 'coupons', where: { code: { equals: 'UNICO' } } })).docs[0]
    expect(coupon.usageCount).toBe(1)
    // El pedido rechazado no debe haber tomado stock.
    expect(await stockOf()).toBe(STOCK - 1)
  })
})

describe('ciclo de vida del pedido', () => {
  it('cancelar devuelve el stock y el uso del cupón una sola vez', async () => {
    await payload.create({ collection: 'coupons', data: { code: 'X10', type: 'percent', value: 10, active: true } })
    const res = await placeOrder(payload, checkoutInput({ lines: [{ variantId, qty: 3 }], couponCode: 'X10' }))
    if (!res.ok) throw new Error(res.error)
    const order = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: res.orderNumber } } })).docs[0]
    expect(await stockOf()).toBe(STOCK - 3)

    await payload.update({ collection: 'orders', id: order.id, data: { status: 'cancelled' }, context: { skipEmails: true } })
    expect(await stockOf()).toBe(STOCK)
    const coupon = (await payload.find({ collection: 'coupons', where: { code: { equals: 'X10' } } })).docs[0]
    expect(coupon.usageCount).toBe(0)

    // Un estado final no puede volver atrás desde el panel.
    await expect(payload.update({ collection: 'orders', id: order.id, data: { status: 'pending_payment' } })).rejects.toThrow()
    expect(await stockOf()).toBe(STOCK)
  })

  it('rechaza transiciones inválidas y registra el historial', async () => {
    const res = await placeOrder(payload, checkoutInput())
    if (!res.ok) throw new Error(res.error)
    const order = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: res.orderNumber } } })).docs[0]
    await expect(payload.update({ collection: 'orders', id: order.id, data: { status: 'shipped' } })).rejects.toThrow(/No se puede pasar/)
    const paid = await payload.update({ collection: 'orders', id: order.id, data: { status: 'paid' }, context: { skipEmails: true } })
    expect(paid.paidAt).toBeTruthy()
    expect(paid.statusHistory?.map((h) => h.to)).toEqual(['pending_payment', 'paid'])
  })

  it('el cron cancela reservas vencidas y repone stock', async () => {
    const res = await placeOrder(payload, checkoutInput({ lines: [{ variantId, qty: 2 }] }))
    if (!res.ok) throw new Error(res.error)
    const order = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: res.orderNumber } } })).docs[0]
    await payload.update({ collection: 'orders', id: order.id, data: { reservationExpiresAt: new Date(Date.now() - 60_000).toISOString() } })

    const summary = await releaseExpiredReservations(payload)
    expect(summary).toMatchObject({ checked: 1, cancelled: 1, errors: 0 })
    expect((await payload.findByID({ collection: 'orders', id: order.id })).status).toBe('cancelled')
    expect(await stockOf()).toBe(STOCK)

    // Una segunda corrida no hace nada.
    expect(await releaseExpiredReservations(payload)).toMatchObject({ checked: 0 })
  })
})

describe('procesamiento de pagos de Mercado Pago', () => {
  const mpOrder = async (qty = 1) => {
    const res = await placeOrder(payload, checkoutInput({ lines: [{ variantId, qty }], paymentMethod: 'transfer' }))
    if (!res.ok) throw new Error(res.error)
    const order = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: res.orderNumber } } })).docs[0]
    // Se simula un pedido de MP (la preferencia no se crea porque no hay credenciales en tests).
    return payload.update({ collection: 'orders', id: order.id, data: { paymentMethod: 'mercadopago' } as never, overrideAccess: true })
  }

  it('aprueba el pedido y es idempotente ante notificaciones repetidas', async () => {
    const order = await mpOrder()
    const payment = fakePayment(order.id, { transaction_amount: order.totals!.total! })

    expect(await processPayment(payload, String(payment.id), 'webhook', payment)).toMatchObject({ outcome: 'processed', orderStatus: 'paid' })
    expect(await processPayment(payload, String(payment.id), 'webhook', payment)).toEqual({ outcome: 'duplicate' })

    const updated = await payload.findByID({ collection: 'orders', id: order.id })
    expect(updated.status).toBe('paid')
    expect(updated.mp?.paymentId).toBe(String(payment.id))
    expect(updated.mp?.installments).toBe(3)
    expect(updated.needsReview).toBe('none')
    expect((await payload.count({ collection: 'payment-events' })).totalDocs).toBe(1)
  })

  it('si el monto cobrado no coincide, no confirma el pedido y lo marca para revisión', async () => {
    const order = await mpOrder()
    const payment = fakePayment(order.id, { transaction_amount: 1 })
    await processPayment(payload, String(payment.id), 'webhook', payment)
    const updated = await payload.findByID({ collection: 'orders', id: order.id })
    expect(updated.status).toBe('pending_payment')
    expect(updated.needsReview).toBe('amount_mismatch')
  })

  it('un rechazo deja el pedido pendiente para reintentar', async () => {
    const order = await mpOrder()
    const payment = fakePayment(order.id, { status: 'rejected', status_detail: 'cc_rejected_insufficient_amount', transaction_amount: order.totals!.total! })
    await processPayment(payload, String(payment.id), 'webhook', payment)
    const updated = await payload.findByID({ collection: 'orders', id: order.id })
    expect(updated.status).toBe('pending_payment')
    expect(updated.mp?.status).toBe('rejected')
  })

  it('pago tardío sobre pedido cancelado: re-reserva stock si hay', async () => {
    const order = await mpOrder(2)
    await payload.update({ collection: 'orders', id: order.id, data: { status: 'cancelled' }, context: { skipEmails: true } })
    expect(await stockOf()).toBe(STOCK)

    const payment = fakePayment(order.id, { transaction_amount: order.totals!.total! })
    await processPayment(payload, String(payment.id), 'webhook', payment)
    const updated = await payload.findByID({ collection: 'orders', id: order.id })
    expect(updated.status).toBe('paid')
    expect(updated.needsReview).toBe('none')
    expect(updated.stockReleased).toBe(false)
    expect(await stockOf()).toBe(STOCK - 2)
  })

  it('pago tardío sin stock: queda pagado y marcado como sobreventa', async () => {
    const order = await mpOrder(2)
    await payload.update({ collection: 'orders', id: order.id, data: { status: 'cancelled' }, context: { skipEmails: true } })
    await payload.update({ collection: 'variants', id: variantId, data: { stock: 0 } })

    const payment = fakePayment(order.id, { transaction_amount: order.totals!.total! })
    await processPayment(payload, String(payment.id), 'webhook', payment)
    const updated = await payload.findByID({ collection: 'orders', id: order.id })
    expect(updated.status).toBe('paid')
    expect(updated.needsReview).toBe('oversold')
    expect(await stockOf()).toBe(0)
  })

  it('un reembolso de MP pasa el pedido a reembolsado y repone stock si no se despachó', async () => {
    const order = await mpOrder(1)
    const approved = fakePayment(order.id, { transaction_amount: order.totals!.total! })
    await processPayment(payload, String(approved.id), 'webhook', approved)
    expect(await stockOf()).toBe(STOCK - 1)

    const refunded = { ...approved, status: 'refunded', date_last_updated: new Date(Date.now() + 1000).toISOString() } as PaymentResponse
    await processPayment(payload, String(refunded.id), 'webhook', refunded)
    expect((await payload.findByID({ collection: 'orders', id: order.id })).status).toBe('refunded')
    expect(await stockOf()).toBe(STOCK)
  })
})

describe('producto', () => {
  it('crea automáticamente la variante "Única" al crear un producto', async () => {
    const { docs } = await payload.find({ collection: 'variants', where: { product: { equals: productId } } })
    expect(docs).toHaveLength(1)
    expect(docs[0].label).toBe('Única')
  })
})
