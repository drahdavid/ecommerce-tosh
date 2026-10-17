import { Button, Section, Text } from 'react-email'
import type { Order, StoreSetting } from '@/payload-types'
import { formatMoney, toCents } from '@/lib/money'
import { EmailLayout, colors } from './Layout'
import { OrderSummary } from './OrderSummary'

export type EmailCtx = { order: Order; settings: StoreSetting; siteUrl: string; orderUrl: string }

const base = (ctx: EmailCtx) => ({ storeName: ctx.settings.storeName || 'Tienda', siteUrl: ctx.siteUrl })

const ViewOrder = ({ href }: { href: string }) => (
  <Button
    href={href}
    style={{ backgroundColor: colors.accent, color: '#fff', padding: '12px 20px', borderRadius: '6px', fontSize: '14px', marginTop: '16px' }}
  >
    Ver mi pedido
  </Button>
)

export const OrderCreatedEmail = (ctx: EmailCtx) => {
  const { order, settings } = ctx
  const isTransfer = order.paymentMethod === 'transfer'
  const bank = settings.bank
  return (
    <EmailLayout {...base(ctx)} preview={`Recibimos tu pedido ${order.orderNumber}`} title={`¡Gracias, ${order.firstName}!`}>
      <Text>
        Recibimos tu pedido <strong>{order.orderNumber}</strong>.
        {isTransfer
          ? ' Para confirmarlo, hacé la transferencia con estos datos y respondé este email con el comprobante.'
          : ' Te avisamos apenas se acredite el pago.'}
      </Text>
      {isTransfer && bank ? (
        <Section style={{ backgroundColor: '#f4f4f5', padding: '12px 16px', borderRadius: '6px' }}>
          <Text style={{ margin: '2px 0' }}>Monto: <strong>{formatMoney(toCents(order.totals?.total))}</strong></Text>
          {bank.bankName ? <Text style={{ margin: '2px 0' }}>Banco: {bank.bankName}</Text> : null}
          {bank.holder ? <Text style={{ margin: '2px 0' }}>Titular: {bank.holder}</Text> : null}
          {bank.cuit ? <Text style={{ margin: '2px 0' }}>CUIT: {bank.cuit}</Text> : null}
          {bank.cbu ? <Text style={{ margin: '2px 0' }}>CBU/CVU: {bank.cbu}</Text> : null}
          {bank.alias ? <Text style={{ margin: '2px 0' }}>Alias: {bank.alias}</Text> : null}
          {order.reservationExpiresAt ? (
            <Text style={{ margin: '8px 0 0', fontSize: '12px', color: colors.muted }}>
              Reservamos tu stock hasta el {new Date(order.reservationExpiresAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.
            </Text>
          ) : null}
        </Section>
      ) : null}
      <OrderSummary order={order} />
      <ViewOrder href={ctx.orderUrl} />
    </EmailLayout>
  )
}

export const PaymentApprovedEmail = (ctx: EmailCtx) => (
  <EmailLayout {...base(ctx)} preview={`Pago aprobado — pedido ${ctx.order.orderNumber}`} title="¡Pago confirmado!">
    <Text>
      Ya acreditamos el pago de tu pedido <strong>{ctx.order.orderNumber}</strong>. Estamos preparándolo
      {ctx.order.shippingMethod?.provider === 'pickup' ? ' y te avisamos cuando esté listo para retirar.' : ' y te avisamos cuando lo despachemos.'}
    </Text>
    <OrderSummary order={ctx.order} />
    <ViewOrder href={ctx.orderUrl} />
  </EmailLayout>
)

export const OrderShippedEmail = (ctx: EmailCtx) => {
  const s = ctx.order.shipment
  return (
    <EmailLayout {...base(ctx)} preview={`Tu pedido ${ctx.order.orderNumber} está en camino`} title="¡Tu pedido está en camino!">
      <Text>
        Despachamos tu pedido <strong>{ctx.order.orderNumber}</strong>
        {s?.carrier ? ` por ${s.carrier}` : ''}.
      </Text>
      {s?.trackingNumber ? (
        <Text>
          N° de seguimiento: <strong>{s.trackingNumber}</strong>
          {s.trackingUrl ? (
            <>
              {' — '}
              <a href={s.trackingUrl}>seguir envío</a>
            </>
          ) : null}
        </Text>
      ) : null}
      <ViewOrder href={ctx.orderUrl} />
    </EmailLayout>
  )
}

export const OrderCancelledEmail = (ctx: EmailCtx) => (
  <EmailLayout {...base(ctx)} preview={`Pedido ${ctx.order.orderNumber} cancelado`} title="Tu pedido fue cancelado">
    <Text>
      El pedido <strong>{ctx.order.orderNumber}</strong> se canceló
      {ctx.order.status === 'cancelled' && !ctx.order.paidAt ? ' porque no recibimos el pago a tiempo' : ''}. Si creés que es un
      error, respondé este email.
    </Text>
  </EmailLayout>
)

export const AdminNewOrderEmail = (ctx: EmailCtx & { reason: 'created' | 'paid' | 'review' }) => {
  const { order } = ctx
  const title =
    ctx.reason === 'paid'
      ? `Pedido pagado: ${order.orderNumber}`
      : ctx.reason === 'review'
        ? `⚠ Revisar pedido ${order.orderNumber}`
        : `Nuevo pedido: ${order.orderNumber}`
  return (
    <EmailLayout {...base(ctx)} preview={title} title={title}>
      <Text>
        {order.firstName} {order.lastName} · {order.email} · {order.phone ?? 's/tel.'}
        <br />
        Pago: {order.paymentMethod === 'transfer' ? 'Transferencia' : 'Mercado Pago'} · Envío: {order.shippingMethod?.label}
        {ctx.reason === 'review' ? (
          <>
            <br />
            Motivo: <strong>{order.needsReview}</strong>
          </>
        ) : null}
      </Text>
      <OrderSummary order={order} />
      <Button
        href={`${ctx.siteUrl}/admin/collections/orders/${order.id}`}
        style={{ backgroundColor: colors.accent, color: '#fff', padding: '12px 20px', borderRadius: '6px', fontSize: '14px', marginTop: '16px' }}
      >
        Abrir en el panel
      </Button>
    </EmailLayout>
  )
}

export const RegretReceivedEmail = (props: { storeName: string; siteUrl: string; code: string; orderNumber: string }) => (
  <EmailLayout storeName={props.storeName} siteUrl={props.siteUrl} preview="Recibimos tu solicitud de arrepentimiento" title="Recibimos tu solicitud">
    <Text>
      Registramos tu solicitud de arrepentimiento para el pedido <strong>{props.orderNumber}</strong>.
    </Text>
    <Text>
      Tu código de identificación es: <strong>{props.code}</strong>
    </Text>
    <Text>Te vamos a contactar para coordinar la devolución y el reintegro.</Text>
  </EmailLayout>
)
