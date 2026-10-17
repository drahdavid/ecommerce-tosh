'use server'

import { headers } from 'next/headers'
import { getCurrentCustomer } from '@/lib/data/auth'
import { getPayloadClient } from '@/lib/data/catalog'
import { issueMessage, placeOrder, type PlaceOrderResult } from '@/lib/orders/placeOrder'
import { quoteCart } from '@/lib/pricing/context'
import type { CartQuote, PaymentMethod } from '@/lib/pricing/types'
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

/** Cotización del carrito para la UI. Siempre calculada en el servidor. */
export async function quoteCartAction(req: QuoteRequest): Promise<QuoteResponse> {
  const payload = await getPayloadClient()
  const lines = (req.lines ?? []).slice(0, 50).map((l) => ({ variantId: String(l.variantId), qty: Math.max(1, Math.min(99, Math.floor(l.qty))) }))
  const dest =
    req.destination && /^\w{4,8}$/.test(req.destination.postalCode.trim()) && (PROVINCES as readonly string[]).includes(req.destination.province)
      ? { postalCode: req.destination.postalCode.trim(), province: req.destination.province }
      : null

  const { quote, shippingRates, settings } = await quoteCart(
    payload,
    { lines, couponCode: req.couponCode, shippingRateId: req.shippingRateId, paymentMethod: req.paymentMethod },
    dest,
    { withShipping: req.withShipping },
  )
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
  const payload = await getPayloadClient()
  const customer = await getCurrentCustomer()
  return placeOrder(payload, input, customer?.id, { clientIp: await clientIp() })
}

/** IP del comprador. En Vercel la primera de x-forwarded-for es la del cliente. */
const clientIp = async (): Promise<string | null> => {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}
