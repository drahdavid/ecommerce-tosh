import { APIError, type CollectionBeforeOperationHook } from 'payload'
import { ipFromHeaders } from '@/lib/clientIp'
import { HOUR, MINUTE, rateLimit } from '@/lib/rateLimit'

export const MIN_PASSWORD_LENGTH = 8

type Limit = { limit: number; windowMs: number }

/** Intentos por IP. Complementa el bloqueo por cuenta de Payload (5 intentos fallidos). */
const LIMITS: Partial<Record<string, Limit>> = {
  login: { limit: 10, windowMs: 10 * MINUTE },
  forgotPassword: { limit: 5, windowMs: 10 * MINUTE },
  // Registro público (solo customers: los users los crea un admin).
  create: { limit: 5, windowMs: HOUR },
}

const passwordOf = (args: unknown): unknown => (args as { data?: { password?: unknown } }).data?.password

/**
 * Para las colecciones con login. Solo actúa sobre pedidos de afuera (REST/GraphQL o Local API
 * sin `overrideAccess`): el código del servidor, el seed y los tests no pasan por acá.
 */
const beforeOperation: CollectionBeforeOperationHook = ({ args, operation, overrideAccess, req, collection }) => {
  if (overrideAccess === true) return args

  const limit = LIMITS[operation]
  const ip = ipFromHeaders(req.headers)
  if (limit && ip && (operation !== 'create' || collection.slug === 'customers')) {
    if (!rateLimit(`${collection.slug}:${operation}:${ip}`, limit.limit, limit.windowMs)) {
      throw new APIError('Demasiados intentos. Probá de nuevo en unos minutos.', 429, null, true)
    }
  }

  if (operation === 'create' || operation === 'update' || operation === 'resetPassword') {
    const password = passwordOf(args)
    if (typeof password === 'string' && password.length < MIN_PASSWORD_LENGTH) {
      throw new APIError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`, 400, null, true)
    }
  }
  return args
}

export const authHardening = {
  // Payload emite la cookie de sesión sin `Secure` por defecto.
  cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' as const },
  beforeOperation,
}
