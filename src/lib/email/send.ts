import type { ReactElement } from 'react'
import type { Payload } from 'payload'
import { render } from 'react-email'
import type { Order } from '@/payload-types'
import {
  AdminNewOrderEmail,
  OrderCancelledEmail,
  OrderCreatedEmail,
  OrderShippedEmail,
  PaymentApprovedEmail,
  type EmailCtx,
} from '@/emails/templates'

export const siteUrl = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

export const orderUrl = (order: Pick<Order, 'orderNumber' | 'accessToken'>) =>
  `${siteUrl()}/pedido/${order.orderNumber}?t=${order.accessToken ?? ''}`

/** Envía un email renderizado. Nunca lanza: un email fallido no debe romper un pago. */
export const sendEmail = async (payload: Payload, to: string | string[], subject: string, element: ReactElement) => {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (recipients.length === 0) return
  try {
    const html = await render(element)
    await payload.sendEmail({ to: recipients, subject, html })
  } catch (err) {
    payload.logger.error({ err, msg: `No se pudo enviar el email "${subject}"` })
  }
}

type OrderEmailKind = 'created' | 'paid' | 'shipped' | 'cancelled'

/** Emails al cliente (y aviso al admin) según el evento del pedido. */
export const sendOrderEmails = async (payload: Payload, order: Order, kind: OrderEmailKind) => {
  const settings = await payload.findGlobal({ slug: 'store-settings', depth: 0 })
  const ctx: EmailCtx = { order, settings, siteUrl: siteUrl(), orderUrl: orderUrl(order) }
  const admins = settings.adminNotificationEmails ?? []
  const n = order.orderNumber

  switch (kind) {
    case 'created':
      await sendEmail(payload, order.email, `Recibimos tu pedido ${n}`, OrderCreatedEmail(ctx))
      await sendEmail(payload, admins, `Nuevo pedido ${n}`, AdminNewOrderEmail({ ...ctx, reason: 'created' }))
      break
    case 'paid':
      await sendEmail(payload, order.email, `¡Pago confirmado! Pedido ${n}`, PaymentApprovedEmail(ctx))
      await sendEmail(payload, admins, `Pedido pagado ${n}`, AdminNewOrderEmail({ ...ctx, reason: 'paid' }))
      break
    case 'shipped':
      await sendEmail(payload, order.email, `Tu pedido ${n} está en camino`, OrderShippedEmail(ctx))
      break
    case 'cancelled':
      await sendEmail(payload, order.email, `Pedido ${n} cancelado`, OrderCancelledEmail(ctx))
      break
  }
}

export const notifyAdminsReview = async (payload: Payload, order: Order) => {
  const settings = await payload.findGlobal({ slug: 'store-settings', depth: 0 })
  const ctx: EmailCtx = { order, settings, siteUrl: siteUrl(), orderUrl: orderUrl(order) }
  await sendEmail(
    payload,
    settings.adminNotificationEmails ?? [],
    `⚠ Revisar pedido ${order.orderNumber}`,
    AdminNewOrderEmail({ ...ctx, reason: 'review' }),
  )
}
