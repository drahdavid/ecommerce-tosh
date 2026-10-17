'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/components/cart/CartProvider'

export const CartButton = () => {
  const { count, ready } = useCart()
  return (
    <Link
      href="/carrito"
      className="relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-zinc-100"
      aria-label={`Carrito${ready && count ? `, ${count} productos` : ''}`}
    >
      <ShoppingBag className="h-5 w-5" />
      {ready && count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[11px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  )
}
