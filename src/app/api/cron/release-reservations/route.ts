import config from '@payload-config'
import { getPayload } from 'payload'
import { isAuthorizedCron } from '@/lib/cron'
import { releaseExpiredReservations } from '@/lib/orders/releaseExpired'

export const dynamic = 'force-dynamic'

/** Cada 10 minutos: cancela pedidos impagos con la reserva vencida y devuelve el stock. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const payload = await getPayload({ config })
  const summary = await releaseExpiredReservations(payload)
  return Response.json({ ok: true, ...summary })
}
