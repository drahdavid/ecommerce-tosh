import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OrderDetails, StatusBadge, TransferInstructions } from '@/components/order/OrderDetails'
import { buttonVariants } from '@/components/ui/button'
import { getSettings } from '@/lib/data/catalog'
import { getOrderForViewer } from '@/lib/data/orders'

export const metadata: Metadata = { title: 'Mi pedido', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Params = Promise<{ orderNumber: string }>
type SearchParams = Promise<{ t?: string; nuevo?: string }>

export default async function OrderPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { orderNumber } = await params
  const { t, nuevo } = await searchParams
  const [order, settings] = await Promise.all([getOrderForViewer(orderNumber, t), getSettings()])
  if (!order) notFound()

  const awaitingTransfer = order.paymentMethod === 'transfer' && order.status === 'pending_payment'
  const canPayMp =
    order.paymentMethod === 'mercadopago' && order.status === 'pending_payment' && order.mp?.initPoint && (!order.reservationExpiresAt || new Date(order.reservationExpiresAt) > new Date())

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {nuevo ? (
        <div className="mb-8 rounded-lg bg-success/10 p-5 text-success">
          <p className="font-semibold">¡Recibimos tu pedido!</p>
          <p className="text-sm">Te enviamos un email con el detalle a {order.email}.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Pedido {order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {new Date(order.createdAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'long', timeStyle: 'short' })}
      </p>
      {awaitingTransfer ? (
        <div className="mt-8">
          <TransferInstructions order={order} settings={settings} />
        </div>
      ) : null}
      {canPayMp ? (
        <a href={order.mp!.initPoint!} className={`${buttonVariants()} mt-8`}>
          Pagar con Mercado Pago
        </a>
      ) : null}
      <div className="mt-10">
        <OrderDetails order={order} />
      </div>
    </div>
  )
}
