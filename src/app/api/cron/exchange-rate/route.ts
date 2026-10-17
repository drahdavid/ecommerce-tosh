import config from '@payload-config'
import { getPayload } from 'payload'
import { isAuthorizedCron } from '@/lib/cron'
import { refreshExchangeRate } from '@/lib/exchange-rate'

export const dynamic = 'force-dynamic'

/** Cada hora: actualiza el dólar oficial BNA desde DolarAPI. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const payload = await getPayload({ config })
  const result = await refreshExchangeRate(payload)
  if (!result.ok) payload.logger.warn({ msg: `Cotización no actualizada: ${result.message}` })
  return Response.json(result, { status: result.ok ? 200 : 502 })
}
