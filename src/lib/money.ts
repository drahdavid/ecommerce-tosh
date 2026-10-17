/**
 * Helpers de dinero. Internamente todo se calcula en centavos (enteros) para evitar
 * errores de punto flotante. Payload guarda montos en unidades "mayores" (pesos con
 * hasta 2 decimales) porque es lo que el admin carga a mano.
 */

export type Currency = 'ARS' | 'USD'

/** Unidades mayores (ej. 1234.56) → centavos (123456). */
export const toCents = (amount: number | null | undefined): number =>
  Math.round((amount ?? 0) * 100)

/** Centavos → unidades mayores con 2 decimales. */
export const fromCents = (cents: number): number => Math.round(cents) / 100

/** Redondea centavos hacia arriba al múltiplo de `stepPesos` (1, 10, 100…). */
export const roundUpToStep = (cents: number, stepPesos: number): number => {
  const stepCents = Math.max(1, Math.round(stepPesos * 100))
  return Math.ceil(cents / stepCents) * stepCents
}

/** Aplica un porcentaje a centavos, redondeando al centavo. */
export const percentOf = (cents: number, percent: number): number =>
  Math.round((cents * percent) / 100)

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const usdFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** Formatea centavos como precio. ARS es la moneda de exhibición obligatoria. */
export const formatMoney = (cents: number, currency: Currency = 'ARS'): string =>
  (currency === 'USD' ? usdFormatter : arsFormatter).format(fromCents(cents))
