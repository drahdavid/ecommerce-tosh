'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getCurrentCustomer } from '@/lib/data/auth'
import { getPayloadClient } from '@/lib/data/catalog'
import { PROVINCES } from '@/lib/shipping/types'

const addressSchema = z.object({
  label: z.string().trim().max(40).optional().nullable(),
  street: z.string().trim().min(1, 'Ingresá la calle').max(120),
  number: z.string().trim().min(1, 'Ingresá la altura').max(20),
  floor: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().min(1, 'Ingresá la localidad').max(120),
  province: z.enum(PROVINCES, 'Elegí la provincia'),
  postalCode: z.string().trim().min(4).max(8),
  isDefault: z.boolean().optional(),
})

const profileSchema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  phone: z.string().trim().max(30),
  dni: z.string().trim().max(13),
  marketingOptIn: z.boolean(),
  addresses: z.array(addressSchema).max(10),
})

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const customer = await getCurrentCustomer()
  if (!customer) return { ok: false, error: 'Tu sesión venció. Ingresá de nuevo.' }
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const data = parsed.data
  // Una sola dirección predeterminada.
  let seenDefault = false
  data.addresses = data.addresses.map((a) => {
    const isDefault = Boolean(a.isDefault) && !seenDefault
    if (isDefault) seenDefault = true
    return { ...a, isDefault }
  })
  const payload = await getPayloadClient()
  await payload.update({ collection: 'customers', id: customer.id, data, overrideAccess: true })
  return { ok: true }
}

/** Botón de baja: elimina la cuenta. Los pedidos se conservan (obligación legal/fiscal) desvinculados. */
export async function deleteAccountAction(): Promise<ActionResult> {
  const customer = await getCurrentCustomer()
  if (!customer) return { ok: false, error: 'Tu sesión venció. Ingresá de nuevo.' }
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'orders',
    where: { customer: { equals: customer.id } },
    data: { customer: null },
    overrideAccess: true,
    context: { skipEmails: true },
  })
  await payload.delete({ collection: 'customers', id: customer.id, overrideAccess: true })
  ;(await cookies()).delete('payload-token')
  redirect('/?baja=1')
}
