import { percentOf } from '@/lib/money'
import { RateUnavailableError, toArsCents } from './convert'
import type {
  CartInput,
  CartQuote,
  PricingContext,
  PricingCoupon,
  QuoteIssue,
  QuoteLine,
} from './types'

/**
 * Fuente única de verdad para precios. Función pura: no toca la DB.
 * La usan el carrito, el checkout y `placeOrder` (que siempre recalcula del lado del servidor).
 *
 * Orden de aplicación:
 *  1. Precio unitario (USD → ARS con la cotización vigente y redondeo).
 *  2. Subtotal.
 *  3. Cupón (sobre el subtotal; un monto fijo nunca supera el subtotal).
 *  4. Envío (gratis si subtotal − cupón ≥ umbral y la tarifa es bonificable).
 *  5. Descuento por transferencia (sobre subtotal − cupón; no se aplica al envío).
 */
export const computeCart = (input: CartInput, ctx: PricingContext): CartQuote => {
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = []

  for (const { variantId, qty } of mergeLines(input.lines)) {
    const v = ctx.variants.get(String(variantId))
    if (!v) {
      issues.push({ type: 'not_found', variantId: String(variantId) })
      continue
    }
    if (!v.active) issues.push({ type: 'inactive', variantId: String(v.id) })
    if (v.stock < qty)
      issues.push({ type: 'insufficient_stock', variantId: String(v.id), available: v.stock })

    let unitPriceCents: number
    try {
      unitPriceCents = toArsCents(v.unitPriceCents, v.currency, ctx.rate, ctx.settings.priceRoundingStep)
    } catch (err) {
      if (!(err instanceof RateUnavailableError)) throw err
      if (!issues.some((i) => i.type === 'rate_unavailable')) issues.push({ type: 'rate_unavailable' })
      continue
    }

    lines.push({
      variantId: String(v.id),
      productId: String(v.productId),
      productTitle: v.productTitle,
      productSlug: v.productSlug,
      variantTitle: v.variantTitle,
      sku: v.sku,
      qty,
      currencyOriginal: v.currency,
      unitPriceOriginalCents: v.unitPriceCents,
      unitPriceCents,
      lineTotalCents: unitPriceCents * qty,
      weightGrams: v.weightGrams,
      taxRate: v.taxRate,
      stock: v.stock,
      imageUrl: v.imageUrl,
    })
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0)

  // Cupón
  let couponDiscountCents = 0
  let coupon: CartQuote['coupon'] = null
  if (input.couponCode) {
    const reason = validateCoupon(ctx.coupon, input.couponCode, subtotalCents, ctx.now)
    if (reason) {
      issues.push({ type: 'coupon_invalid', reason })
    } else if (ctx.coupon) {
      const c = ctx.coupon
      // Nunca más que el subtotal, ni siquiera con un porcentaje mal cargado (> 100).
      couponDiscountCents = Math.min(c.type === 'percent' ? percentOf(subtotalCents, c.value) : c.value, subtotalCents)
      coupon = { code: c.code, type: c.type, value: c.value }
    }
  }

  const afterCouponCents = subtotalCents - couponDiscountCents

  // Envío
  const threshold = ctx.settings.freeShippingThresholdCents
  const qualifiesFree = threshold != null && threshold > 0 && afterCouponCents >= threshold
  let shipping: CartQuote['shipping'] = null
  if (input.shippingRateId) {
    const rate = ctx.shippingRates.find((r) => r.id === input.shippingRateId)
    if (!rate) {
      issues.push({ type: 'shipping_unavailable' })
    } else {
      const isFree = rate.priceCents === 0 || (rate.freeEligible && qualifiesFree)
      shipping = { ...rate, isFree, finalPriceCents: isFree ? 0 : rate.priceCents }
    }
  }
  const shippingCents = shipping?.finalPriceCents ?? 0

  // Descuento por transferencia
  const transferDiscountCents =
    input.paymentMethod === 'transfer' && ctx.settings.transferDiscountPercent > 0
      ? percentOf(afterCouponCents, ctx.settings.transferDiscountPercent)
      : 0

  const totalCents = afterCouponCents - transferDiscountCents + shippingCents

  // IVA contenido, prorrateado por línea según su alícuota y los descuentos aplicados.
  const goodsFactor = subtotalCents > 0 ? (afterCouponCents - transferDiscountCents) / subtotalCents : 0
  const vatIncludedCents = Math.round(
    lines.reduce((sum, l) => sum + vatContained(l.lineTotalCents * goodsFactor, l.taxRate), 0),
  )

  return {
    lines,
    subtotalCents,
    couponDiscountCents,
    coupon,
    shipping,
    shippingCents,
    transferDiscountCents,
    totalCents,
    vatIncludedCents,
    rateSnapshot: lines.some((l) => l.currencyOriginal === 'USD') ? ctx.rate : null,
    issues,
    freeShippingRemainingCents:
      threshold != null && threshold > 0 ? Math.max(0, threshold - afterCouponCents) : null,
  }
}

/** IVA contenido en un precio final: precio − precio / (1 + alícuota). */
export const vatContained = (grossCents: number, taxRatePercent: number): number =>
  grossCents - grossCents / (1 + taxRatePercent / 100)

/** Devuelve el motivo por el que el cupón no aplica, o null si es válido. */
export const validateCoupon = (
  coupon: PricingCoupon | null,
  code: string,
  subtotalCents: number,
  now: Date,
): string | null => {
  if (!coupon || coupon.code.toUpperCase() !== code.trim().toUpperCase()) return 'El cupón no existe'
  if (!coupon.active) return 'El cupón no está activo'
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return 'El cupón todavía no está vigente'
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return 'El cupón está vencido'
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit)
    return 'El cupón alcanzó su límite de usos'
  if (subtotalCents < coupon.minSubtotalCents) return 'No alcanzás el monto mínimo del cupón'
  return null
}

/** Unifica líneas repetidas de la misma variante y descarta cantidades inválidas. */
const mergeLines = (lines: CartInput['lines']) => {
  const merged = new Map<string, number>()
  for (const l of lines) {
    const qty = Math.floor(Number(l.qty))
    if (!Number.isFinite(qty) || qty <= 0) continue
    const key = String(l.variantId)
    merged.set(key, (merged.get(key) ?? 0) + qty)
  }
  return [...merged].map(([variantId, qty]) => ({ variantId, qty }))
}
