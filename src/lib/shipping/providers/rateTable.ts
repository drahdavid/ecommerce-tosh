import { toCents } from '@/lib/money'
import type { ShippingZone } from '@/payload-types'
import { normalizePostalCode } from '../packaging'
import type { Destination, PackedCart, ShippingRate } from '../types'

export type RateZone = Pick<
  ShippingZone,
  'id' | 'name' | 'provinces' | 'postalRanges' | 'priority' | 'weightBrackets' | 'extraPerKg' | 'etaDays' | 'freeEligible'
>

/**
 * Busca la zona que corresponde al destino: primero por rango de CP, después por provincia.
 * Entre varias coincidencias gana la de mayor prioridad.
 */
export const matchZone = <Z extends RateZone>(zones: Z[], dest: Destination): Z | null => {
  const cp = normalizePostalCode(dest.postalCode)
  const cpNum = cp ? Number(cp) : null
  const byPriority = [...zones].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  if (cpNum != null) {
    const byCp = byPriority.find((z) =>
      (z.postalRanges ?? []).some((r) => cpNum >= Number(r.from) && cpNum <= Number(r.to)),
    )
    if (byCp) return byCp
  }
  return byPriority.find((z) => (z.provinces ?? []).includes(dest.province as never)) ?? null
}

/**
 * Precio para un peso dado: el primer tramo cuyo máximo cubre el peso. Si el peso supera
 * el último tramo, se cobra ese tramo + `extraPerKg` por cada kg (o fracción) adicional.
 */
export const priceForWeight = (zone: RateZone, grams: number): number | null => {
  const brackets = [...(zone.weightBrackets ?? [])].sort((a, b) => a.maxGrams - b.maxGrams)
  if (brackets.length === 0) return null
  const bracket = brackets.find((b) => grams <= b.maxGrams)
  if (bracket) return toCents(bracket.price)
  const last = brackets[brackets.length - 1]
  if (!zone.extraPerKg) return null
  const extraKg = Math.ceil((grams - last.maxGrams) / 1000)
  return toCents(last.price) + extraKg * toCents(zone.extraPerKg)
}

export const quoteRateTable = (zones: RateZone[], packed: PackedCart, dest: Destination | null): ShippingRate[] => {
  if (!dest) return []
  const zone = matchZone(zones, dest)
  if (!zone) return []
  const priceCents = priceForWeight(zone, packed.billableGrams)
  if (priceCents == null) return []
  return [
    {
      id: `rateTable:${zone.id}`,
      provider: 'rateTable',
      service: String(zone.id),
      carrier: 'Envío a domicilio',
      label: `Envío a domicilio — ${zone.name}`,
      priceCents,
      etaDays: zone.etaDays?.min != null && zone.etaDays?.max != null ? { min: zone.etaDays.min, max: zone.etaDays.max } : null,
      freeEligible: zone.freeEligible ?? true,
      requiresAddress: true,
    },
  ]
}
