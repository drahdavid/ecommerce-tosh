import { createHmac, timingSafeEqual } from 'node:crypto'

export type SignatureInput = {
  /** Header `x-signature`: "ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839" */
  xSignature: string | null
  /** Header `x-request-id`. */
  xRequestId: string | null
  /** Query param `data.id` de la URL de notificación. */
  dataId: string | null
  secret: string
  /** Si se indica, rechaza notificaciones con `ts` más viejo que esto (protección anti-replay). */
  toleranceSeconds?: number
  now?: Date
}

export const parseSignatureHeader = (header: string): { ts?: string; v1?: string } => {
  const parts: Record<string, string> = {}
  for (const piece of header.split(',')) {
    const [k, ...rest] = piece.split('=')
    if (k && rest.length) parts[k.trim()] = rest.join('=').trim()
  }
  return { ts: parts.ts, v1: parts.v1 }
}

/**
 * Plantilla oficial de Mercado Pago: `id:[data.id];request-id:[x-request-id];ts:[ts];`.
 * Si falta algún valor se omite su segmento. Un `data.id` alfanumérico se valida en minúsculas.
 */
export const buildManifest = (dataId: string | null, xRequestId: string | null, ts: string): string => {
  let manifest = ''
  if (dataId) manifest += `id:${/[a-z]/i.test(dataId) ? dataId.toLowerCase() : dataId};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`
  return manifest
}

/** Valida la firma HMAC-SHA256 de un webhook de Mercado Pago. */
export const verifyMercadoPagoSignature = (input: SignatureInput): boolean => {
  if (!input.xSignature || !input.secret) return false
  const { ts, v1 } = parseSignatureHeader(input.xSignature)
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false

  if (input.toleranceSeconds) {
    const tsNum = Number(ts)
    // MP envía `ts` en segundos o milisegundos según el producto: se normaliza a ms.
    const tsMs = tsNum < 1e12 ? tsNum * 1000 : tsNum
    const ageMs = Math.abs((input.now ?? new Date()).getTime() - tsMs)
    if (!Number.isFinite(tsNum) || ageMs > input.toleranceSeconds * 1000) return false
  }

  const expected = createHmac('sha256', input.secret)
    .update(buildManifest(input.dataId, input.xRequestId, ts))
    .digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(v1.toLowerCase(), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
