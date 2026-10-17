import type { Payload } from 'payload'
import type { Media, Product, StoreSetting, Variant } from '@/payload-types'
import { toCents } from '@/lib/money'
import { getEffectiveRate } from '@/lib/exchange-rate'
import { packCart } from '@/lib/shipping/packaging'
import { quoteShipping } from '@/lib/shipping/registry'
import type { Destination, ShippingRate } from '@/lib/shipping/types'
import { computeCart } from './computeCart'
import type { CartInput, CartQuote, PricingContext, PricingCoupon, PricingSettings, PricingVariant } from './types'

export const toPricingSettings = (s: StoreSetting): PricingSettings => ({
  transferDiscountPercent: s.transferEnabled ? (s.transferDiscountPercent ?? 0) : 0,
  freeShippingThresholdCents: s.freeShippingThreshold ? toCents(s.freeShippingThreshold) : null,
  priceRoundingStep: s.priceRoundingStep || 1,
  installments: {
    enabled: Boolean(s.installments?.enabled),
    count: s.installments?.count ?? 1,
    interestFree: Boolean(s.installments?.interestFree),
  },
})

export const mediaUrl = (m: number | Media | null | undefined, size: 'thumbnail' | 'card' | 'large' = 'card') =>
  m && typeof m === 'object' ? (m.sizes?.[size]?.url ?? m.url ?? null) : null

export const toPricingVariant = (v: Variant, p: Product): PricingVariant => ({
  id: v.id,
  productId: p.id,
  productTitle: p.title,
  productSlug: p.slug ?? '',
  variantTitle: v.label ?? 'Única',
  sku: v.sku,
  currency: p.currency,
  unitPriceCents: toCents(v.priceOverride ?? p.price),
  taxRate: Number(p.taxRate ?? 21),
  weightGrams: p.weightGrams ?? 500,
  lengthCm: p.lengthCm ?? 20,
  widthCm: p.widthCm ?? 15,
  heightCm: p.heightCm ?? 10,
  stock: v.stock ?? 0,
  active: Boolean(v.active) && p._status === 'published',
  imageUrl: mediaUrl(v.image) ?? mediaUrl(p.images?.[0]),
})

const loadVariants = async (payload: Payload, ids: (string | number)[]) => {
  const map = new Map<string, PricingVariant>()
  if (ids.length === 0) return map
  const { docs } = await payload.find({
    collection: 'variants',
    where: { id: { in: ids.map(Number).filter(Number.isFinite) } },
    depth: 2,
    limit: ids.length,
    overrideAccess: true,
  })
  for (const v of docs) {
    if (v.product && typeof v.product === 'object') map.set(String(v.id), toPricingVariant(v, v.product))
  }
  return map
}

const loadCoupon = async (payload: Payload, code?: string | null): Promise<PricingCoupon | null> => {
  if (!code?.trim()) return null
  const { docs } = await payload.find({
    collection: 'coupons',
    where: { code: { equals: code.trim().toUpperCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const c = docs[0]
  if (!c) return null
  return {
    code: c.code,
    type: c.type,
    value: c.type === 'fixed' ? toCents(c.value) : c.value,
    minSubtotalCents: toCents(c.minSubtotal ?? 0),
    startsAt: c.startsAt,
    expiresAt: c.expiresAt,
    usageLimit: c.usageLimit,
    usageCount: c.usageCount ?? 0,
    active: Boolean(c.active),
  }
}

export type FullQuote = { quote: CartQuote; shippingRates: ShippingRate[]; settings: StoreSetting }

/**
 * Cotiza un carrito completo desde la DB: variantes, cotización del dólar, cupón y envíos.
 * Es lo único que llama a `computeCart` en el servidor.
 */
export const quoteCart = async (
  payload: Payload,
  input: CartInput,
  destination: Destination | null,
  opts: { withShipping?: boolean } = {},
): Promise<FullQuote> => {
  const [variants, rate, settings, coupon] = await Promise.all([
    loadVariants(payload, input.lines.map((l) => l.variantId)),
    getEffectiveRate(payload, { refreshIfStale: true }),
    payload.findGlobal({ slug: 'store-settings', depth: 0, overrideAccess: true }),
    loadCoupon(payload, input.couponCode),
  ])

  const ctx: PricingContext = {
    variants,
    rate,
    settings: toPricingSettings(settings),
    coupon,
    shippingRates: [],
    now: new Date(),
  }

  // Primera pasada sin envío: da los totales por línea para el valor declarado del paquete.
  const base = computeCart({ ...input, shippingRateId: null }, ctx)
  let shippingRates: ShippingRate[] = []
  if (opts.withShipping !== false && base.lines.length > 0) {
    const packed = packCart(
      base.lines.map((l) => {
        const v = variants.get(l.variantId)!
        return { ...v, qty: l.qty, lineTotalCents: l.lineTotalCents }
      }),
    )
    shippingRates = await quoteShipping(payload, packed, destination)
  }

  const quote = computeCart(input, { ...ctx, shippingRates })
  return { quote, shippingRates, settings }
}
