import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * Cancela los pedidos pendientes creados por los tests e2e (email e2e+…@test.com): devuelve el
 * stock reservado y evita que se acumulen y choquen con el límite de pedidos impagos por IP.
 */
export async function cancelE2eOrders(): Promise<void> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ email: { like: 'e2e+' } }, { status: { equals: 'pending_payment' } }] },
    limit: 100,
    depth: 0,
  })
  for (const order of docs) {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'cancelled' },
      context: { actor: 'e2e', note: 'Limpieza de tests', skipEmails: true },
    })
  }
}
