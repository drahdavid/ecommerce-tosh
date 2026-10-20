'use client'

import { useState, useTransition } from 'react'
import { submitRegretAction } from '@/app/(frontend)/arrepentimiento/actions'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'

export const RegretForm = ({ exampleOrderNumber }: { exampleOrderNumber: string }) => {
  const [form, setForm] = useState({ orderNumber: '', email: '', name: '', phone: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  if (code) {
    return (
      <div className="mt-8 rounded-lg bg-success/10 p-6">
        <p className="font-semibold text-success">Recibimos tu solicitud</p>
        <p className="mt-2 text-sm">
          Tu código de identificación es <strong className="text-base">{code}</strong>. También te lo enviamos por email. Te vamos a
          contactar para coordinar la devolución y el reintegro.
        </p>
      </div>
    )
  }

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const res = await submitRegretAction(form)
          if (res.ok) setCode(res.code)
          else setError(res.error)
        })
      }}
    >
      <Field label="Número de pedido" htmlFor="r-order" hint={`Lo encontrás en el email de confirmación (ej.: ${exampleOrderNumber}).`}>
        <Input id="r-order" required value={form.orderNumber} onChange={set('orderNumber')} />
      </Field>
      <Field label="Email usado en la compra" htmlFor="r-email">
        <Input id="r-email" type="email" required value={form.email} onChange={set('email')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido" htmlFor="r-name">
          <Input id="r-name" required value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Teléfono (opcional)" htmlFor="r-phone">
          <Input id="r-phone" value={form.phone} onChange={set('phone')} />
        </Field>
      </div>
      <Field label="Comentario (opcional)" htmlFor="r-reason">
        <Textarea id="r-reason" value={form.reason} onChange={set('reason')} />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar solicitud de arrepentimiento'}
      </Button>
    </form>
  )
}
