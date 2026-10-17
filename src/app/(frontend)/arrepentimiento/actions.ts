'use server'

import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { RegretReceivedEmail } from '@/emails/templates'
import { getPayloadClient } from '@/lib/data/catalog'
import { sendEmail, siteUrl } from '@/lib/email/send'

const schema = z.object({
  orderNumber: z.string().trim().min(3, 'Ingresá el número de pedido').max(30),
  email: z.email('Email inválido'),
  name: z.string().trim().min(2, 'Ingresá tu nombre').max(120),
  phone: z.string().trim().max(30).optional(),
  reason: z.string().trim().max(1000).optional(),
})

export type RegretResult = { ok: true; code: string } | { ok: false; error: string }

/**
 * Registra la solicitud y entrega el código de identificación en el momento (la norma pide
 * hacerlo dentro de las 24 h). No exige registrarse ni que el pedido exista en el sistema.
 */
export async function submitRegretAction(input: unknown): Promise<RegretResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const data = parsed.data
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ orderNumber: { equals: data.orderNumber.toUpperCase() } }, { email: { equals: data.email.toLowerCase() } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const code = `ARR-${randomBytes(4).toString('hex').toUpperCase()}`
  await payload.create({
    collection: 'regret-requests',
    data: { ...data, orderNumber: data.orderNumber.toUpperCase(), email: data.email.toLowerCase(), code, order: docs[0]?.id },
    overrideAccess: true,
  })

  const settings = await payload.findGlobal({ slug: 'store-settings', depth: 0, overrideAccess: true })
  const storeName = settings.storeName || 'Tienda'
  await sendEmail(payload, data.email, `Solicitud de arrepentimiento ${code}`, RegretReceivedEmail({ storeName, siteUrl: siteUrl(), code, orderNumber: data.orderNumber }))
  await sendEmail(payload, settings.adminNotificationEmails ?? [], `Arrepentimiento ${code} — pedido ${data.orderNumber}`, RegretReceivedEmail({ storeName, siteUrl: siteUrl(), code, orderNumber: data.orderNumber }))
  return { ok: true, code }
}
