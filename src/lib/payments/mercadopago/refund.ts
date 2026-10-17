import type { Payload } from 'payload'
import type { Order } from '@/payload-types'
import { mp } from './client'

/** Reembolso total del pago de MP de un pedido. El estado pasa a "Reembolsado". */
export const refundOrder = async (payload: Payload, order: Order, actor: string) => {
  const paymentId = order.mp?.paymentId
  if (order.paymentMethod !== 'mercadopago' || !paymentId) {
    throw new Error('El pedido no tiene un pago de Mercado Pago para reembolsar. Si fue por transferencia, devolvé el dinero manualmente y marcá el pedido como reembolsado.')
  }
  await mp.refund().create({ payment_id: paymentId, requestOptions: { idempotencyKey: `refund-${order.id}` } })
  return payload.update({
    collection: 'orders',
    id: order.id,
    data: { status: 'refunded' },
    overrideAccess: true,
    context: { actor, note: `Reembolso MP del pago ${paymentId}` },
  })
}
