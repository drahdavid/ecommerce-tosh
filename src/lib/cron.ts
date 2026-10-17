/** Vercel Cron envía `Authorization: Bearer ${CRON_SECRET}`. */
export const isAuthorizedCron = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return request.headers.get('authorization') === `Bearer ${secret}`
}
