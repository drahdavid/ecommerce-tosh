import type { Order, StoreSetting } from '@/payload-types'
import { formatMoney, toCents } from '@/lib/money'
import { STATUS_LABELS, type OrderStatus } from '@/lib/orders/stateMachine'
import { cn } from '@/lib/utils'
import { CopyButton } from './CopyButton'

const ars = (n?: number | null) => formatMoney(toCents(n ?? 0))

const STEPS: OrderStatus[] = ['pending_payment', 'paid', 'preparing', 'shipped', 'delivered']

export const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      'inline-flex rounded-full px-3 py-1 text-xs font-medium',
      status === 'pending_payment' && 'bg-amber-100 text-amber-800',
      ['paid', 'preparing'].includes(status) && 'bg-blue-100 text-blue-800',
      ['shipped', 'delivered'].includes(status) && 'bg-green-100 text-green-800',
      ['cancelled', 'refunded'].includes(status) && 'bg-zinc-200 text-zinc-700',
    )}
  >
    {STATUS_LABELS[status as OrderStatus] ?? status}
  </span>
)

export const TransferInstructions = ({ order, settings }: { order: Order; settings: StoreSetting }) => {
  const bank = settings.bank
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-semibold">Datos para la transferencia</h2>
      <p className="mt-1 text-sm text-zinc-700">
        Transferí <strong>{ars(order.totals?.total)}</strong> y envianos el comprobante respondiendo el email de confirmación
        {settings.whatsappNumber ? ' o por WhatsApp' : ''}.
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {[
          ['Banco', bank?.bankName],
          ['Titular', bank?.holder],
          ['CUIT', bank?.cuit],
          ['CBU / CVU', bank?.cbu],
          ['Alias', bank?.alias],
          ['Monto', ars(order.totals?.total)],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 rounded bg-white px-3 py-2">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="flex items-center gap-2 font-medium">
                {v}
                {k === 'CBU / CVU' || k === 'Alias' ? <CopyButton value={String(v)} /> : null}
              </dd>
            </div>
          ))}
      </dl>
      {order.reservationExpiresAt ? (
        <p className="mt-3 text-xs text-zinc-600">
          Reservamos el stock hasta el {new Date(order.reservationExpiresAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' })}.
        </p>
      ) : null}
    </div>
  )
}

export const OrderDetails = ({ order }: { order: Order }) => {
  const currentStep = STEPS.indexOf(order.status as OrderStatus)
  const isClosed = order.status === 'cancelled' || order.status === 'refunded'
  return (
    <div className="space-y-8">
      {!isClosed ? (
        <ol className="grid grid-cols-5 gap-2 text-center text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-2">
              <span className={cn('h-1.5 w-full rounded-full', i <= currentStep ? 'bg-zinc-900' : 'bg-zinc-200')} />
              <span className={i <= currentStep ? 'font-medium' : 'text-zinc-400'}>{STATUS_LABELS[s]}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {order.shipment?.trackingNumber ? (
        <div className="rounded-lg border border-zinc-200 p-5 text-sm">
          <p className="font-semibold">Seguimiento</p>
          <p className="mt-1">
            {order.shipment.carrier ? `${order.shipment.carrier} · ` : ''}N° {order.shipment.trackingNumber}
          </p>
          {order.shipment.trackingUrl ? (
            <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline">
              Seguir mi envío
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200">
        <ul className="divide-y divide-zinc-200">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between gap-4 p-4 text-sm">
              <span>
                {item.qty} × {item.title}
                {item.variantTitle && item.variantTitle !== 'Única' ? <span className="text-zinc-500"> ({item.variantTitle})</span> : null}
              </span>
              <span>{ars(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-zinc-200 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">Subtotal</dt>
            <dd>{ars(order.totals?.subtotal)}</dd>
          </div>
          {order.totals?.couponDiscount ? (
            <div className="flex justify-between">
              <dt className="text-zinc-600">Cupón {order.coupon?.code}</dt>
              <dd>−{ars(order.totals.couponDiscount)}</dd>
            </div>
          ) : null}
          {order.totals?.transferDiscount ? (
            <div className="flex justify-between">
              <dt className="text-zinc-600">Descuento por transferencia</dt>
              <dd>−{ars(order.totals.transferDiscount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-zinc-600">{order.shippingMethod?.label ?? 'Envío'}</dt>
            <dd>{order.totals?.shipping ? ars(order.totals.shipping) : 'Gratis'}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{ars(order.totals?.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold">Contacto</p>
          <p className="mt-1 text-zinc-700">
            {order.firstName} {order.lastName}
            <br />
            {order.email}
            <br />
            {order.phone}
          </p>
        </div>
        <div>
          <p className="font-semibold">Entrega</p>
          {order.shippingAddress?.street ? (
            <p className="mt-1 text-zinc-700">
              {order.shippingAddress.street} {order.shippingAddress.number}
              {order.shippingAddress.floor ? `, ${order.shippingAddress.floor}` : ''}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.province} ({order.shippingAddress.postalCode})
            </p>
          ) : (
            <p className="mt-1 text-zinc-700">{order.shippingMethod?.label}</p>
          )}
        </div>
      </div>
    </div>
  )
}
