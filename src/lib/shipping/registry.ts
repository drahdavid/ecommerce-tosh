import type { Payload } from 'payload'
import type { Order } from '@/payload-types'
import { quotePickup } from './providers/pickup'
import { quoteRateTable } from './providers/rateTable'
import { createZipnovaShipment, quoteZipnova } from './providers/zipnova'
import type { CreatedShipment, Destination, PackedCart, ShippingRate } from './types'

/**
 * Cotiza con todos los proveedores habilitados en "Configuración de envíos" y une las tarifas.
 * Un proveedor que falla no rompe el checkout: se loguea y se ignora.
 */
export const quoteShipping = async (
  payload: Payload,
  packed: PackedCart,
  destination: Destination | null,
): Promise<ShippingRate[]> => {
  const settings = await payload.findGlobal({ slug: 'shipping-settings', depth: 0, overrideAccess: true })
  const tasks: Promise<ShippingRate[]>[] = []

  if (settings.pickup?.enabled) tasks.push(Promise.resolve(quotePickup(settings.pickup.address, settings.pickup.hours)))

  if (settings.rateTable?.enabled && destination) {
    tasks.push(
      payload
        .find({ collection: 'shipping-zones', where: { active: { equals: true } }, limit: 200, depth: 0, overrideAccess: true })
        .then(({ docs }) => quoteRateTable(docs, packed, destination)),
    )
  }

  if (settings.zipnova?.enabled && destination) {
    tasks.push(quoteZipnova({ packed, destination }, settings.zipnova))
  }

  const results = await Promise.allSettled(tasks)
  const rates: ShippingRate[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') rates.push(...r.value)
    else payload.logger.error({ err: r.reason, msg: 'Falló la cotización de un proveedor de envío' })
  }
  return rates.sort((a, b) => Number(a.requiresAddress) - Number(b.requiresAddress) || a.priceCents - b.priceCents)
}

/** Genera el envío en el proveedor (etiqueta + tracking). Solo los carriers integrados lo soportan. */
export const createShipmentForOrder = async (order: Order, packed: PackedCart): Promise<CreatedShipment> => {
  const provider = order.shippingMethod?.provider
  const a = order.shippingAddress
  if (!a?.street || !a.postalCode) throw new Error('El pedido no tiene dirección de envío')
  const request = {
    orderNumber: order.orderNumber!,
    service: order.shippingMethod?.service ?? '',
    packed,
    recipient: {
      name: `${order.firstName} ${order.lastName}`,
      phone: order.phone,
      email: order.email,
      street: a.street,
      number: a.number ?? '',
      floor: a.floor,
      city: a.city ?? '',
      province: a.province ?? '',
      postalCode: a.postalCode,
    },
  }
  switch (provider) {
    case 'zipnova':
      return createZipnovaShipment(request)
    default:
      throw new Error('Este método de envío no genera etiquetas automáticamente: cargá transporte y N° de seguimiento a mano en la pestaña Envío.')
  }
}
