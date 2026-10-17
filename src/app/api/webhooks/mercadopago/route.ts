import config from '@payload-config'
import { getPayload } from 'payload'
import { verifyMercadoPagoSignature } from '@/lib/payments/mercadopago/verifySignature'
import { processPayment } from '@/lib/payments/mercadopago/processPayment'

export const dynamic = 'force-dynamic'

/**
 * Webhook de Mercado Pago. Solo se usa el id del pago (`data.id`): el estado real se consulta
 * a la API. Responde 200 rápido; 401 si la firma es inválida; 500 si falló el proceso para que
 * MP reintente (el procesamiento es idempotente).
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = (await request.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } }
  const type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body.type
  const dataId = url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? (body.data?.id != null ? String(body.data.id) : null)

  const payload = await getPayload({ config })
  const secret = process.env.MP_WEBHOOK_SECRET
  if (secret) {
    const valid = verifyMercadoPagoSignature({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId: url.searchParams.get('data.id') ?? dataId,
      secret,
    })
    if (!valid) {
      payload.logger.warn({ msg: 'Webhook de MP con firma inválida', dataId })
      return Response.json({ error: 'invalid signature' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    payload.logger.error('MP_WEBHOOK_SECRET no configurado: se rechazan los webhooks en producción')
    return Response.json({ error: 'webhook secret not configured' }, { status: 500 })
  }

  if (type !== 'payment' || !dataId) return Response.json({ ok: true, ignored: true })

  try {
    const result = await processPayment(payload, dataId, 'webhook')
    return Response.json({ ok: true, ...result })
  } catch (err) {
    payload.logger.error({ err, msg: `Error procesando el pago ${dataId}` })
    return Response.json({ error: 'processing failed' }, { status: 500 })
  }
}
