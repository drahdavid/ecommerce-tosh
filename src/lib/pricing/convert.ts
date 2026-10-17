import { roundUpToStep, type Currency } from '@/lib/money'
import type { RateSnapshot } from './types'

export class RateUnavailableError extends Error {
  constructor(message = 'No hay cotización del dólar disponible') {
    super(message)
    this.name = 'RateUnavailableError'
  }
}

/**
 * Convierte un precio unitario a centavos ARS. Los precios en USD se multiplican por la
 * cotización y se redondean hacia arriba al paso configurado; los precios en ARS se
 * devuelven tal cual (el admin ya los cargó como quiere mostrarlos).
 */
export const toArsCents = (
  cents: number,
  currency: Currency,
  rate: RateSnapshot | null,
  roundingStep: number,
): number => {
  if (currency === 'ARS') return cents
  if (!rate || !(rate.rate > 0)) throw new RateUnavailableError()
  return roundUpToStep(cents * rate.rate, roundingStep)
}
