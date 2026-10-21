type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Más allá de esto se purgan las ventanas vencidas (evita que el mapa crezca sin límite). */
const MAX_KEYS = 10_000

/**
 * Límite por ventana fija, en memoria. Alcanza porque la tienda corre en un solo contenedor;
 * con varias instancias cada una contaría por separado.
 * Devuelve true si la acción está permitida (y la cuenta), false si se pasó del límite.
 */
export const rateLimit = (key: string, limit: number, windowMs: number, now = Date.now()): boolean => {
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

type DistinctBucket = { values: Set<string>; resetAt: number }

const distinct = new Map<string, DistinctBucket>()

/**
 * Límite de valores DISTINTOS por ventana (ej. códigos de cupón probados por IP): repetir un
 * valor ya contado no suma. Devuelve false si el valor es nuevo y ya se llegó al límite.
 */
export const rateLimitDistinct = (key: string, value: string, limit: number, windowMs: number, now = Date.now()): boolean => {
  if (distinct.size > MAX_KEYS) {
    for (const [k, b] of distinct) if (b.resetAt <= now) distinct.delete(k)
  }
  let bucket = distinct.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { values: new Set(), resetAt: now + windowMs }
    distinct.set(key, bucket)
  }
  if (bucket.values.has(value)) return true
  if (bucket.values.size >= limit) return false
  bucket.values.add(value)
  return true
}

/** Solo para tests. */
export const resetRateLimits = () => {
  buckets.clear()
  distinct.clear()
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
