import { timingSafeEqual } from 'node:crypto'

/** Los crons (Coolify / Vercel Cron) envían `Authorization: Bearer ${CRON_SECRET}`. */
export const isAuthorizedCron = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const got = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return got.length === expected.length && timingSafeEqual(got, expected)
}
