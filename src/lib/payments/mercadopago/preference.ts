import type { Order, StoreSetting } from '@/payload-types'
import { siteUrl } from '@/lib/email/send'
import { isSandboxSeller, mp } from './client'

/**
 * Crea la preferencia de Checkout Pro para un pedido.
 * - Un solo ítem consolidado por el total exacto en ARS (evita diferencias de redondeo por prorrateo).
 * - `external_reference` = id del pedido: es lo que vincula el pago con la orden en el webhook.
 * - Vence junto con la reserva de stock, así no se puede pagar un precio congelado mucho después.
 * - Se excluyen ticket/atm (Rapipago, Pago Fácil): tardan días en acreditarse y chocan con la reserva.
 */
export const createPreference = async (order: Order, settings: StoreSetting) => {
  const base = siteUrl()
  const isPublicHttps = base.startsWith('https://')
  const resultUrl = `${base}/checkout/resultado?order=${order.orderNumber}&t=${order.accessToken}`
  const storeName = settings.storeName || 'Tienda'
  const itemsSummary = (order.items ?? [])
    .map((i) => `${i.qty}x ${i.title}${i.variantTitle && i.variantTitle !== 'Única' ? ` (${i.variantTitle})` : ''}`)
    .join(', ')

  const sandbox = await isSandboxSeller()
  const payer = {
    name: order.firstName,
    surname: order.lastName,
    email: order.email,
    ...(order.dni ? { identification: { type: order.dni.replace(/\D/g, '').length > 8 ? 'CUIT' : 'DNI', number: order.dni.replace(/\D/g, '') } } : {}),
  }

  const pref = await mp.preference().create({
    body: {
      items: [
        {
          id: order.orderNumber ?? String(order.id),
          title: `Pedido ${order.orderNumber} — ${storeName}`,
          description: itemsSummary.slice(0, 250),
          quantity: 1,
          unit_price: Number(order.totals?.total ?? 0),
          currency_id: 'ARS',
        },
      ],
      // En sandbox el pagador es quien inicie sesión en MP con la cuenta de prueba Comprador.
      ...(sandbox ? {} : { payer }),
      external_reference: String(order.id),
      back_urls: { success: resultUrl, pending: resultUrl, failure: resultUrl },
      // MP solo acepta auto_return con URLs públicas (no localhost).
      ...(isPublicHttps ? { auto_return: 'approved' } : {}),
      // Sin notification_url a propósito: los avisos usan la URL configurada en el panel de MP
      // (Tus integraciones → Webhooks), firmada con la clave secreta de la app. Con credenciales
      // de prueba MP no envía esos avisos (los pagos pertenecen a una app de prueba interna);
      // en ese caso confirman el retorno al sitio y la reconciliación del cron.
      ...(order.reservationExpiresAt
        ? { expires: true, expiration_date_from: new Date().toISOString(), expiration_date_to: new Date(order.reservationExpiresAt).toISOString() }
        : {}),
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
        installments: 12,
      },
      statement_descriptor: storeName.slice(0, 22),
      metadata: { order_number: order.orderNumber },
    },
    requestOptions: { idempotencyKey: `pref-${order.id}` },
  })

  if (!pref.id || !pref.init_point) throw new Error('Mercado Pago no devolvió el link de pago')
  return { preferenceId: pref.id, initPoint: pref.init_point }
}
