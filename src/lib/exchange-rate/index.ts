import type { Payload } from 'payload'
import type { ExchangeRate } from '@/payload-types'
import type { RateSnapshot } from '@/lib/pricing/types'

const DEFAULT_URL = 'https://dolarapi.com/v1/dolares/oficial'

type DolarApiResponse = {
  compra: number
  venta: number
  casa: string
  nombre: string
  moneda: string
  fechaActualizacion: string
}

export const fetchDolarOficial = async (): Promise<DolarApiResponse> => {
  const res = await fetch(process.env.DOLARAPI_URL || DEFAULT_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`DolarAPI respondió ${res.status}`)
  const json = (await res.json()) as DolarApiResponse
  if (!(json.venta > 0)) throw new Error('DolarAPI devolvió una cotización inválida')
  return json
}

/**
 * Consulta DolarAPI y actualiza el global. Rechaza saltos mayores a `maxDeltaPercent`
 * respecto de la última cotización aceptada (protección ante datos erróneos de la fuente).
 */
export const refreshExchangeRate = async (payload: Payload): Promise<{ ok: boolean; message: string }> => {
  const current = await payload.findGlobal({ slug: 'exchange-rate', depth: 0, overrideAccess: true })
  let data: DolarApiResponse
  try {
    data = await fetchDolarOficial()
  } catch (err) {
    const message = (err as Error).message
    await payload.updateGlobal({ slug: 'exchange-rate', data: { lastError: `${new Date().toISOString()}: ${message}` }, overrideAccess: true })
    return { ok: false, message }
  }

  const previous = current.autoSell
  const maxDelta = current.maxDeltaPercent ?? 15
  const deltaPercent = previous ? (Math.abs(data.venta - previous) / previous) * 100 : 0
  const accepted = deltaPercent <= maxDelta

  await payload.create({
    collection: 'exchange-rate-history',
    data: {
      sell: data.venta,
      buy: data.compra,
      source: 'dolarapi-oficial',
      apiUpdatedAt: data.fechaActualizacion,
      accepted,
      note: accepted ? undefined : `Rechazada: variación ${deltaPercent.toFixed(1)}% > ${maxDelta}%`,
    },
    overrideAccess: true,
  })

  if (!accepted) {
    const message = `Cotización rechazada: ${data.venta} vs ${previous} (${deltaPercent.toFixed(1)}%). Revisá y, si es correcta, cargala en modo manual.`
    await payload.updateGlobal({ slug: 'exchange-rate', data: { lastError: message }, overrideAccess: true })
    return { ok: false, message }
  }

  await payload.updateGlobal({
    slug: 'exchange-rate',
    data: {
      autoSell: data.venta,
      autoBuy: data.compra,
      apiUpdatedAt: data.fechaActualizacion,
      checkedAt: new Date().toISOString(),
      lastError: null,
    },
    overrideAccess: true,
  })
  return { ok: true, message: `Venta ${data.venta}` }
}

const isStale = (g: ExchangeRate, now = Date.now()) =>
  !g.checkedAt || now - new Date(g.checkedAt).getTime() > (g.maxStalenessHours ?? 6) * 3_600_000

export const toSnapshot = (g: ExchangeRate): RateSnapshot | null => {
  if (g.mode === 'manual' && g.manualRate) {
    return { rate: g.manualRate, source: 'manual', fetchedAt: g.updatedAt ?? new Date().toISOString() }
  }
  if (g.mode === 'auto' && g.autoSell && !isStale(g)) {
    return { rate: g.autoSell, source: 'dolarapi-oficial', fetchedAt: g.checkedAt! }
  }
  return null
}

/** Entre reintentos disparados por cotizaciones de carrito (el cron horario no se limita). */
export const REFRESH_RETRY_MS = 5 * 60_000

let lastRefreshAttempt = 0

/** Solo para tests. */
export const resetRefreshThrottle = () => {
  lastRefreshAttempt = 0
}

/**
 * Cotización vigente para cobrar. Si el modo es automático y está vencida (el cron falló),
 * intenta actualizarla en el momento, como mucho una vez cada REFRESH_RETRY_MS: cada intento
 * consulta DolarAPI, escribe en la base e invalida la cache de productos, y lo puede disparar
 * cualquier visitante cotizando el carrito. Devuelve null si no hay una cotización confiable:
 * en ese caso los productos en USD no se pueden vender hasta que se resuelva.
 */
export const getEffectiveRate = async (payload: Payload, opts: { refreshIfStale?: boolean } = {}, now = Date.now()) => {
  let g = await payload.findGlobal({ slug: 'exchange-rate', depth: 0, overrideAccess: true })
  if (g.mode === 'auto' && isStale(g) && opts.refreshIfStale && now - lastRefreshAttempt >= REFRESH_RETRY_MS) {
    lastRefreshAttempt = now
    await refreshExchangeRate(payload)
    g = await payload.findGlobal({ slug: 'exchange-rate', depth: 0, overrideAccess: true })
  }
  return toSnapshot(g)
}
