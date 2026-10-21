import type { Payload } from 'payload'
import type { Payment } from 'mercadopago'
import type { Order } from '@/payload-types'
import type { OrderContext } from '@/collections/Orders/hooks'
import { withTransaction } from '@/lib/db/transaction'
import { reclaimOrderStock } from '@/lib/orders/stock'
import { mp } from './client'

export type PaymentResponse = Awaited<ReturnType<Payment['get']>>

export type ProcessSource = 'webhook' | 'return' | 'reconcile'

export type ProcessResult =
  | { outcome: 'ignored'; reason: string }
  | { outcome: 'duplicate' }
  | { outcome: 'processed'; orderStatus: string; mpStatus: string }

const PAID_STATES = ['paid', 'preparing', 'shipped', 'delivered']

/**
 * Procesa un pago de MP a partir de su id. La notificación solo trae `data.id`: el estado real
 * SIEMPRE se consulta a la API (nunca se confía en el body ni en el query string de retorno).
 * Idempotente: cada combinación (pago, estado, última actualización) se procesa una sola vez.
 * Lo usan el webhook, la página de resultado y el cron de reconciliación.
 */
export const processPayment = async (
  payload: Payload,
  paymentId: string,
  source: ProcessSource,
  prefetched?: PaymentResponse,
): Promise<ProcessResult> => {
  const payment = prefetched ?? (await mp.payment().get({ id: paymentId }))
  const orderId = payment.external_reference
  if (!orderId) return { outcome: 'ignored', reason: 'Pago sin external_reference' }

  const eventKey = `${payment.id}:${payment.status}:${payment.date_last_updated ?? ''}`
  const seen = await payload.find({
    collection: 'payment-events',
    where: { eventKey: { equals: eventKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (seen.totalDocs > 0) return { outcome: 'duplicate' }

  const order = await payload
    .findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!order) return { outcome: 'ignored', reason: `No existe el pedido ${orderId}` }

  return withTransaction(payload, async (req) => {
    try {
      await payload.create({
        collection: 'payment-events',
        data: {
          eventKey,
          mpPaymentId: String(payment.id),
          status: payment.status ?? 'unknown',
          statusDetail: payment.status_detail,
          order: order.id,
          source,
          raw: payment as unknown as Record<string, unknown>,
        },
        overrideAccess: true,
        req,
      })
    } catch (err) {
      // Índice único sobre eventKey: otro proceso lo registró en paralelo.
      if ((err as Error).name === 'ValidationError') return { outcome: 'duplicate' as const }
      throw err
    }

    const mpData: Order['mp'] = {
      ...order.mp,
      paymentId: String(payment.id),
      status: payment.status,
      statusDetail: payment.status_detail,
      paymentTypeId: payment.payment_type_id,
      paymentMethodId: payment.payment_method_id,
      installments: payment.installments,
      transactionAmount: payment.transaction_amount,
      netReceivedAmount: payment.transaction_details?.net_received_amount,
      approvedAt: payment.date_approved ?? order.mp?.approvedAt,
    }

    const update: Partial<Order> = { mp: mpData }
    const context: OrderContext = { actor: `mercadopago:${source}`, note: `Pago ${payment.id} ${payment.status}` }
    const isCurrentPayment = !order.mp?.paymentId || order.mp.paymentId === String(payment.id)

    switch (payment.status) {
      case 'approved': {
        const amountOk =
          payment.currency_id === 'ARS' &&
          Math.abs(Number(payment.transaction_amount) - Number(order.totals?.total)) < 0.01
        // Un pago por otro monto o moneda no confirma el pedido: queda para que lo revise el admin.
        if (!amountOk) update.needsReview = 'amount_mismatch'

        if (order.status === 'pending_payment') {
          if (amountOk) update.status = 'paid'
        } else if (order.status === 'cancelled') {
          if (!amountOk) break
          // Pago tardío: la reserva venció y el stock se devolvió. Se intenta volver a reservar.
          const lines = (order.items ?? []).map((i) => ({ variantId: i.variant as number, qty: i.qty ?? 0 }))
          const reclaimed = await reclaimOrderStock(payload, req, order.id, lines)
          update.status = 'paid'
          context.system = true
          context.note = reclaimed ? 'Pago tardío: stock re-reservado' : 'Pago tardío SIN stock: reembolsar'
          if (!reclaimed) update.needsReview = 'oversold'
        } else if (PAID_STATES.includes(order.status) && !isCurrentPayment) {
          // Segundo pago aprobado para un pedido ya pagado (ej. el comprador pagó dos veces).
          update.needsReview = 'other'
          update.adminNotes = `${order.adminNotes ?? ''}\nPago duplicado ${payment.id}: reembolsar.`.trim()
          delete update.mp
        }
        break
      }
      case 'refunded':
      case 'charged_back':
        if (isCurrentPayment && PAID_STATES.includes(order.status)) update.status = 'refunded'
        break
      default:
        // pending / in_process / rejected / cancelled: solo se actualizan los datos de MP.
        // Si fue rechazado, el comprador puede reintentar mientras la reserva siga vigente.
        if (!isCurrentPayment && PAID_STATES.includes(order.status)) delete update.mp
    }

    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      data: update,
      overrideAccess: true,
      context,
      req,
    })
    return { outcome: 'processed' as const, orderStatus: updated.status, mpStatus: payment.status ?? 'unknown' }
  })
}

/** Busca pagos asociados a un pedido (para reconciliar si se perdió una notificación). */
export const findPaymentsForOrder = async (orderId: string | number) => {
  const res = await mp.payment().search({
    options: { external_reference: String(orderId), sort: 'date_created', criteria: 'desc' },
  })
  return res.results ?? []
}
