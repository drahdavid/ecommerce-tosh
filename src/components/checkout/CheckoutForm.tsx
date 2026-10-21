'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { placeOrderAction } from '@/app/(frontend)/actions'
import { useCart } from '@/components/cart/CartProvider'
import { Totals } from '@/components/cart/Totals'
import { useQuote } from '@/components/cart/useQuote'
import { track } from '@/components/layout/Analytics'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { formatMoney } from '@/lib/money'
import type { PaymentMethod } from '@/lib/pricing/types'
import { PROVINCES } from '@/lib/shipping/types'
import { cn } from '@/lib/utils'

type Address = { street: string; number: string; floor: string; city: string; province: string; postalCode: string; notes: string }

export type CheckoutDefaults = {
  email: string
  firstName: string
  lastName: string
  phone: string
  dni: string
  address: Address | null
  loggedIn: boolean
}

const emptyAddress: Address = { street: '', number: '', floor: '', city: '', province: '', postalCode: '', notes: '' }

const sectionClass = 'rounded-3xl bg-white p-5 shadow-card sm:p-6'
const optionClass = 'flex cursor-pointer gap-3 rounded-2xl border p-4 transition'
const optionActive = 'border-brand bg-brand-soft/50 ring-1 ring-brand'
const optionIdle = 'border-zinc-300 hover:border-zinc-400'

export const CheckoutForm = ({ defaults }: { defaults: CheckoutDefaults }) => {
  const { lines, ready, couponCode, clear } = useCart()
  const [contact, setContact] = useState({ email: defaults.email, firstName: defaults.firstName, lastName: defaults.lastName, phone: defaults.phone, dni: defaults.dni })
  const [address, setAddress] = useState<Address>(defaults.address ?? emptyAddress)
  const [chosenRateId, setRateId] = useState<string | null>(null)
  const [chosenPayment, setPaymentMethod] = useState<PaymentMethod>('mercadopago')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const tracked = useRef(false)

  const destination = /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(address.postalCode.trim()) && address.province ? { postalCode: address.postalCode.trim(), province: address.province } : null

  const request = useMemo(
    () => (ready && lines.length ? { lines, couponCode, shippingRateId: chosenRateId, paymentMethod: chosenPayment, destination } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, lines, couponCode, chosenRateId, chosenPayment, destination?.postalCode, destination?.province],
  )
  const { data, loading } = useQuote(request, 400)
  const quote = data?.quote
  const rates = data?.shippingRates ?? []

  // Derivados de la última cotización: si la tarifa elegida ya no existe (cambió el CP) o el
  // medio de pago está deshabilitado, no se usan (sin efectos que "corrijan" el estado).
  const rateId = chosenRateId && rates.some((r) => r.id === chosenRateId) ? chosenRateId : null
  const paymentMethod: PaymentMethod =
    data && !data.paymentMethods[chosenPayment] ? (chosenPayment === 'mercadopago' ? 'transfer' : 'mercadopago') : chosenPayment
  const selectedRate = rates.find((r) => r.id === rateId) ?? null
  const needsAddress = selectedRate ? selectedRate.requiresAddress : true

  useEffect(() => {
    if (quote && !tracked.current && quote.lines.length) {
      tracked.current = true
      track('begin_checkout', {
        value: quote.totalCents / 100,
        items: quote.lines.map((l) => ({ item_id: l.sku, item_name: l.productTitle, price: l.unitPriceCents / 100, quantity: l.qty })),
      })
    }
  }, [quote])

  if (!ready) return <div className="mt-10 h-64 animate-pulse rounded-3xl bg-white" />
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

  const blocking = quote?.issues.filter((i) => i.type !== 'coupon_invalid' && i.type !== 'shipping_unavailable') ?? []

  const submit = () => {
    setFormError(null)
    setErrors({})
    startSubmit(async () => {
      const result = await placeOrderAction({
        lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        couponCode,
        contact,
        shippingRateId: rateId ?? '',
        address: needsAddress ? address : null,
        paymentMethod,
        expectedTotalCents: quote?.totalCents,
        acceptTerms,
      })
      if (result.ok) {
        clear()
        window.location.href = result.redirectUrl
        return
      }
      setErrors(result.fieldErrors ?? {})
      setFormError(result.error)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const err = (key: string) => errors[key]
  const setC = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement>) => setContact((c) => ({ ...c, [k]: e.target.value }))
  const setA = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setAddress((a) => ({ ...a, [k]: e.target.value }))

  return (
    <form
      className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-[1fr_400px] lg:gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      noValidate
    >
      <div className="space-y-4">
        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {formError}
          </div>
        ) : null}

        <section className={sectionClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-bold">1. Tus datos</h2>
            {!defaults.loggedIn ? (
              <Link href="/cuenta/ingresar?next=/checkout" className="-my-2.5 inline-flex h-11 items-center text-sm font-semibold text-brand underline">
                ¿Ya tenés cuenta? Ingresá
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={err('contact.email')} className="sm:col-span-2" hint="Te enviamos la confirmación y el seguimiento acá.">
              <Input id="email" type="email" autoComplete="email" value={contact.email} onChange={setC('email')} required />
            </Field>
            <Field label="Nombre" htmlFor="firstName" error={err('contact.firstName')}>
              <Input id="firstName" autoComplete="given-name" value={contact.firstName} onChange={setC('firstName')} required />
            </Field>
            <Field label="Apellido" htmlFor="lastName" error={err('contact.lastName')}>
              <Input id="lastName" autoComplete="family-name" value={contact.lastName} onChange={setC('lastName')} required />
            </Field>
            <Field label="Teléfono" htmlFor="phone" error={err('contact.phone')}>
              <Input id="phone" type="tel" autoComplete="tel" value={contact.phone} onChange={setC('phone')} required />
            </Field>
            <Field label="DNI o CUIT" htmlFor="dni" error={err('contact.dni')} hint="Lo necesitamos para la factura y el envío.">
              <Input id="dni" inputMode="numeric" value={contact.dni} onChange={setC('dni')} required />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="text-lg font-bold">2. Entrega</h2>
          <p className="mt-1 text-sm text-zinc-600">Ingresá tu código postal y provincia para ver las opciones de envío.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Código postal" htmlFor="postalCode" error={err('address.postalCode')}>
              <Input id="postalCode" autoComplete="postal-code" value={address.postalCode} onChange={setA('postalCode')} placeholder="Ej.: 1425" />
            </Field>
            <Field label="Provincia" htmlFor="province" error={err('address.province')}>
              <Select id="province" value={address.province} onChange={setA('province')}>
                <option value="">Elegí…</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Método de entrega</legend>
            {rates.length === 0 ? (
              <p className="text-sm text-zinc-500">{loading ? 'Calculando opciones…' : destination ? 'No hay envíos disponibles para ese destino.' : 'Completá CP y provincia.'}</p>
            ) : (
              rates.map((r) => {
                const isFree = quote?.shipping?.id === r.id ? quote.shipping.isFree : r.priceCents === 0
                return (
                  <label
                    key={r.id}
                    className={cn(optionClass, 'items-center', rateId === r.id ? optionActive : optionIdle)}
                  >
                    <input type="radio" name="shippingRate" value={r.id} checked={rateId === r.id} onChange={() => setRateId(r.id)} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{r.label}</span>
                      {r.etaDays ? <span className="block text-xs text-zinc-500">Llega en {r.etaDays.min}–{r.etaDays.max} días hábiles</span> : null}
                    </span>
                    <span className="text-sm font-bold">{isFree ? 'Gratis' : formatMoney(r.priceCents)}</span>
                  </label>
                )
              })
            )}
            {err('shippingRateId') ? <p className="text-xs text-red-600">{err('shippingRateId')}</p> : null}
          </fieldset>

          {selectedRate?.requiresAddress ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-6">
              <Field label="Calle" htmlFor="street" error={err('address.street')} className="sm:col-span-3">
                <Input id="street" autoComplete="address-line1" value={address.street} onChange={setA('street')} />
              </Field>
              <Field label="Número" htmlFor="number" error={err('address.number')} className="sm:col-span-1">
                <Input id="number" value={address.number} onChange={setA('number')} />
              </Field>
              <Field label="Piso / Depto" htmlFor="floor" className="sm:col-span-2">
                <Input id="floor" autoComplete="address-line2" value={address.floor} onChange={setA('floor')} />
              </Field>
              <Field label="Localidad" htmlFor="city" error={err('address.city')} className="sm:col-span-6">
                <Input id="city" autoComplete="address-level2" value={address.city} onChange={setA('city')} />
              </Field>
              <Field label="Indicaciones para la entrega (opcional)" htmlFor="notes" className="sm:col-span-6">
                <Textarea id="notes" value={address.notes} onChange={setA('notes')} />
              </Field>
            </div>
          ) : null}
        </section>

        <section className={sectionClass}>
          <h2 className="text-lg font-bold">3. Pago</h2>
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Medio de pago</legend>
            {data?.paymentMethods.mercadopago !== false ? (
              <label className={cn(optionClass, 'items-start', paymentMethod === 'mercadopago' ? optionActive : optionIdle)}>
                <input type="radio" name="payment" className="mt-1" checked={paymentMethod === 'mercadopago'} onChange={() => setPaymentMethod('mercadopago')} />
                <span>
                  <span className="block text-sm font-medium">Mercado Pago</span>
                  <span className="block text-xs text-zinc-500">Tarjetas de crédito y débito, dinero en cuenta, cuotas y Mercado Crédito. Pagás en el sitio seguro de Mercado Pago.</span>
                </span>
              </label>
            ) : null}
            {data?.paymentMethods.transfer ? (
              <label className={cn(optionClass, 'items-start', paymentMethod === 'transfer' ? optionActive : optionIdle)}>
                <input type="radio" name="payment" className="mt-1" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} />
                <span>
                  <span className="block text-sm font-medium">
                    Transferencia bancaria
                    {data.paymentMethods.transferDiscountPercent ? (
                      <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-xs font-extrabold">{data.paymentMethods.transferDiscountPercent}% OFF</span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-zinc-500">Te mostramos los datos al confirmar y te los enviamos por email.</span>
                </span>
              </label>
            ) : null}
          </fieldset>
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-3xl bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Resumen</h2>
        {quote ? (
          <>
            <ul className="space-y-2 text-sm">
              {quote.lines.map((l) => (
                <li key={l.variantId} className="flex justify-between gap-3">
                  <span className="text-zinc-700">
                    {l.qty} × {l.productTitle}
                    {l.variantTitle !== 'Única' ? <span className="text-zinc-500"> ({l.variantTitle})</span> : null}
                  </span>
                  <span>{formatMoney(l.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <Totals quote={quote} showShipping />
          </>
        ) : (
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
        )}
        {blocking.length && data?.message ? <p className="text-sm text-red-600">{data.message}</p> : null}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
          <span>
            Acepto los{' '}
            <Link href="/legales/terminos-y-condiciones" target="_blank" className="underline">
              términos y condiciones
            </Link>{' '}
            y la{' '}
            <Link href="/legales/privacidad" target="_blank" className="underline">
              política de privacidad
            </Link>
            .
          </span>
        </label>
        {err('acceptTerms') ? <p className="-mt-3 text-xs text-red-600">{err('acceptTerms')}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting || loading || !quote || blocking.length > 0 || !rateId}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
            </>
          ) : paymentMethod === 'mercadopago' ? (
            'Pagar con Mercado Pago'
          ) : (
            'Confirmar pedido'
          )}
        </Button>
        {!rateId ? <p className="text-center text-xs text-zinc-500">Elegí un método de entrega para continuar.</p> : null}
      </aside>
    </form>
  )
}
