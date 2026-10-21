/**
 * IP del visitante. Detrás de Traefik (Coolify) la primera de x-forwarded-for es la del cliente:
 * Traefik descarta los X-Forwarded-* que llegan de IPs que no son de confianza.
 */
export const ipFromHeaders = (headers: Headers): string | null =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || null
