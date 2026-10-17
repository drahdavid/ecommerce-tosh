import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook } from 'payload'
import type { Order } from '@/payload-types'
import { defer } from '@/lib/defer'
import { notifyAdminsReview, sendOrderEmails } from '@/lib/email/send'
import { canTransition, STATUS_LABELS, type OrderStatus } from '@/lib/orders/stateMachine'
import { releaseOrderCoupon, releaseOrderStock } from '@/lib/orders/stock'

/**
 * Contexto que el código del sistema pasa en `context` al actualizar pedidos:
 *  - system: habilita transiciones reservadas al sistema (ej. cancelado → pagado por pago tardío).
 *  - actor / note: quedan registrados en el historial.
 *  - skipEmails: no notificar al cliente.
 */
export type OrderContext = { system?: boolean; actor?: string; note?: string; skipEmails?: boolean }

export const orderBeforeChange: CollectionBeforeChangeHook<Order> = ({ data, originalDoc, operation, req, context }) => {
  if (operation !== 'update' || !originalDoc || !data.status || data.status === originalDoc.status) return data

  const from = originalDoc.status as OrderStatus
  const to = data.status as OrderStatus
  const ctx = context as OrderContext
  if (!canTransition(from, to, { system: ctx.system })) {
    throw new APIError(`No se puede pasar un pedido de "${STATUS_LABELS[from]}" a "${STATUS_LABELS[to]}".`, 400, null, true)
  }

  const now = new Date().toISOString()
  data.statusHistory = [
    ...(originalDoc.statusHistory ?? []),
    { from, to, at: now, by: req.user?.email ?? ctx.actor ?? 'sistema', note: ctx.note },
  ]
  if (to === 'paid' && !originalDoc.paidAt) data.paidAt = now
  if (to === 'shipped') data.shipment = { ...originalDoc.shipment, ...data.shipment, shippedAt: now }
  return data
}

/** Estados desde los que un reembolso implica que la mercadería no salió y vuelve al stock. */
const RESTOCK_ON_REFUND_FROM: OrderStatus[] = ['pending_payment', 'paid', 'preparing']

export const orderAfterChange: CollectionAfterChangeHook<Order> = async ({ doc, previousDoc, operation, req, context }) => {
  if (operation !== 'update' || !previousDoc) return doc
  const { payload } = req
  const ctx = context as OrderContext

  if (previousDoc.status !== doc.status) {
    const from = previousDoc.status as OrderStatus
    const to = doc.status as OrderStatus
    const lines = (doc.items ?? [])
      .filter((i) => i.variant && i.qty)
      .map((i) => ({ variantId: typeof i.variant === 'object' ? i.variant!.id : i.variant!, qty: i.qty! }))

    if (to === 'cancelled' || (to === 'refunded' && RESTOCK_ON_REFUND_FROM.includes(from))) {
      await releaseOrderStock(payload, req, doc.id, lines)
      if (to === 'cancelled' && doc.coupon?.code) await releaseOrderCoupon(payload, req, doc.id, doc.coupon.code)
    }

    // Un pago de MP abandonado no se notifica: el comprador nunca recibió un email del pedido.
    const notifyCancel = to === 'cancelled' && (doc.paymentMethod === 'transfer' || from !== 'pending_payment')
    if (!ctx.skipEmails && (to === 'paid' || to === 'shipped' || notifyCancel)) {
      defer(() => sendOrderEmails(payload, doc, to))
    }
  }

  if ((previousDoc.needsReview ?? 'none') === 'none' && doc.needsReview && doc.needsReview !== 'none') {
    defer(() => notifyAdminsReview(payload, doc))
  }
  return doc
}
