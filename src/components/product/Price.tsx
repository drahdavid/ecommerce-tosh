import { formatMoney } from '@/lib/money'
import type { PriceDisplay } from '@/lib/pricing/display'
import { cn } from '@/lib/utils'

/** Precio compacto para tarjetas de listado. */
export const PriceTag = ({ price, fromPrice }: { price: PriceDisplay | null; fromPrice?: boolean }) => {
  if (!price) return <p className="text-sm text-zinc-500">Consultar precio</p>
  return (
    <div className="space-y-0.5">
      <p className="flex items-baseline gap-2">
        <span className="text-base font-semibold">
          {fromPrice ? 'Desde ' : ''}
          {formatMoney(price.priceCents)}
        </span>
        {price.compareAtCents ? <span className="text-xs text-zinc-400 line-through">{formatMoney(price.compareAtCents)}</span> : null}
      </p>
      {price.installments ? (
        <p className="text-xs text-success">
          {price.installments.count} cuotas sin interés de {formatMoney(price.installments.amountCents)}
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
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold tracking-tight">{formatMoney(price.priceCents)}</span>
        {price.compareAtCents ? (
          <>
            <span className="text-lg text-zinc-400 line-through">{formatMoney(price.compareAtCents)}</span>
            <span className="rounded bg-accent/10 px-2 py-0.5 text-sm font-semibold text-accent">{off}% OFF</span>
          </>
        ) : null}
      </div>
      {price.installments ? (
        <p className="font-medium text-success">
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
