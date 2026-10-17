import type { Metadata } from 'next'
import Link from 'next/link'
import { DeleteAccount } from '@/components/account/DeleteAccount'
import { getCurrentCustomer } from '@/lib/data/auth'
import { getSettings } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Botón de baja' }
export const dynamic = 'force-dynamic'

/** Botón de baja (Res. SC 316/2024): la baja tiene que ser tan simple como el alta. */
export default async function UnsubscribePage() {
  const [customer, settings] = await Promise.all([getCurrentCustomer(), getSettings()])
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Botón de baja</h1>
      {customer ? (
        <>
          <p className="mt-4 text-zinc-700">
            Vas a eliminar la cuenta <strong>{customer.email}</strong>. Dejás de recibir comunicaciones y se borran tus datos de perfil y
            direcciones. Los comprobantes de compras anteriores se conservan por obligaciones fiscales.
          </p>
          <DeleteAccount />
        </>
      ) : (
        <div className="mt-4 space-y-3 text-zinc-700">
          <p>
            Para eliminar tu cuenta,{' '}
            <Link href="/cuenta/ingresar?next=/cuenta/baja" className="underline">
              ingresá
            </Link>{' '}
            y volvé a esta página.
          </p>
          <p>
            Si querés dejar de recibir emails o no tenés acceso a tu cuenta, escribinos
            {settings.contactEmail ? (
              <>
                {' '}a <a href={`mailto:${settings.contactEmail}?subject=Baja`} className="underline">{settings.contactEmail}</a>
              </>
            ) : null}{' '}
            con el asunto “Baja” y la procesamos.
          </p>
        </div>
      )}
    </div>
  )
}
