import { formatMoney } from '@/lib/money'
import type { CartQuote } from '@/lib/pricing/types'

export const Totals = ({ quote, showShipping }: { quote: CartQuote; showShipping: boolean }) => (
  <dl className="space-y-2 text-sm">
    <div className="flex justify-between">
      <dt className="text-zinc-600">Subtotal</dt>
      <dd>{formatMoney(quote.subtotalCents)}</dd>
    </div>
    {quote.couponDiscountCents ? (
      <div className="flex justify-between text-success">
        <dt>Cupón {quote.coupon?.code}</dt>
        <dd>−{formatMoney(quote.couponDiscountCents)}</dd>
      </div>
    ) : null}
    {quote.transferDiscountCents ? (
      <div className="flex justify-between text-success">
        <dt>Descuento por transferencia</dt>
        <dd>−{formatMoney(quote.transferDiscountCents)}</dd>
      </div>
    ) : null}
    {showShipping ? (
      <div className="flex justify-between">
        <dt className="text-zinc-600">Envío</dt>
        <dd>{quote.shipping ? (quote.shippingCents ? formatMoney(quote.shippingCents) : 'Gratis') : '—'}</dd>
      </div>
    ) : null}
    <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold">
      <dt>Total</dt>
      <dd>{formatMoney(quote.totalCents)}</dd>
    </div>
    <p className="text-xs text-zinc-500">
      Incluye IVA {formatMoney(quote.vatIncludedCents)}. Precio sin impuestos nacionales: {formatMoney(quote.totalCents - quote.shippingCents - quote.vatIncludedCents)}.
    </p>
    {quote.rateSnapshot ? (
      <p className="text-xs text-zinc-500">
        Productos en dólares convertidos a dólar oficial BNA {formatMoney(Math.round(quote.rateSnapshot.rate * 100))}.
      </p>
    ) : null}
  </dl>
)
