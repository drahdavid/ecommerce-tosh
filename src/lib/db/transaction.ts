import type { Payload, PayloadRequest } from 'payload'

/**
 * Corre `fn` dentro de una transacción de Payload. Todo lo que use el `req` que recibe
 * (Local API y SQL vía getExecutor) participa de la misma transacción.
 */
export const withTransaction = async <T>(
  payload: Payload,
  fn: (req: Partial<PayloadRequest>) => Promise<T>,
): Promise<T> => {
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { payload, transactionID }
  try {
    const result = await fn(req)
    if (transactionID) await payload.db.commitTransaction(transactionID)
    return result
  } catch (err) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw err
  }
}
