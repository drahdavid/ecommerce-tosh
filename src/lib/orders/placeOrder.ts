import { randomBytes } from 'node:crypto'
import type { Payload, Where } from 'payload'
import { z } from 'zod'
import type { Order } from '@/payload-types'
import { withTransaction } from '@/lib/db/transaction'
import { sendOrderEmails } from '@/lib/email/send'
import { fromCents } from '@/lib/money'
import { quoteCart } from '@/lib/pricing/context'
import type { CartQuote } from '@/lib/pricing/types'
import { createPreference } from '@/lib/payments/mercadopago/preference'
import { PROVINCES } from '@/lib/shipping/types'
import { assignOrderNumber, consumeCoupon, reserveStock } from './stock'

export const checkoutSchema = z
  .object({
    lines: z.array(z.object({ variantId: z.union([z.string(), z.number()]), qty: z.number().int().min(1).max(99) })).min(1, 'El carrito está vacío').max(50, 'El carrito tiene demasiados productos'),
    couponCode: z.string().trim().max(40).optional().nullable(),
    contact: z.object({
      email: z.email('Email inválido'),
      firstName: z.string().trim().min(1, 'Ingresá tu nombre').max(80),
      lastName: z.string().trim().min(1, 'Ingresá tu apellido').max(80),
      phone: z.string().trim().min(6, 'Ingresá un teléfono').max(30),
      dni: z.string().trim().regex(/^[\d.\-\s]{7,13}$/, 'DNI/CUIT inválido'),
    }),
    shippingRateId: z.string().min(1, 'Elegí un método de entrega'),
    address: z
      .object({
        street: z.string().trim().min(1, 'Ingresá la calle').max(120),
        number: z.string().trim().min(1, 'Ingresá la altura').max(20),
        floor: z.string().trim().max(30).optional().nullable(),
        city: z.string().trim().min(1, 'Ingresá la localidad').max(120),
        province: z.enum(PROVINCES, 'Elegí la provincia'),
        postalCode: z.string().trim().min(4, 'Código postal inválido').max(8),
        notes: z.string().trim().max(300).optional().nullable(),
      })
      .optional()
      .nullable(),
    paymentMethod: z.enum(['mercadopago', 'transfer']),
    /** Total que vio el comprador: si cambió (cotización, stock), se le pide confirmar. */
    expectedTotalCents: z.number().int().optional(),
    acceptTerms: z.literal(true, 'Tenés que aceptar los términos y condiciones'),
  })

export type CheckoutInput = z.infer<typeof checkoutSchema>

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; redirectUrl: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; quote?: CartQuote; priceChanged?: boolean }

export const issueMessage = (quote: CartQuote): string | null => {
  const issue = quote.issues[0]
  if (!issue) return null
  switch (issue.type) {
    case 'insufficient_stock': {
      const line = quote.lines.find((l) => l.variantId === issue.variantId)
      return issue.available > 0
        ? `Solo quedan ${issue.available} unidades de ${line?.productTitle ?? 'un producto'}.`
        : `${line?.productTitle ?? 'Un producto'} se quedó sin stock.`
    }
    case 'not_found':
    case 'inactive':
      return 'Uno de los productos ya no está disponible. Revisá tu carrito.'
    case 'rate_unavailable':
      return 'No pudimos obtener la cotización del dólar. Probá de nuevo en unos minutos.'
    case 'coupon_invalid':
      return issue.reason
    case 'shipping_unavailable':
      return 'El método de envío elegido ya no está disponible. Elegí otro.'
  }
}

/**
 * Crea el pedido de forma segura:
 *  1. Re-cotiza TODO en el servidor (precios, cotización, cupón, envío).
 *  2. En una transacción: descuenta stock (UPDATE condicional), consume el cupón y crea la orden.
 *  3. Si es Mercado Pago, crea la preferencia y devuelve el link de pago.
 * El stock queda reservado hasta `reservationExpiresAt`; el cron libera las reservas vencidas.
 */
/**
 * Cuenta pedidos impagos con la reserva de stock vigente del mismo email y de la misma IP.
 * Evita que alguien bloquee stock armando pedidos que nunca paga.
 */
export const pendingOrdersLimitError = async (
  payload: Payload,
  email: string,
  clientIp: string | null | undefined,
  limits: { perEmail: number; perIp: number },
): Promise<string | null> => {
  const active: Where[] = [{ status: { equals: 'pending_payment' } }, { reservationExpiresAt: { greater_than: new Date().toISOString() } }]
  const byEmail = await payload.count({ collection: 'orders', where: { and: [...active, { email: { equals: email } }] }, overrideAccess: true })
  if (byEmail.totalDocs >= limits.perEmail) {
    return 'Ya tenés pedidos esperando el pago. Completá el pago de alguno (está en el email que te enviamos) o esperá a que venza la reserva para hacer uno nuevo.'
  }
  if (clientIp) {
    const byIp = await payload.count({ collection: 'orders', where: { and: [...active, { clientIp: { equals: clientIp } }] }, overrideAccess: true })
    if (byIp.totalDocs >= limits.perIp) {
      return 'Hay demasiados pedidos sin pagar desde esta conexión. Completá alguno de los pagos pendientes o probá de nuevo en un rato.'
    }
  }
  return null
}

export const placeOrder = async (
  payload: Payload,
  raw: unknown,
  customerId?: number | string | null,
  meta: { clientIp?: string | null } = {},
): Promise<PlaceOrderResult> => {
  const parsed = checkoutSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join('.')] ??= issue.message
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos', fieldErrors }
  }
  const input = parsed.data
  const isPickup = input.shippingRateId.startsWith('pickup:')
  if (!isPickup && !input.address) return { ok: false, error: 'Completá la dirección de envío', fieldErrors: { address: 'Requerida' } }

  const destination = input.address ? { postalCode: input.address.postalCode, province: input.address.province, city: input.address.city } : null
  const { quote, settings } = await quoteCart(
    payload,
    { lines: input.lines, couponCode: input.couponCode, shippingRateId: input.shippingRateId, paymentMethod: input.paymentMethod },
    destination,
  )

  const problem = issueMessage(quote)
  if (problem) return { ok: false, error: problem, quote }
  if (!quote.shipping) return { ok: false, error: 'Elegí un método de entrega', quote }
  if (input.paymentMethod === 'mercadopago' && !settings.mercadoPagoEnabled) return { ok: false, error: 'Mercado Pago no está disponible' }
  if (input.paymentMethod === 'transfer' && !settings.transferEnabled) return { ok: false, error: 'La transferencia no está disponible' }
  if (input.expectedTotalCents != null && input.expectedTotalCents !== quote.totalCents) {
    return { ok: false, priceChanged: true, quote, error: 'El total se actualizó (cambió la cotización, el stock o el envío). Revisalo y confirmá de nuevo.' }
  }

  const limitError = await pendingOrdersLimitError(payload, input.contact.email.toLowerCase(), meta.clientIp, {
    perEmail: settings.maxPendingOrdersPerEmail ?? 2,
    perIp: settings.maxPendingOrdersPerIp ?? 5,
  })
  if (limitError) return { ok: false, error: limitError }

  // Límite de usos del cupón por email (no se puede resolver con un UPDATE condicional).
  if (quote.coupon) {
    const coupon = await payload.find({ collection: 'coupons', where: { code: { equals: quote.coupon.code } }, limit: 1, depth: 0, overrideAccess: true })
    const perCustomer = coupon.docs[0]?.perCustomerLimit
    if (perCustomer) {
      const used = await payload.count({
        collection: 'orders',
        where: {
          and: [
            { 'coupon.code': { equals: quote.coupon.code } },
            { email: { equals: input.contact.email.toLowerCase() } },
            { status: { not_equals: 'cancelled' } },
          ],
        },
        overrideAccess: true,
      })
      if (used.totalDocs >= perCustomer) return { ok: false, error: 'Ya usaste este cupón el máximo de veces permitido.', quote }
    }
  }

  const ttlMs =
    input.paymentMethod === 'mercadopago'
      ? (settings.reservationTtlMinutesMP ?? 30) * 60_000
      : (settings.reservationTtlHoursTransfer ?? 48) * 3_600_000

  let order: Order
  try {
    order = await withTransaction(payload, async (req) => {
      const ship = quote.shipping!
      const created = await payload.create({
        collection: 'orders',
        overrideAccess: true,
        req,
        data: {
          accessToken: randomBytes(24).toString('base64url'),
          status: 'pending_payment',
          paymentMethod: input.paymentMethod,
          customer: customerId ? Number(customerId) : undefined,
          clientIp: meta.clientIp ?? undefined,
          email: input.contact.email.toLowerCase(),
          firstName: input.contact.firstName,
          lastName: input.contact.lastName,
          phone: input.contact.phone,
          dni: input.contact.dni,
          items: quote.lines.map((l) => ({
            product: Number(l.productId),
            variant: Number(l.variantId),
            title: l.productTitle,
            variantTitle: l.variantTitle,
            sku: l.sku,
            qty: l.qty,
            currencyOriginal: l.currencyOriginal,
            unitPriceOriginal: fromCents(l.unitPriceOriginalCents),
            unitPrice: fromCents(l.unitPriceCents),
            lineTotal: fromCents(l.lineTotalCents),
            weightGrams: l.weightGrams,
          })),
          totals: {
            subtotal: fromCents(quote.subtotalCents),
            couponDiscount: fromCents(quote.couponDiscountCents),
            transferDiscount: fromCents(quote.transferDiscountCents),
            shipping: fromCents(quote.shippingCents),
            total: fromCents(quote.totalCents),
            vatIncluded: fromCents(quote.vatIncludedCents),
          },
          coupon: quote.coupon
            ? { code: quote.coupon.code, type: quote.coupon.type, value: quote.coupon.type === 'fixed' ? fromCents(quote.coupon.value) : quote.coupon.value }
            : undefined,
          exchangeRate: quote.rateSnapshot
            ? { rate: quote.rateSnapshot.rate, source: quote.rateSnapshot.source, fetchedAt: quote.rateSnapshot.fetchedAt }
            : undefined,
          shippingMethod: {
            rateId: ship.id,
            provider: ship.provider,
            service: ship.service,
            carrier: ship.carrier,
            label: ship.label,
            price: fromCents(ship.finalPriceCents),
          },
          shippingAddress: !isPickup && input.address ? { ...input.address } : undefined,
          reservationExpiresAt: new Date(Date.now() + ttlMs).toISOString(),
          statusHistory: [{ from: '', to: 'pending_payment', at: new Date().toISOString(), by: 'checkout' }],
        },
      })
      created.orderNumber = await assignOrderNumber(payload, req, created.id)

      // Los locks de fila (cupón y stock) se toman AL FINAL, justo antes del commit: así quien
      // los tiene no necesita más conexiones y los checkouts concurrentes esperan poco.
      // Orden fijo (cupón → variantes por id) para que no haya deadlocks.
      if (quote.coupon && !(await consumeCoupon(payload, req, quote.coupon.code))) {
        throw new CheckoutError('El cupón alcanzó su límite de usos.')
      }
      const reserved = await reserveStock(payload, req, quote.lines)
      if (!reserved.ok) throw new CheckoutError('Uno de los productos se quedó sin stock mientras comprabas. Revisá tu carrito.')
      return created
    })
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message }
    payload.logger.error({ err, msg: 'Error creando el pedido' })
    return { ok: false, error: 'No pudimos crear el pedido. Probá de nuevo.' }
  }

  if (input.paymentMethod === 'mercadopago') {
    try {
      const { preferenceId, initPoint } = await createPreference(order, settings)
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { mp: { preferenceId, initPoint } },
        overrideAccess: true,
      })
      // Sin email todavía: muchos compradores abandonan en MP. Los emails (cliente y admin)
      // salen cuando el pago se aprueba.
      return { ok: true, orderNumber: order.orderNumber!, redirectUrl: initPoint }
    } catch (err) {
      payload.logger.error({ err, msg: `No se pudo crear la preferencia de MP para ${order.orderNumber}` })
      // Se cancela para devolver el stock reservado.
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'cancelled' },
        overrideAccess: true,
        context: { actor: 'checkout', note: 'Falló la creación del pago en Mercado Pago', skipEmails: true },
      })
      return { ok: false, error: 'No pudimos conectar con Mercado Pago. Probá de nuevo o elegí transferencia.' }
    }
  }

  await sendOrderEmails(payload, order, 'created')
  return { ok: true, orderNumber: order.orderNumber!, redirectUrl: `/pedido/${order.orderNumber}?t=${order.accessToken}&nuevo=1` }
}

class CheckoutError extends Error {}
