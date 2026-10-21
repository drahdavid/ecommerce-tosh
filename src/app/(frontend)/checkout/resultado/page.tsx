import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { AutoRefresh } from '@/components/order/AutoRefresh'
import { OrderDetails } from '@/components/order/OrderDetails'
import { PurchaseTracker } from '@/components/order/PurchaseTracker'
import { buttonVariants } from '@/components/ui/button'
import { getPayloadClient } from '@/lib/data/catalog'
import { getOrderForViewer } from '@/lib/data/orders'
import { isMercadoPagoConfigured } from '@/lib/payments/mercadopago/client'
import { processPayment } from '@/lib/payments/mercadopago/processPayment'

export const metadata: Metadata = { title: 'Estado de tu pago', robots: { index: false } }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ order?: string; t?: string; payment_id?: string; collection_id?: string; status?: string }>

export default async function CheckoutResultPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  if (!sp.order) notFound()
  let order = await getOrderForViewer(sp.order, sp.t)
  if (!order) notFound()

  // Acelera la confirmación sin esperar al webhook. El estado se consulta a la API de MP:
  // el `status` del query string no se usa para nada.
  const paymentId = sp.payment_id ?? sp.collection_id
  if (order.status === 'pending_payment' && paymentId && /^\d+$/.test(paymentId) && isMercadoPagoConfigured()) {
    const payload = await getPayloadClient()
    await processPayment(payload, paymentId, 'return').catch((err) => payload.logger.error({ err, msg: 'Error procesando retorno de MP' }))
    order = (await getOrderForViewer(sp.order, sp.t)) ?? order
  }

  const paid = ['paid', 'preparing', 'shipped', 'delivered'].includes(order.status)
  const failed = order.mp?.status === 'rejected' || order.mp?.status === 'cancelled'
  const canRetry = order.status === 'pending_payment' && order.mp?.initPoint && (!order.reservationExpiresAt || new Date(order.reservationExpiresAt) > new Date())

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col items-center text-center">
        {paid ? (
          <CheckCircle2 className="h-14 w-14 text-success" />
        ) : failed || order.status === 'cancelled' ? (
          <XCircle className="h-14 w-14 text-red-500" />
        ) : (
          <Clock className="h-14 w-14 text-amber-500" />
        )}
        <h1 className="mt-4 text-2xl font-extrabold">
          {paid
            ? '¡Gracias por tu compra!'
            : order.status === 'cancelled'
              ? 'El pedido fue cancelado'
              : failed
                ? 'El pago no se pudo completar'
                : order.mp?.status === 'in_process' || order.mp?.status === 'pending'
                  ? 'Tu pago está en revisión'
                  : 'Estamos esperando tu pago'}
        </h1>
        <p className="mt-2 text-zinc-600">
          Pedido <strong>{order.orderNumber}</strong>
          {paid ? '. Te enviamos la confirmación por email.' : ''}
        </p>
        {failed && order.mp?.statusDetail ? <p className="mt-1 text-sm text-zinc-500">Motivo: {order.mp.statusDetail}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {canRetry ? (
            <a href={order.mp!.initPoint!} className={buttonVariants()}>
              {failed ? 'Reintentar el pago' : 'Ir a pagar'}
            </a>
          ) : null}
          <Link href={`/pedido/${order.orderNumber}`} className={buttonVariants({ variant: 'outline' })}>
            Ver mi pedido
          </Link>
        </div>
        {order.status === 'pending_payment' && !failed ? (
          <div className="mt-4">
            <AutoRefresh />
          </div>
        ) : null}
      </div>
      <div className="mt-12">
        <OrderDetails order={order} />
      </div>
      {paid ? (
        <PurchaseTracker
          orderNumber={order.orderNumber!}
          value={order.totals?.total ?? 0}
          items={(order.items ?? []).map((i) => ({ item_id: i.sku ?? '', item_name: i.title ?? '', price: i.unitPrice ?? 0, quantity: i.qty ?? 1 }))}
        />
      ) : null}
    </div>
  )
}
