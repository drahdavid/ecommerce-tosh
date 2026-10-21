import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Order } from '@/payload-types'
import { orderTokenCookie } from '@/lib/orders/accessCookie'
import { getCurrentCustomer } from './auth'
import { getPayloadClient } from './catalog'

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Pedido visible para quien lo pide: el invitado con el token del link del email (que el proxy
 * pasa a una cookie), o el cliente logueado dueño del pedido. Sin token válido devuelve null
 * (no revela si existe).
 */
export const getOrderForViewer = async (orderNumber: string, tokenArg?: string | null): Promise<Order | null> => {
  const token = tokenArg || (await cookies()).get(orderTokenCookie(orderNumber))?.value
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

/**
 * Vincula a la cuenta los pedidos hechos como invitado con el mismo email. Solo para clientes con
 * el email verificado. No va en un archivo 'use server': ahí sería un endpoint público que
 * recibe cualquier id y email.
 */
export const linkGuestOrders = async (customerId: number, email: string) => {
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'orders',
    where: { and: [{ email: { equals: email.toLowerCase() } }, { customer: { exists: false } }] },
    data: { customer: customerId },
    overrideAccess: true,
    context: { skipEmails: true },
  })
}
