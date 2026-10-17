import { percentOf, type Currency } from '@/lib/money'
import { RateUnavailableError, toArsCents } from './convert'
import type { PricingSettings, RateSnapshot } from './types'

export type PriceDisplay = {
  priceCents: number
  compareAtCents: number | null
  transferPriceCents: number | null
  installments: { count: number; amountCents: number; interestFree: boolean } | null
  /** Precio sin impuestos nacionales (IVA), Régimen de Transparencia Fiscal — Ley 27.743. */
  withoutNationalTaxesCents: number
  originalUsdCents: number | null
}

/**
 * Información de precio para fichas y listados. Usa la misma conversión que `computeCart`,
 * así lo que ve el comprador coincide con lo que paga. Devuelve null si el producto es en
 * USD y no hay cotización disponible.
 */
export const buildPriceDisplay = (args: {
  priceCents: number
  compareAtCents?: number | null
  currency: Currency
  taxRate: number
  rate: RateSnapshot | null
  settings: PricingSettings
}): PriceDisplay | null => {
  const { currency, rate, settings } = args
  try {
    const priceCents = toArsCents(args.priceCents, currency, rate, settings.priceRoundingStep)
    const compareAtCents =
      args.compareAtCents && args.compareAtCents > args.priceCents
        ? toArsCents(args.compareAtCents, currency, rate, settings.priceRoundingStep)
        : null
    const { installments: inst, transferDiscountPercent } = settings
    return {
      priceCents,
      compareAtCents,
      transferPriceCents:
        transferDiscountPercent > 0 ? priceCents - percentOf(priceCents, transferDiscountPercent) : null,
      // Solo se publicitan cuotas sin interés: con interés habría que informar CFT/TEA.
      installments:
        inst.enabled && inst.interestFree && inst.count > 1
          ? { count: inst.count, amountCents: Math.ceil(priceCents / inst.count), interestFree: true }
          : null,
      withoutNationalTaxesCents: Math.round(priceCents / (1 + args.taxRate / 100)),
      originalUsdCents: currency === 'USD' ? args.priceCents : null,
    }
  } catch (err) {
    if (err instanceof RateUnavailableError) return null
    throw err
  }
}
