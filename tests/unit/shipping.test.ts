import { describe, expect, it } from 'vitest'
import { normalizePostalCode, packCart } from '@/lib/shipping/packaging'
import { matchZone, priceForWeight, quoteRateTable, type RateZone } from '@/lib/shipping/providers/rateTable'

const zone = (over: Partial<RateZone>): RateZone => ({
  id: 1,
  name: 'Zona',
  provinces: [],
  postalRanges: [],
  priority: 0,
  weightBrackets: [
    { maxGrams: 1000, price: 4000 },
    { maxGrams: 5000, price: 7000 },
  ],
  extraPerKg: 1000,
  etaDays: { min: 2, max: 4 },
  freeEligible: true,
  ...over,
})

describe('packCart', () => {
  it('usa el mayor entre peso real y volumétrico', () => {
    // 1 caja 40×30×20 = 24.000 cm³ / 5000 = 4,8 kg volumétrico vs 1 kg real
    const p = packCart([{ qty: 1, weightGrams: 1000, lengthCm: 40, widthCm: 30, heightCm: 20, lineTotalCents: 100 }])
    expect(p.realGrams).toBe(1000)
    expect(p.volumetricGrams).toBe(4800)
    expect(p.billableGrams).toBe(4800)
  })

  it('multiplica por cantidad y suma valor declarado', () => {
    const p = packCart([{ qty: 3, weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10, lineTotalCents: 9000 }])
    expect(p.realGrams).toBe(1500)
    expect(p.billableGrams).toBe(1500)
    expect(p.declaredValueCents).toBe(9000)
    expect(p.itemCount).toBe(3)
  })
})

describe('normalizePostalCode', () => {
  it('acepta CP numérico y CPA', () => {
    expect(normalizePostalCode('1425')).toBe('1425')
    expect(normalizePostalCode('C1425ABC')).toBe('1425')
    expect(normalizePostalCode(' b1636 ')).toBe('1636')
    expect(normalizePostalCode('14')).toBeNull()
    expect(normalizePostalCode('abcd')).toBeNull()
  })
})

describe('matchZone', () => {
  const amba = zone({ id: 1, name: 'AMBA', postalRanges: [{ from: 1600, to: 1899 }], priority: 10 })
  const caba = zone({ id: 2, name: 'CABA', provinces: ['CABA'] })
  const bsas = zone({ id: 3, name: 'Buenos Aires', provinces: ['Buenos Aires'] })

  it('prioriza rango de CP sobre provincia', () => {
    expect(matchZone([caba, bsas, amba], { postalCode: 'B1636', province: 'Buenos Aires' })?.name).toBe('AMBA')
  })
  it('cae a provincia si ningún rango coincide', () => {
    expect(matchZone([caba, bsas, amba], { postalCode: '7600', province: 'Buenos Aires' })?.name).toBe('Buenos Aires')
    expect(matchZone([caba, bsas, amba], { postalCode: '1425', province: 'CABA' })?.name).toBe('CABA')
  })
  it('devuelve null sin coincidencias', () => {
    expect(matchZone([caba], { postalCode: '5000', province: 'Córdoba' })).toBeNull()
  })
  it('ante empate de CP gana la de mayor prioridad', () => {
    const a = zone({ id: 5, name: 'A', postalRanges: [{ from: 1000, to: 9999 }], priority: 1 })
    const b = zone({ id: 6, name: 'B', postalRanges: [{ from: 1000, to: 9999 }], priority: 5 })
    expect(matchZone([a, b], { postalCode: '2000', province: 'Santa Fe' })?.name).toBe('B')
  })
})

describe('priceForWeight', () => {
  const z = zone({})
  it('elige el tramo que cubre el peso (bordes inclusivos)', () => {
    expect(priceForWeight(z, 1)).toBe(4000_00)
    expect(priceForWeight(z, 1000)).toBe(4000_00)
    expect(priceForWeight(z, 1001)).toBe(7000_00)
    expect(priceForWeight(z, 5000)).toBe(7000_00)
  })
  it('cobra extra por kg (o fracción) sobre el último tramo', () => {
    expect(priceForWeight(z, 5001)).toBe(8000_00)
    expect(priceForWeight(z, 7000)).toBe(9000_00)
  })
  it('sin extra configurado no cotiza pesos mayores', () => {
    expect(priceForWeight(zone({ extraPerKg: null }), 6000)).toBeNull()
  })
})

describe('quoteRateTable', () => {
  it('devuelve una tarifa con id estable para re-cotizar', () => {
    const packed = packCart([{ qty: 1, weightGrams: 800, lengthCm: 10, widthCm: 10, heightCm: 10, lineTotalCents: 0 }])
    const [rate] = quoteRateTable([zone({ id: 7, name: 'Interior', provinces: ['Córdoba'] })], packed, { postalCode: '5000', province: 'Córdoba' })
    expect(rate).toMatchObject({ id: 'rateTable:7', priceCents: 4000_00, requiresAddress: true, etaDays: { min: 2, max: 4 } })
  })
  it('sin destino no cotiza', () => {
    const packed = packCart([])
    expect(quoteRateTable([zone({})], packed, null)).toEqual([])
  })
})
