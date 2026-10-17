import type { Metadata } from 'next'
import { CartView } from '@/components/cart/CartView'

export const metadata: Metadata = { title: 'Carrito', robots: { index: false } }

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Carrito</h1>
      <CartView />
    </div>
  )
}
