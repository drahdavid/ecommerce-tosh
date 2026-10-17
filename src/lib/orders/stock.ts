import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

type QueryResult = { rows: Record<string, unknown>[] }
type Executor = { execute: (query: ReturnType<typeof sql>) => Promise<QueryResult> }

/**
 * Ejecutor Drizzle de la transacción en curso (si `req.transactionID` existe) o del pool.
 * Las operaciones de stock tienen que correr en la MISMA transacción que crea/actualiza la
 * orden, para que un rollback devuelva todo.
 */
export const getExecutor = (payload: Payload, req?: Partial<PayloadRequest>): Executor => {
  const db = payload.db as unknown as {
    drizzle: Executor
    sessions?: Record<string, { db: Executor }>
  }
  const id = req?.transactionID
  const session = typeof id === 'string' || typeof id === 'number' ? db.sessions?.[String(id)] : undefined
  return session?.db ?? db.drizzle
}

export type StockLine = { variantId: string | number; qty: number }

/**
 * Descuenta stock con un UPDATE condicional por variante (`stock >= qty`). Ordena por id para
 * que dos checkouts concurrentes bloqueen filas en el mismo orden y no haya deadlocks.
 * Si alguna variante no alcanza, devuelve su id: el llamador debe hacer rollback.
 */
export const reserveStock = async (
  payload: Payload,
  req: Partial<PayloadRequest>,
  lines: StockLine[],
): Promise<{ ok: true } | { ok: false; variantId: string }> => {
  const db = getExecutor(payload, req)
  const sorted = [...lines].sort((a, b) => Number(a.variantId) - Number(b.variantId))
  for (const { variantId, qty } of sorted) {
    const res = await db.execute(
      sql`UPDATE variants SET stock = stock - ${qty}, updated_at = now()
          WHERE id = ${Number(variantId)} AND active = true AND stock >= ${qty}
          RETURNING id`,
    )
    if (res.rows.length === 0) return { ok: false, variantId: String(variantId) }
  }
  safeRevalidate(TAGS.products)
  return { ok: true }
}

const restoreStock = async (db: Executor, lines: StockLine[]) => {
  const sorted = [...lines].sort((a, b) => Number(a.variantId) - Number(b.variantId))
  for (const { variantId, qty } of sorted) {
    await db.execute(
      sql`UPDATE variants SET stock = stock + ${qty}, updated_at = now() WHERE id = ${Number(variantId)}`,
    )
  }
}

/**
 * Devuelve el stock de una orden UNA sola vez: el flag `stock_released` se marca con un
 * UPDATE condicional, así dos procesos concurrentes (cron + admin) no reponen dos veces.
 */
export const releaseOrderStock = async (
  payload: Payload,
  req: Partial<PayloadRequest>,
  orderId: string | number,
  lines: StockLine[],
): Promise<boolean> => {
  const db = getExecutor(payload, req)
  const claimed = await db.execute(
    sql`UPDATE orders SET stock_released = true WHERE id = ${Number(orderId)} AND stock_released = false RETURNING id`,
  )
  if (claimed.rows.length === 0) return false
  await restoreStock(db, lines)
  safeRevalidate(TAGS.products)
  return true
}

/**
 * Para un pago aprobado que llega después de que la orden se canceló (y su stock se devolvió):
 * intenta volver a reservar. Si no hay stock, la orden queda marcada como sobreventa.
 */
export const reclaimOrderStock = async (
  payload: Payload,
  req: Partial<PayloadRequest>,
  orderId: string | number,
  lines: StockLine[],
): Promise<boolean> => {
  const db = getExecutor(payload, req)
  const reserved = await reserveStock(payload, req, lines)
  if (!reserved.ok) return false
  await db.execute(sql`UPDATE orders SET stock_released = false WHERE id = ${Number(orderId)}`)
  return true
}

/** Incrementa el uso del cupón solo si no superó el límite. */
export const consumeCoupon = async (
  payload: Payload,
  req: Partial<PayloadRequest>,
  code: string,
): Promise<boolean> => {
  const db = getExecutor(payload, req)
  const res = await db.execute(
    sql`UPDATE coupons SET usage_count = coalesce(usage_count, 0) + 1
        WHERE upper(code) = ${code.toUpperCase()} AND active = true
          AND (usage_limit IS NULL OR coalesce(usage_count, 0) < usage_limit)
        RETURNING id`,
  )
  return res.rows.length > 0
}

/** Devuelve el uso del cupón de una orden cancelada (una sola vez). */
export const releaseOrderCoupon = async (
  payload: Payload,
  req: Partial<PayloadRequest>,
  orderId: string | number,
  code: string,
): Promise<void> => {
  const db = getExecutor(payload, req)
  const claimed = await db.execute(
    sql`UPDATE orders SET coupon_released = true WHERE id = ${Number(orderId)} AND coupon_released = false RETURNING id`,
  )
  if (claimed.rows.length === 0) return
  await db.execute(
    sql`UPDATE coupons SET usage_count = greatest(coalesce(usage_count, 0) - 1, 0) WHERE upper(code) = ${code.toUpperCase()}`,
  )
}

/** Número de pedido legible derivado del id autoincremental: id 1 → TOSH-001001. */
export const formatOrderNumber = (id: number | string) =>
  `${process.env.ORDER_NUMBER_PREFIX || 'TOSH'}-${String(Number(id) + 1000).padStart(6, '0')}`

/**
 * Asigna el número de pedido dentro de la transacción de creación. Se deriva del id (que
 * administra el esquema) en vez de una secuencia propia: el push de esquema de desarrollo
 * borra objetos que no conoce, y una secuencia recreada repetiría números.
 */
export const assignOrderNumber = async (payload: Payload, req: Partial<PayloadRequest>, orderId: number | string): Promise<string> => {
  const orderNumber = formatOrderNumber(orderId)
  await getExecutor(payload, req).execute(sql`UPDATE orders SET order_number = ${orderNumber} WHERE id = ${Number(orderId)}`)
  return orderNumber
}
