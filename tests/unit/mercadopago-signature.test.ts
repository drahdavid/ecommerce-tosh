import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildManifest, parseSignatureHeader, verifyMercadoPagoSignature } from '@/lib/payments/mercadopago/verifySignature'

const secret = 'test-secret'
const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex')

describe('firma de webhooks de Mercado Pago', () => {
  const ts = '1704908010'
  const xRequestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e'
  const dataId = '123456789'

  it('parsea el header x-signature', () => {
    expect(parseSignatureHeader(`ts=${ts},v1=abc123`)).toEqual({ ts, v1: 'abc123' })
    expect(parseSignatureHeader(` ts=${ts} , v1=abc `)).toEqual({ ts, v1: 'abc' })
  })

  it('arma el manifest según la plantilla oficial', () => {
    expect(buildManifest(dataId, xRequestId, ts)).toBe(`id:${dataId};request-id:${xRequestId};ts:${ts};`)
    expect(buildManifest(null, xRequestId, ts)).toBe(`request-id:${xRequestId};ts:${ts};`)
    expect(buildManifest(dataId, null, ts)).toBe(`id:${dataId};ts:${ts};`)
  })

  it('acepta una firma válida', () => {
    const v1 = sign(`id:${dataId};request-id:${xRequestId};ts:${ts};`)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId, secret })).toBe(true)
  })

  it('usa el data.id alfanumérico en minúsculas', () => {
    const v1 = sign(`id:abc123xyz;request-id:${xRequestId};ts:${ts};`)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId: 'ABC123XYZ', secret })).toBe(true)
  })

  it('rechaza firma alterada, ts alterado, id distinto, secreto incorrecto o header faltante', () => {
    const v1 = sign(`id:${dataId};request-id:${xRequestId};ts:${ts};`)
    const tampered = v1.slice(0, -1) + (v1.endsWith('0') ? '1' : '0')
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${tampered}`, xRequestId, dataId, secret })).toBe(false)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=1704908011,v1=${v1}`, xRequestId, dataId, secret })).toBe(false)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId: '999', secret })).toBe(false)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId, secret: 'otro' })).toBe(false)
    expect(verifyMercadoPagoSignature({ xSignature: null, xRequestId, dataId, secret })).toBe(false)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts}`, xRequestId, dataId, secret })).toBe(false)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=no-hex!`, xRequestId, dataId, secret })).toBe(false)
  })

  it('con tolerancia rechaza notificaciones viejas (ts en segundos o milisegundos)', () => {
    const now = new Date(Number(ts) * 1000 + 60_000)
    const v1 = sign(`id:${dataId};request-id:${xRequestId};ts:${ts};`)
    const header = `ts=${ts},v1=${v1}`
    expect(verifyMercadoPagoSignature({ xSignature: header, xRequestId, dataId, secret, toleranceSeconds: 300, now })).toBe(true)
    expect(verifyMercadoPagoSignature({ xSignature: header, xRequestId, dataId, secret, toleranceSeconds: 30, now })).toBe(false)

    const tsMs = String(Number(ts) * 1000)
    const v1ms = sign(`id:${dataId};request-id:${xRequestId};ts:${tsMs};`)
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${tsMs},v1=${v1ms}`, xRequestId, dataId, secret, toleranceSeconds: 300, now })).toBe(true)
  })
})
