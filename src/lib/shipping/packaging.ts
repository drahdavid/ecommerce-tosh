import type { PackedCart } from './types'

/** Divisor volumétrico estándar de los carriers argentinos (cm³ / 5000 = kg). */
export const VOLUMETRIC_DIVISOR = 5000

type PackableLine = {
  qty: number
  weightGrams: number
  lengthCm: number
  widthCm: number
  heightCm: number
  lineTotalCents: number
}

/**
 * Empaquetado heurístico: suma pesos reales y volúmenes de todas las unidades. Alcanza para
 * cotizar; si el negocio despacha en cajas estándar se puede reemplazar por una tabla de cajas.
 */
export const packCart = (lines: PackableLine[]): PackedCart => {
  let realGrams = 0
  let volumeCm3 = 0
  let declaredValueCents = 0
  let itemCount = 0
  for (const l of lines) {
    realGrams += l.weightGrams * l.qty
    volumeCm3 += l.lengthCm * l.widthCm * l.heightCm * l.qty
    declaredValueCents += l.lineTotalCents
    itemCount += l.qty
  }
  const volumetricGrams = Math.round((volumeCm3 / VOLUMETRIC_DIVISOR) * 1000)
  return {
    realGrams,
    volumetricGrams,
    billableGrams: Math.max(realGrams, volumetricGrams),
    declaredValueCents,
    itemCount,
  }
}

/** Normaliza un código postal argentino (CPA "C1425ABC" o numérico "1425") a 4 dígitos. */
export const normalizePostalCode = (raw: string): string | null => {
  const match = raw.trim().toUpperCase().match(/^[A-Z]?(\d{4})[A-Z]{0,3}$/)
  return match ? match[1] : null
}
