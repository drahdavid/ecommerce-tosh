import type { Currency } from '@/lib/money'
import type { ShippingRate } from '@/lib/shipping/types'

export type RateSnapshot = {
  /** ARS por USD (venta), en unidades mayores. */
  rate: number
  source: 'dolarapi-oficial' | 'manual'
  /** ISO: cuándo se obtuvo/fijó la cotización. */
  fetchedAt: string
}

/** Datos de una variante necesarios para cotizar (ya resueltos desde la DB). */
export type PricingVariant = {
  id: number | string
  productId: number | string
  productTitle: string
  productSlug: string
  variantTitle: string
  sku: string
  currency: Currency
  /** Precio unitario en la moneda del producto, en centavos. */
  unitPriceCents: number
  taxRate: number
  weightGrams: number
  lengthCm: number
  widthCm: number
  heightCm: number
  stock: number
  active: boolean
  imageUrl?: string | null
}

export type PricingCoupon = {
  code: string
  type: 'percent' | 'fixed'
  /** Porcentaje (0-100) o monto fijo en centavos ARS. */
  value: number
  minSubtotalCents: number
  startsAt?: string | null
  expiresAt?: string | null
  usageLimit?: number | null
  usageCount: number
  active: boolean
}

export type PricingSettings = {
  transferDiscountPercent: number
  freeShippingThresholdCents: number | null
  priceRoundingStep: number
  installments: { enabled: boolean; count: number; interestFree: boolean }
}

export type PaymentMethod = 'mercadopago' | 'transfer'

export type CartLineInput = { variantId: number | string; qty: number }

export type CartInput = {
  lines: CartLineInput[]
  couponCode?: string | null
  shippingRateId?: string | null
  paymentMethod?: PaymentMethod | null
}

export type PricingContext = {
  variants: Map<string, PricingVariant>
  rate: RateSnapshot | null
  settings: PricingSettings
  coupon: PricingCoupon | null
  shippingRates: ShippingRate[]
  now: Date
}

export type QuoteIssue =
  | { type: 'not_found'; variantId: string }
  | { type: 'inactive'; variantId: string }
  | { type: 'insufficient_stock'; variantId: string; available: number }
  | { type: 'rate_unavailable' }
  | { type: 'coupon_invalid'; reason: string }
  | { type: 'shipping_unavailable' }

export type QuoteLine = {
  variantId: string
  productId: string
  productTitle: string
  productSlug: string
  variantTitle: string
  sku: string
  qty: number
  currencyOriginal: Currency
  unitPriceOriginalCents: number
  unitPriceCents: number
  lineTotalCents: number
  weightGrams: number
  taxRate: number
  stock: number
  imageUrl?: string | null
}

export type CartQuote = {
  lines: QuoteLine[]
  subtotalCents: number
  couponDiscountCents: number
  coupon: { code: string; type: 'percent' | 'fixed'; value: number } | null
  shipping: (ShippingRate & { finalPriceCents: number; isFree: boolean }) | null
  shippingCents: number
  transferDiscountCents: number
  totalCents: number
  /** IVA contenido en el total (informativo, Ley 27.743). */
  vatIncludedCents: number
  rateSnapshot: RateSnapshot | null
  issues: QuoteIssue[]
  /** Monto que falta para envío gratis, si aplica. */
  freeShippingRemainingCents: number | null
}
