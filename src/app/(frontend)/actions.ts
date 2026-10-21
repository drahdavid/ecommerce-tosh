'use server'

import { headers } from 'next/headers'
import { ipFromHeaders } from '@/lib/clientIp'
import { getCurrentCustomer } from '@/lib/data/auth'
import { getPayloadClient } from '@/lib/data/catalog'
import { issueMessage, placeOrder, type PlaceOrderResult } from '@/lib/orders/placeOrder'
import { quoteCart } from '@/lib/pricing/context'
import type { CartQuote, PaymentMethod } from '@/lib/pricing/types'
import { HOUR, MINUTE, rateLimit, rateLimitDistinct } from '@/lib/rateLimit'
import type { ShippingRate } from '@/lib/shipping/types'
import { PROVINCES } from '@/lib/shipping/types'

export type QuoteRequest = {
  lines: { variantId: string; qty: number }[]
  couponCode?: string | null
  shippingRateId?: string | null
  paymentMethod?: PaymentMethod | null
  destination?: { postalCode: string; province: string } | null
  withShipping?: boolean
}

export type QuoteResponse = {
  quote: CartQuote
  shippingRates: ShippingRate[]
  message: string | null
  paymentMethods: { mercadopago: boolean; transfer: boolean; transferDiscountPercent: number }
}

/** Códigos de cupón distintos que una IP puede probar por ventana (frena la fuerza bruta). */
const COUPON_TRIES = { limit: 20, windowMs: 10 * MINUTE }

/** Intentos de compra por IP (además del límite de pedidos impagos por email/IP de placeOrder). */
const CHECKOUT_TRIES = { limit: 10, windowMs: HOUR }

const clientIp = async () => ipFromHeaders(await headers())

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Cotización del carrito para la UI. Siempre calculada en el servidor. */
export async function quoteCartAction(req: QuoteRequest): Promise<QuoteResponse> {
  const payload = await getPayloadClient()
  // Es un endpoint público: no se confía en los tipos que declara el cliente.
  const lines = (Array.isArray(req.lines) ? req.lines : [])
    .slice(0, 50)
    .map((l) => ({ variantId: String(l?.variantId), qty: Math.max(1, Math.min(99, Math.floor(Number(l?.qty)) || 1)) }))
  const postalCode = str(req.destination?.postalCode, 8)
  const province = String(req.destination?.province ?? '')
  const dest = /^\w{4,8}$/.test(postalCode) && (PROVINCES as readonly string[]).includes(province) ? { postalCode, province } : null

  let couponCode = str(req.couponCode, 40).toUpperCase() || null
  const couponBlocked = Boolean(couponCode) && !rateLimitDistinct(`coupons:${(await clientIp()) ?? 'unknown'}`, couponCode!, COUPON_TRIES.limit, COUPON_TRIES.windowMs)
  if (couponBlocked) couponCode = null

  const { quote, shippingRates, settings } = await quoteCart(
    payload,
    {
      lines,
      couponCode,
      shippingRateId: typeof req.shippingRateId === 'string' ? req.shippingRateId : null,
      paymentMethod: req.paymentMethod === 'mercadopago' || req.paymentMethod === 'transfer' ? req.paymentMethod : null,
    },
    dest,
    { withShipping: req.withShipping !== false },
  )
  if (couponBlocked) quote.issues.push({ type: 'coupon_invalid', reason: 'Probaste demasiados cupones. Esperá unos minutos' })
  return {
    quote,
    shippingRates,
    message: issueMessage(quote),
    paymentMethods: {
      mercadopago: Boolean(settings.mercadoPagoEnabled),
      transfer: Boolean(settings.transferEnabled),
      transferDiscountPercent: settings.transferEnabled ? (settings.transferDiscountPercent ?? 0) : 0,
    },
  }
}

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const ip = await clientIp()
  if (ip && !rateLimit(`checkout:${ip}`, CHECKOUT_TRIES.limit, CHECKOUT_TRIES.windowMs)) {
    return { ok: false, error: 'Hiciste demasiados intentos de compra. Probá de nuevo en un rato o escribinos por WhatsApp.' }
  }
  const payload = await getPayloadClient()
  const customer = await getCurrentCustomer()
  return placeOrder(payload, input, customer?.id, { clientIp: ip })
}
