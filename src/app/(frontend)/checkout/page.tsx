import type { Metadata } from 'next'
import { CheckoutForm, type CheckoutDefaults } from '@/components/checkout/CheckoutForm'
import { getCurrentCustomer } from '@/lib/data/auth'

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } }

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer()
  const address = customer?.addresses?.find((a) => a.isDefault) ?? customer?.addresses?.[0]
  const defaults: CheckoutDefaults = {
    email: customer?.email ?? '',
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    phone: customer?.phone ?? '',
    dni: customer?.dni ?? '',
    address: address
      ? { street: address.street, number: address.number, floor: address.floor ?? '', city: address.city, province: address.province, postalCode: address.postalCode, notes: '' }
      : null,
    loggedIn: Boolean(customer),
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Finalizar compra</h1>
      <CheckoutForm defaults={defaults} />
    </div>
  )
}
