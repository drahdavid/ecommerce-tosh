import { timingSafeEqual } from 'node:crypto'
import type { Order } from '@/payload-types'
import { getCurrentCustomer } from './auth'
import { getPayloadClient } from './catalog'

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Pedido visible para quien lo pide: el invitado con el token del link del email, o el
 * cliente logueado dueño del pedido. Sin token válido devuelve null (no revela si existe).
 */
export const getOrderForViewer = async (orderNumber: string, token?: string | null): Promise<Order | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'orders',
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const order = docs[0]
  if (!order) return null
  if (token && order.accessToken && sameToken(token, order.accessToken)) return order
  const customer = await getCurrentCustomer()
  const ownerId = typeof order.customer === 'object' ? order.customer?.id : order.customer
  if (customer && ownerId === customer.id) return order
  return null
}
