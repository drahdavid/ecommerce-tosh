import { MPConnectionError, MPServerError } from 'mercadopago'
import type { Payload } from 'payload'
import type { Order } from '@/payload-types'
import { mp } from './client'

/** Reembolso total del pago de MP de un pedido. El estado pasa a "Reembolsado". */
export const refundOrder = async (payload: Payload, order: Order, actor: string) => {
  const paymentId = order.mp?.paymentId
  if (order.paymentMethod !== 'mercadopago' || !paymentId) {
    throw new Error('El pedido no tiene un pago de Mercado Pago para reembolsar. Si fue por transferencia, devolvé el dinero manualmente y marcá el pedido como reembolsado.')
  }
  try {
    await mp.refund().create({ payment_id: paymentId, requestOptions: { idempotencyKey: `refund-${order.id}` } })
  } catch (err) {
    // Sin respuesta (o con error interno de MP) el reembolso pudo haberse hecho igual.
    if (err instanceof MPConnectionError || err instanceof MPServerError) {
      throw new Error(`Mercado Pago no confirmó el reembolso. Revisá el pago ${paymentId} en tu cuenta antes de reintentar: puede haberse devuelto igual.`)
    }
    // MP responde en inglés y sin indicar qué hacer (ej. "Unauthorized use of live credentials" con credenciales de prueba).
    throw new Error(`Mercado Pago rechazó el reembolso (${(err as Error).message}). Hacé la devolución desde tu cuenta de Mercado Pago y después cambiá el estado del pedido a "Reembolsado".`)
  }
  return payload.update({
    collection: 'orders',
    id: order.id,
    data: { status: 'refunded' },
    overrideAccess: true,
    context: { actor, note: `Reembolso MP del pago ${paymentId}` },
  })
}
