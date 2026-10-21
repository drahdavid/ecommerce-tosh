'use client'

import Link from 'next/link'
import { Check, Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCart } from '@/components/cart/CartProvider'
import { track } from '@/components/layout/Analytics'
import { Button, buttonVariants } from '@/components/ui/button'
import type { PriceDisplay } from '@/lib/pricing/display'
import { cn } from '@/lib/utils'
import { Gallery, type GalleryImage } from './Gallery'
import { PriceBlock } from './Price'

export type PurchaseVariant = {
  id: number
  options: Record<string, string>
  stock: number
  price: PriceDisplay | null
  sku: string
  imageUrl: string | null
}

type Props = {
  productId: number
  title: string
  options: { name: string; values: string[] }[]
  variants: PurchaseVariant[]
  images: GalleryImage[]
  transferDiscountPercent: number
  children?: React.ReactNode
}

const LOW_STOCK = 3

export const ProductPurchase = ({ productId, title, options, variants, images, transferDiscountPercent, children }: Props) => {
  const { add } = useCart()
  const initial = variants.find((v) => v.stock > 0) ?? variants[0]
  const [selected, setSelected] = useState<Record<string, string>>(initial?.options ?? {})
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const variant = useMemo(
    () => variants.find((v) => options.every((o) => v.options[o.name] === selected[o.name])) ?? (options.length === 0 ? variants[0] : undefined),
    [variants, options, selected],
  )
  const price = variant?.price ?? initial?.price ?? null
  const inStock = Boolean(variant && variant.stock > 0)

  /** Un valor está disponible si existe alguna variante con stock compatible con el resto de la selección. */
  const isAvailable = (name: string, value: string) =>
    variants.some((v) => v.stock > 0 && v.options[name] === value && options.every((o) => o.name === name || !selected[o.name] || v.options[o.name] === selected[o.name]))

  const handleAdd = () => {
    if (!variant || !inStock) return
    add(variant.id, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
    if (price) track('add_to_cart', { value: (price.priceCents * qty) / 100, items: [{ item_id: variant.sku, item_name: title, price: price.priceCents / 100, quantity: qty }] })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <Gallery images={images} activeUrl={variant?.imageUrl} />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-4xl">{title}</h1>
          {variant?.sku ? <p className="mt-1 text-xs text-zinc-400">SKU {variant.sku}</p> : null}
        </div>
        <PriceBlock price={price} transferDiscountPercent={transferDiscountPercent} />

        {options.map((o) => (
          <fieldset key={o.name}>
            <legend className="mb-2 text-sm font-semibold">
              {o.name}: <span className="font-normal text-zinc-600">{selected[o.name] ?? 'Elegí una opción'}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {o.values.map((value) => {
                const active = selected[o.name] === value
                const available = isAvailable(o.name, value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelected((s) => ({ ...s, [o.name]: value }))
                      setQty(1)
                    }}
                    aria-pressed={active}
                    className={cn(
                      'h-11 min-w-12 rounded-full border px-4 text-sm font-semibold transition',
                      active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white hover:border-zinc-900',
                      !available && !active && 'text-zinc-400 line-through',
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}

        <div className="text-sm">
          {!variant ? (
            <p className="text-zinc-600">Elegí las opciones para ver la disponibilidad.</p>
          ) : !inStock ? (
            <p className="font-medium text-red-600">Sin stock</p>
          ) : variant.stock <= LOW_STOCK ? (
            <p className="font-medium text-accent">¡Últimas {variant.stock} unidades!</p>
          ) : (
            <p className="text-success">En stock</p>
          )}
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 bg-white p-4 shadow-[0_-8px_24px_rgb(17_26_22/0.08)] sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <div className="flex h-12 items-center rounded-full border border-zinc-300 bg-white">
            <button className="flex h-full w-10 items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar uno" disabled={!inStock}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">
              {qty}
            </span>
            <button
              className="flex h-full w-10 items-center justify-center"
              onClick={() => setQty((q) => Math.min(variant?.stock ?? 1, q + 1))}
              aria-label="Sumar uno"
              disabled={!inStock}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button size="lg" className="flex-1" onClick={handleAdd} disabled={!inStock}>
            {added ? (
              <>
                <Check className="h-4 w-4" /> Agregado
              </>
            ) : inStock ? (
              'Agregar al carrito'
            ) : (
              'Sin stock'
            )}
          </Button>
        </div>
        {added ? (
          <Link href="/carrito" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Ver carrito y comprar
          </Link>
        ) : null}
        <input type="hidden" name="productId" value={productId} />
        {children}
      </div>
    </div>
  )
}
