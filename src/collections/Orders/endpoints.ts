import type { Endpoint, PayloadRequest } from 'payload'
import { isAdminUser, isStaffUser } from '@/access'
import { refundOrder } from '@/lib/payments/mercadopago/refund'
import { packCart } from '@/lib/shipping/packaging'
import { createShipmentForOrder } from '@/lib/shipping/registry'
import { toCents } from '@/lib/money'

const fail = (message: string, status = 400) => Response.json({ error: message }, { status })

const loadOrder = async (req: PayloadRequest, allowed: (req: PayloadRequest) => boolean = isStaffUser) => {
  if (!allowed(req)) return { error: fail('No autorizado', 401) }
  const id = req.routeParams?.id as string
  const order = await req.payload.findByID({ collection: 'orders', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!order) return { error: fail('Pedido no encontrado', 404) }
  return { order }
}

export const orderEndpoints: Endpoint[] = [
  {
    path: '/:id/refund',
    method: 'post',
    handler: async (req) => {
      // Mueve dinero: solo administradores.
      const { order, error } = await loadOrder(req, isAdminUser)
      if (error) return error
      try {
        const updated = await refundOrder(req.payload, order, req.user?.email ?? 'admin')
        return Response.json({ ok: true, status: updated.status })
      } catch (err) {
        return fail((err as Error).message)
      }
    },
  },
  {
    path: '/:id/create-shipment',
    method: 'post',
    handler: async (req) => {
      const { order, error } = await loadOrder(req)
      if (error) return error
      if (!['paid', 'preparing'].includes(order.status)) return fail('Solo se despachan pedidos pagados.')
      try {
        // El peso/medidas se toman del snapshot del pedido; las medidas, del producto actual.
        const productIds = (order.items ?? []).map((i) => i.product as number)
        const { docs: products } = await req.payload.find({
          collection: 'products',
          where: { id: { in: productIds } },
          depth: 0,
          limit: productIds.length,
          overrideAccess: true,
        })
        const packed = packCart(
          (order.items ?? []).map((i) => {
            const p = products.find((x) => x.id === i.product)
            return {
              qty: i.qty ?? 1,
              weightGrams: i.weightGrams ?? p?.weightGrams ?? 500,
              lengthCm: p?.lengthCm ?? 20,
              widthCm: p?.widthCm ?? 15,
              heightCm: p?.heightCm ?? 10,
              lineTotalCents: toCents(i.lineTotal),
            }
          }),
        )
        const shipment = await createShipmentForOrder(order, packed)
        const updated = await req.payload.update({
          collection: 'orders',
          id: order.id,
          overrideAccess: true,
          data: {
            status: 'shipped',
            shipment: {
              ...order.shipment,
              carrier: order.shippingMethod?.carrier,
              trackingNumber: shipment.trackingNumber,
              providerShipmentId: shipment.providerShipmentId,
              labelUrl: shipment.labelUrl,
            },
          },
          context: { actor: req.user?.email },
        })
        return Response.json({ ok: true, status: updated.status, trackingNumber: shipment.trackingNumber })
      } catch (err) {
        return fail((err as Error).message)
      }
    },
  },
]
