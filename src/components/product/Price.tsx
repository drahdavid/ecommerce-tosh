import { formatMoney } from '@/lib/money'
import type { PriceDisplay } from '@/lib/pricing/display'
import { cn } from '@/lib/utils'

/** Precio compacto para tarjetas de listado. */
export const PriceTag = ({ price, fromPrice }: { price: PriceDisplay | null; fromPrice?: boolean }) => {
  if (!price) return <p className="text-sm text-zinc-500">Consultar precio</p>
  return (
    <div className="space-y-0.5">
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-lg font-extrabold tracking-tight">
          {fromPrice ? <span className="text-sm font-semibold">Desde </span> : null}
          {formatMoney(price.priceCents)}
        </span>
        {price.compareAtCents ? <span className="text-xs text-zinc-500 line-through">{formatMoney(price.compareAtCents)}</span> : null}
      </p>
      {price.installments ? (
        <p className="text-xs font-semibold text-brand">
          {price.installments.count} x {formatMoney(price.installments.amountCents)} sin interés
        </p>
      ) : null}
      {price.transferPriceCents ? <p className="text-xs text-zinc-500">{formatMoney(price.transferPriceCents)} con transferencia</p> : null}
    </div>
  )
}

/** Bloque de precio completo para la ficha de producto. */
export const PriceBlock = ({ price, transferDiscountPercent, className }: { price: PriceDisplay | null; transferDiscountPercent: number; className?: string }) => {
  if (!price) {
    return <p className={cn('text-zinc-500', className)}>Precio no disponible en este momento. Escribinos y te lo pasamos.</p>
  }
  const off = price.compareAtCents ? Math.round((1 - price.priceCents / price.compareAtCents) * 100) : 0
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-4xl font-extrabold tracking-tight">{formatMoney(price.priceCents)}</span>
        {price.compareAtCents ? (
          <>
            <span className="text-lg text-zinc-500 line-through">{formatMoney(price.compareAtCents)}</span>
            <span className="rounded-full bg-lime px-2.5 py-0.5 text-sm font-extrabold text-zinc-900">{off}% OFF</span>
          </>
        ) : null}
      </div>
      {price.installments ? (
        <p className="font-semibold text-brand">
          {price.installments.count} cuotas sin interés de {formatMoney(price.installments.amountCents)}
        </p>
      ) : null}
      {price.transferPriceCents ? (
        <p className="text-sm text-zinc-700">
          <strong>{formatMoney(price.transferPriceCents)}</strong> con transferencia ({transferDiscountPercent}% OFF)
        </p>
      ) : null}
      <p className="text-xs text-zinc-500">Precio sin impuestos nacionales: {formatMoney(price.withoutNationalTaxesCents)}</p>
    </div>
  )
}
