import { describe, expect, it } from 'vitest'
import { computeCart, validateCoupon } from '@/lib/pricing/computeCart'
import { toArsCents, RateUnavailableError } from '@/lib/pricing/convert'
import { buildPriceDisplay } from '@/lib/pricing/display'
import type { PricingContext, PricingVariant } from '@/lib/pricing/types'
import type { ShippingRate } from '@/lib/shipping/types'
import { roundUpToStep } from '@/lib/money'

const variant = (over: Partial<PricingVariant> = {}): PricingVariant => ({
  id: 1,
  productId: 10,
  productTitle: 'Remera',
  productSlug: 'remera',
  variantTitle: 'M',
  sku: 'REM-M',
  currency: 'ARS',
  unitPriceCents: 10_000_00,
  taxRate: 21,
  weightGrams: 300,
  lengthCm: 20,
  widthCm: 15,
  heightCm: 5,
  stock: 10,
  active: true,
  ...over,
})

const homeDelivery: ShippingRate = {
  id: 'rateTable:1',
  provider: 'rateTable',
  service: '1',
  carrier: 'Envío',
  label: 'Envío a domicilio',
  priceCents: 5_000_00,
  freeEligible: true,
  requiresAddress: true,
}

const ctx = (over: Partial<PricingContext> = {}): PricingContext => ({
  variants: new Map([['1', variant()]]),
  rate: { rate: 1200, source: 'dolarapi-oficial', fetchedAt: '2026-10-16T12:00:00Z' },
  settings: {
    transferDiscountPercent: 10,
    freeShippingThresholdCents: 50_000_00,
    priceRoundingStep: 10,
    installments: { enabled: true, count: 3, interestFree: true },
  },
  coupon: null,
  shippingRates: [homeDelivery],
  now: new Date('2026-10-16T12:00:00Z'),
  ...over,
})

describe('conversión USD → ARS', () => {
  it('multiplica por la cotización y redondea hacia arriba al paso', () => {
    // USD 19,99 × 1200 = 23.988 → paso 10 → 23.990
    expect(toArsCents(1999, 'USD', ctx().rate, 10)).toBe(23_990_00)
    expect(toArsCents(1999, 'USD', ctx().rate, 100)).toBe(24_000_00)
    expect(toArsCents(1999, 'USD', ctx().rate, 1)).toBe(23_988_00)
  })

  it('no toca precios en ARS', () => {
    expect(toArsCents(12_345_67, 'ARS', null, 100)).toBe(12_345_67)
  })

  it('falla si no hay cotización para un precio en USD', () => {
    expect(() => toArsCents(1000, 'USD', null, 10)).toThrow(RateUnavailableError)
  })

  it('roundUpToStep no redondea si ya es múltiplo', () => {
    expect(roundUpToStep(10_000_00, 10)).toBe(10_000_00)
  })
})

describe('computeCart', () => {
  it('calcula subtotal y unifica líneas repetidas', () => {
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }, { variantId: '1', qty: 2 }] }, ctx())
    expect(q.lines).toHaveLength(1)
    expect(q.lines[0].qty).toBe(3)
    expect(q.subtotalCents).toBe(30_000_00)
    expect(q.totalCents).toBe(30_000_00)
    expect(q.issues).toEqual([])
  })

  it('convierte productos en USD y guarda la cotización usada', () => {
    const variants = new Map([['1', variant({ currency: 'USD', unitPriceCents: 1999 })]])
    const q = computeCart({ lines: [{ variantId: 1, qty: 2 }] }, ctx({ variants }))
    expect(q.lines[0].unitPriceCents).toBe(23_990_00)
    expect(q.subtotalCents).toBe(47_980_00)
    expect(q.rateSnapshot?.rate).toBe(1200)
  })

  it('reporta rate_unavailable si falta cotización para USD', () => {
    const variants = new Map([['1', variant({ currency: 'USD', unitPriceCents: 1999 })]])
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }] }, ctx({ variants, rate: null }))
    expect(q.issues).toContainEqual({ type: 'rate_unavailable' })
    expect(q.lines).toHaveLength(0)
  })

  it('reporta stock insuficiente, inexistente e inactivo', () => {
    const variants = new Map([
      ['1', variant({ stock: 1 })],
      ['2', variant({ id: 2, active: false })],
    ])
    const q = computeCart(
      { lines: [{ variantId: 1, qty: 2 }, { variantId: 2, qty: 1 }, { variantId: 99, qty: 1 }] },
      ctx({ variants }),
    )
    expect(q.issues).toContainEqual({ type: 'insufficient_stock', variantId: '1', available: 1 })
    expect(q.issues).toContainEqual({ type: 'inactive', variantId: '2' })
    expect(q.issues).toContainEqual({ type: 'not_found', variantId: '99' })
  })

  it('ignora cantidades inválidas', () => {
    const q = computeCart({ lines: [{ variantId: 1, qty: 0 }, { variantId: 1, qty: -3 }, { variantId: 1, qty: NaN }] }, ctx())
    expect(q.lines).toHaveLength(0)
    expect(q.totalCents).toBe(0)
  })

  it('aplica cupón porcentual', () => {
    const coupon = { code: 'HOLA10', type: 'percent' as const, value: 10, minSubtotalCents: 0, usageCount: 0, active: true }
    const q = computeCart({ lines: [{ variantId: 1, qty: 2 }], couponCode: 'hola10' }, ctx({ coupon }))
    expect(q.couponDiscountCents).toBe(2_000_00)
    expect(q.totalCents).toBe(18_000_00)
    expect(q.coupon?.code).toBe('HOLA10')
  })

  it('un cupón fijo nunca supera el subtotal', () => {
    const coupon = { code: 'FIJO', type: 'fixed' as const, value: 999_999_00, minSubtotalCents: 0, usageCount: 0, active: true }
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }], couponCode: 'FIJO' }, ctx({ coupon }))
    expect(q.couponDiscountCents).toBe(10_000_00)
    expect(q.totalCents).toBe(0)
  })

  it('un cupón porcentual mal cargado (> 100 %) tampoco deja el total en negativo', () => {
    const coupon = { code: 'MAL', type: 'percent' as const, value: 150, minSubtotalCents: 0, usageCount: 0, active: true }
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }], couponCode: 'MAL' }, ctx({ coupon }))
    expect(q.couponDiscountCents).toBe(10_000_00)
    expect(q.totalCents).toBe(0)
  })

  it('cupón inválido no descuenta y deja el motivo', () => {
    const coupon = { code: 'VIEJO', type: 'percent' as const, value: 10, minSubtotalCents: 0, usageCount: 0, active: true, expiresAt: '2026-01-01T00:00:00Z' }
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }], couponCode: 'VIEJO' }, ctx({ coupon }))
    expect(q.couponDiscountCents).toBe(0)
    expect(q.issues).toContainEqual({ type: 'coupon_invalid', reason: 'El cupón está vencido' })
  })

  it('cobra envío debajo del umbral y lo bonifica desde el umbral (después del cupón)', () => {
    const below = computeCart({ lines: [{ variantId: 1, qty: 4 }], shippingRateId: 'rateTable:1' }, ctx())
    expect(below.shippingCents).toBe(5_000_00)
    expect(below.totalCents).toBe(45_000_00)
    expect(below.freeShippingRemainingCents).toBe(10_000_00)

    const atThreshold = computeCart({ lines: [{ variantId: 1, qty: 5 }], shippingRateId: 'rateTable:1' }, ctx())
    expect(atThreshold.shipping?.isFree).toBe(true)
    expect(atThreshold.shippingCents).toBe(0)

    // Con cupón del 10% el subtotal neto queda en 45.000 < 50.000 → se cobra envío.
    const coupon = { code: 'X', type: 'percent' as const, value: 10, minSubtotalCents: 0, usageCount: 0, active: true }
    const withCoupon = computeCart({ lines: [{ variantId: 1, qty: 5 }], shippingRateId: 'rateTable:1', couponCode: 'X' }, ctx({ coupon }))
    expect(withCoupon.shippingCents).toBe(5_000_00)
  })

  it('no bonifica tarifas que no son freeEligible', () => {
    const rate = { ...homeDelivery, freeEligible: false }
    const q = computeCart({ lines: [{ variantId: 1, qty: 10 }], shippingRateId: rate.id }, ctx({ shippingRates: [rate] }))
    expect(q.shippingCents).toBe(5_000_00)
  })

  it('marca envío no disponible si la tarifa elegida ya no existe', () => {
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }], shippingRateId: 'zipnova:x' }, ctx())
    expect(q.issues).toContainEqual({ type: 'shipping_unavailable' })
  })

  it('el descuento por transferencia aplica sobre productos, no sobre el envío', () => {
    const q = computeCart({ lines: [{ variantId: 1, qty: 2 }], shippingRateId: 'rateTable:1', paymentMethod: 'transfer' }, ctx())
    expect(q.transferDiscountCents).toBe(2_000_00)
    expect(q.totalCents).toBe(20_000_00 - 2_000_00 + 5_000_00)
  })

  it('informa el IVA contenido según la alícuota', () => {
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }] }, ctx())
    // 10.000 con IVA 21% incluido → IVA = 10.000 − 10.000/1,21 = 1.735,54
    expect(q.vatIncludedCents).toBe(1_735_54)
  })
})

describe('validateCoupon', () => {
  const now = new Date('2026-10-16T12:00:00Z')
  const base = { code: 'A', type: 'percent' as const, value: 10, minSubtotalCents: 1_000_00, usageCount: 0, active: true }
  it('valida existencia, estado, vigencia, límite y mínimo', () => {
    expect(validateCoupon(null, 'A', 0, now)).toBe('El cupón no existe')
    expect(validateCoupon({ ...base, active: false }, 'A', 5_000_00, now)).toBe('El cupón no está activo')
    expect(validateCoupon({ ...base, startsAt: '2026-12-01' }, 'A', 5_000_00, now)).toBe('El cupón todavía no está vigente')
    expect(validateCoupon({ ...base, usageLimit: 3, usageCount: 3 }, 'A', 5_000_00, now)).toBe('El cupón alcanzó su límite de usos')
    expect(validateCoupon(base, 'A', 500_00, now)).toBe('No alcanzás el monto mínimo del cupón')
    expect(validateCoupon(base, ' a ', 5_000_00, now)).toBeNull()
  })
})

describe('buildPriceDisplay', () => {
  const settings = ctx().settings
  it('arma precio, transferencia, cuotas sin interés y precio sin impuestos', () => {
    const d = buildPriceDisplay({ priceCents: 12_100_00, currency: 'ARS', taxRate: 21, rate: null, settings })!
    expect(d.priceCents).toBe(12_100_00)
    expect(d.transferPriceCents).toBe(10_890_00)
    expect(d.installments).toEqual({ count: 3, amountCents: 4_033_34, interestFree: true })
    expect(d.withoutNationalTaxesCents).toBe(10_000_00)
  })

  it('no publicita cuotas con interés', () => {
    const d = buildPriceDisplay({
      priceCents: 1000,
      currency: 'ARS',
      taxRate: 21,
      rate: null,
      settings: { ...settings, installments: { enabled: true, count: 6, interestFree: false } },
    })!
    expect(d.installments).toBeNull()
  })

  it('devuelve null para USD sin cotización', () => {
    expect(buildPriceDisplay({ priceCents: 1000, currency: 'USD', taxRate: 21, rate: null, settings })).toBeNull()
  })

  it('usa la misma conversión que el carrito', () => {
    const d = buildPriceDisplay({ priceCents: 1999, currency: 'USD', taxRate: 21, rate: ctx().rate, settings })!
    const q = computeCart({ lines: [{ variantId: 1, qty: 1 }] }, ctx({ variants: new Map([['1', variant({ currency: 'USD', unitPriceCents: 1999 })]]) }))
    expect(d.priceCents).toBe(q.lines[0].unitPriceCents)
    expect(d.originalUsdCents).toBe(1999)
  })
})
