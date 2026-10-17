'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { formatMoney } from '@/lib/money'
import { useCart } from './CartProvider'
import { Totals } from './Totals'
import { useQuote } from './useQuote'

const CouponForm = ({ current, onApply }: { current: string | null; onApply: (code: string | null) => void }) => {
  const [value, setValue] = useState(current ?? '')
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onApply(value.trim() || null)
      }}
    >
      <label htmlFor="coupon" className="sr-only">
        Cupón de descuento
      </label>
      <Input id="coupon" placeholder="Cupón de descuento" value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} />
      <Button variant="outline" type="submit">
        Aplicar
      </Button>
    </form>
  )
}

export const CartView = () => {
  const { lines, ready, setQty, remove, couponCode, setCouponCode } = useCart()
  const { data, error, loading } = useQuote(ready && lines.length ? { lines, couponCode, withShipping: false } : null)

  // Saca del carrito variantes que ya no existen (sincroniza con un sistema externo: el store).
  useEffect(() => {
    if (!data) return
    for (const issue of data.quote.issues) if (issue.type === 'not_found') remove(issue.variantId)
  }, [data, remove])

  if (!ready) return <div className="mt-10 h-40 animate-pulse rounded-lg bg-zinc-100" />

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-600">Tu carrito está vacío.</p>
        <Link href="/productos" className={`${buttonVariants()} mt-6`}>
          Ver productos
        </Link>
      </div>
    )
  }

  const quote = data?.quote
  const couponIssue = quote?.issues.find((i) => i.type === 'coupon_invalid')
  const blocking = quote?.issues.filter((i) => i.type !== 'coupon_invalid') ?? []

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y divide-zinc-200 border-y border-zinc-200">
        {lines.map((line) => {
          const q = quote?.lines.find((l) => l.variantId === line.variantId)
          const stockIssue = quote?.issues.find((i) => i.type === 'insufficient_stock' && i.variantId === line.variantId)
          return (
            <li key={line.variantId} className="flex gap-4 py-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                {q?.imageUrl ? <Image src={q.imageUrl} alt={q.productTitle} fill sizes="96px" className="object-cover" /> : null}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-4">
                  <div>
                    {q ? (
                      <Link href={`/productos/${q.productSlug}`} className="font-medium hover:underline">
                        {q.productTitle}
                      </Link>
                    ) : (
                      <span className="inline-block h-4 w-40 animate-pulse rounded bg-zinc-100" />
                    )}
                    {q && q.variantTitle !== 'Única' ? <p className="text-sm text-zinc-500">{q.variantTitle}</p> : null}
                  </div>
                  <p className="font-medium">{q ? formatMoney(q.lineTotalCents) : ''}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 items-center rounded-md border border-zinc-300">
                    <button className="flex h-full w-9 items-center justify-center" onClick={() => setQty(line.variantId, line.qty - 1)} aria-label="Restar uno">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm">{line.qty}</span>
                    <button
                      className="flex h-full w-9 items-center justify-center disabled:opacity-40"
                      onClick={() => setQty(line.variantId, line.qty + 1)}
                      disabled={q ? line.qty >= q.stock : false}
                      aria-label="Sumar uno"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button onClick={() => remove(line.variantId)} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
                    <Trash2 className="h-4 w-4" /> Quitar
                  </button>
                </div>
                {stockIssue && stockIssue.type === 'insufficient_stock' ? (
                  <p className="text-sm text-red-600">
                    {stockIssue.available > 0 ? (
                      <>
                        Solo quedan {stockIssue.available}.{' '}
                        <button className="underline" onClick={() => setQty(line.variantId, stockIssue.available)}>
                          Ajustar
                        </button>
                      </>
                    ) : (
                      'Sin stock: quitalo para continuar.'
                    )}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <aside className="h-fit space-y-6 rounded-lg border border-zinc-200 p-6">
        <CouponForm key={couponCode ?? ''} current={couponCode} onApply={setCouponCode} />
        {couponCode ? (
          <p className="-mt-3 text-sm">
            {couponIssue && couponIssue.type === 'coupon_invalid' ? (
              <span className="text-red-600">{couponIssue.reason}. </span>
            ) : quote?.coupon ? (
              <span className="text-success">Cupón {quote.coupon.code} aplicado. </span>
            ) : null}
            <button className="underline" onClick={() => setCouponCode(null)}>
              Quitar
            </button>
          </p>
        ) : null}

        {quote ? (
          <>
            <Totals quote={quote} showShipping={false} />
            {quote.freeShippingRemainingCents ? (
              <p className="rounded-md bg-zinc-50 p-3 text-sm">
                Te faltan <strong>{formatMoney(quote.freeShippingRemainingCents)}</strong> para el envío gratis.
              </p>
            ) : quote.freeShippingRemainingCents === 0 ? (
              <p className="rounded-md bg-success/10 p-3 text-sm text-success">¡Tenés envío gratis!</p>
            ) : null}
          </>
        ) : (
          <div className="h-32 animate-pulse rounded bg-zinc-100" />
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {blocking.length && data?.message ? <p className="text-sm text-red-600">{data.message}</p> : null}
        <Link
          href="/checkout"
          aria-disabled={loading || blocking.length > 0}
          className={`${buttonVariants({ size: 'lg' })} w-full ${loading || blocking.length ? 'pointer-events-none opacity-50' : ''}`}
        >
          Iniciar compra
        </Link>
        <p className="text-center text-xs text-zinc-500">El costo de envío se calcula en el próximo paso.</p>
      </aside>
    </div>
  )
}
