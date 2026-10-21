import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/account/LogoutButton'
import { ProfileForm } from '@/components/account/ProfileForm'
import { StatusBadge } from '@/components/order/OrderDetails'
import { getCurrentCustomer } from '@/lib/data/auth'
import { getPayloadClient } from '@/lib/data/catalog'
import { linkGuestOrders } from '@/lib/data/orders'
import { formatMoney, toCents } from '@/lib/money'

export const metadata: Metadata = { title: 'Mi cuenta', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect('/cuenta/ingresar')

  if (customer._verified === true) await linkGuestOrders(customer.id, customer.email)

  const payload = await getPayloadClient()
  const { docs: orders } = await payload.find({
    collection: 'orders',
    where: { customer: { equals: customer.id } },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Hola{customer.firstName ? `, ${customer.firstName}` : ''}</h1>
          <p className="mt-1 text-sm text-zinc-500">{customer.email}</p>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Mis pedidos</h2>
        {orders.length ? (
          <ul className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-3xl bg-white shadow-card">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/pedido/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-zinc-50">
                  <span>
                    <span className="font-medium">{o.orderNumber}</span>
                    <span className="ml-3 text-sm text-zinc-500">{new Date(o.createdAt).toLocaleDateString('es-AR')}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="text-sm">{formatMoney(toCents(o.totals?.total))}</span>
                    <StatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Todavía no hiciste pedidos.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Mis datos y direcciones</h2>
        <ProfileForm
          initial={{
            firstName: customer.firstName ?? '',
            lastName: customer.lastName ?? '',
            phone: customer.phone ?? '',
            dni: customer.dni ?? '',
            marketingOptIn: Boolean(customer.marketingOptIn),
            addresses: (customer.addresses ?? []).map((a) => ({
              label: a.label ?? '',
              street: a.street,
              number: a.number,
              floor: a.floor ?? '',
              city: a.city,
              province: a.province,
              postalCode: a.postalCode,
              isDefault: Boolean(a.isDefault),
            })),
          }}
        />
      </section>

      <section className="mt-12 border-t border-zinc-200 pt-8">
        <h2 className="text-lg font-semibold">Baja</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Podés darte de baja de las novedades desmarcando la opción de arriba, o eliminar tu cuenta.
        </p>
        <Link href="/cuenta/baja" className="mt-3 inline-block text-sm underline">
          Botón de baja: eliminar mi cuenta
        </Link>
      </section>
    </div>
  )
}
