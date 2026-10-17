import { headers } from 'next/headers'
import type { Customer } from '@/payload-types'
import { getPayloadClient } from './catalog'

/** Cliente logueado en la tienda (cookie de Payload), o null. Ignora sesiones del panel admin. */
export const getCurrentCustomer = async (): Promise<Customer | null> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'customers' ? (user as Customer) : null
}
