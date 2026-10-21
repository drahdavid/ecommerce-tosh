import type { Payload } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isAuthorizedCron } from '@/lib/cron'
import { getEffectiveRate, REFRESH_RETRY_MS, resetRefreshThrottle } from '@/lib/exchange-rate'
import { rateLimit, rateLimitDistinct, resetRateLimits } from '@/lib/rateLimit'
import { safeNextPath } from '@/lib/utils'

describe('rateLimit', () => {
  beforeEach(() => resetRateLimits())

  it('permite hasta el límite por ventana y vuelve a permitir cuando vence', () => {
    const t = 1_000_000
    expect([1, 2, 3].map(() => rateLimit('k', 3, 1000, t))).toEqual([true, true, true])
    expect(rateLimit('k', 3, 1000, t + 999)).toBe(false)
    expect(rateLimit('otra', 3, 1000, t)).toBe(true)
    expect(rateLimit('k', 3, 1000, t + 1000)).toBe(true)
  })

  it('rateLimitDistinct cuenta valores distintos: repetir uno ya contado no suma', () => {
    const t = 1_000_000
    expect(rateLimitDistinct('ip', 'A', 2, 1000, t)).toBe(true)
    expect(rateLimitDistinct('ip', 'A', 2, 1000, t)).toBe(true)
    expect(rateLimitDistinct('ip', 'B', 2, 1000, t)).toBe(true)
    expect(rateLimitDistinct('ip', 'C', 2, 1000, t)).toBe(false)
    // Un valor rechazado sigue rechazado (no queda "contado" por haberlo intentado).
    expect(rateLimitDistinct('ip', 'C', 2, 1000, t)).toBe(false)
    expect(rateLimitDistinct('ip', 'A', 2, 1000, t)).toBe(true)
    expect(rateLimitDistinct('ip', 'C', 2, 1000, t + 1000)).toBe(true)
  })
})

describe('safeNextPath', () => {
  it('acepta rutas propias', () => {
    expect(safeNextPath('/checkout')).toBe('/checkout')
    expect(safeNextPath('/cuenta/baja?x=1')).toBe('/cuenta/baja?x=1')
  })

  it('rechaza destinos que el navegador resuelve como otro dominio', () => {
    for (const next of ['//evil.com', '/\\evil.com', '/\\/evil.com', 'https://evil.com', 'evil.com', '/ /evil.com', '', undefined, null]) {
      expect(safeNextPath(next)).toBe('/cuenta')
    }
  })
})

describe('isAuthorizedCron', () => {
  const req = (auth?: string) => new Request('http://x/api/cron', { headers: auth ? { authorization: auth } : {} })
  afterEach(() => vi.unstubAllEnvs())

  it('exige el Bearer exacto', () => {
    vi.stubEnv('CRON_SECRET', 'secreto')
    expect(isAuthorizedCron(req('Bearer secreto'))).toBe(true)
    expect(isAuthorizedCron(req('Bearer secret'))).toBe(false)
    expect(isAuthorizedCron(req('Bearer secretoo'))).toBe(false)
    expect(isAuthorizedCron(req())).toBe(false)
  })

  it('sin secreto configurado, en producción rechaza todo', () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isAuthorizedCron(req('Bearer '))).toBe(false)
  })
})

describe('getEffectiveRate', () => {
  const stale = { mode: 'auto', autoSell: 1000, checkedAt: '2020-01-01T00:00:00Z', maxStalenessHours: 6, maxDeltaPercent: 15 }
  const fakePayload = () =>
    ({
      findGlobal: vi.fn(async () => stale),
      updateGlobal: vi.fn(async () => stale),
      create: vi.fn(async () => ({})),
    }) as unknown as Payload

  beforeEach(() => {
    resetRefreshThrottle()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('error', { status: 500 })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('con la cotización vencida reintenta DolarAPI como mucho una vez por ventana', async () => {
    const payload = fakePayload()
    const t = 10_000_000
    expect(await getEffectiveRate(payload, { refreshIfStale: true }, t)).toBeNull()
    await getEffectiveRate(payload, { refreshIfStale: true }, t + 1000)
    await getEffectiveRate(payload, { refreshIfStale: true }, t + REFRESH_RETRY_MS - 1)
    expect(fetch).toHaveBeenCalledTimes(1)
    await getEffectiveRate(payload, { refreshIfStale: true }, t + REFRESH_RETRY_MS)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
