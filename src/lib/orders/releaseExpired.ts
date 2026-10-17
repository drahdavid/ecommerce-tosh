import type { Payload } from 'payload'
import { isMercadoPagoConfigured } from '@/lib/payments/mercadopago/client'
import { findPaymentsForOrder, processPayment } from '@/lib/payments/mercadopago/processPayment'

/**
 * Libera reservas vencidas. Antes de cancelar un pedido de MP le pregunta a la API si hubo un
 * pago (por si se perdió el webhook): si está aprobado lo procesa en vez de cancelar.
 */
export const releaseExpiredReservations = async (payload: Payload, limit = 50) => {
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [{ status: { equals: 'pending_payment' } }, { reservationExpiresAt: { less_than: new Date().toISOString() } }],
    },
    limit,
    depth: 0,
    overrideAccess: true,
  })

  const summary = { checked: docs.length, cancelled: 0, recovered: 0, errors: 0 }
  for (const order of docs) {
    try {
      if (order.paymentMethod === 'mercadopago' && isMercadoPagoConfigured()) {
        const payments = await findPaymentsForOrder(order.id)
        const live = payments.find((p) => p.status === 'approved') ?? payments.find((p) => p.status === 'in_process' || p.status === 'pending' || p.status === 'authorized')
        if (live?.status === 'approved') {
          await processPayment(payload, String(live.id), 'reconcile')
          summary.recovered++
          continue
        }
        // Un pago en revisión (in_process) se espera: si se aprueba tarde, el webhook lo resuelve.
        if (live) continue
      }
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'cancelled' },
        overrideAccess: true,
        context: { actor: 'cron', note: 'Reserva vencida sin pago' },
      })
      summary.cancelled++
    } catch (err) {
      summary.errors++
      payload.logger.error({ err, msg: `No se pudo liberar la reserva del pedido ${order.orderNumber}` })
    }
  }
  return summary
}
