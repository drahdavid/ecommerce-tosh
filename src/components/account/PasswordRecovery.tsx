'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

export const PasswordRecovery = ({ token }: { token: string | null }) => {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (token) {
        if (value.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
        const res = await fetch('/api/customers/reset-password', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: value }),
        })
        if (!res.ok) throw new Error('El link venció o no es válido. Pedí uno nuevo.')
      } else {
        // Siempre responde OK: no revelamos si el email tiene cuenta.
        await fetch('/api/customers/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value }),
        })
      }
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{token ? 'Contraseña actualizada' : 'Revisá tu email'}</h1>
        <p className="mt-3 text-zinc-600">
          {token ? 'Ya podés usar tu nueva contraseña.' : 'Si hay una cuenta con ese email, te enviamos un link para elegir una nueva contraseña.'}
        </p>
        <Link href={token ? '/cuenta' : '/cuenta/ingresar'} className="mt-6 inline-block underline">
          {token ? 'Ir a mi cuenta' : 'Volver a ingresar'}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-semibold">{token ? 'Elegí una nueva contraseña' : 'Recuperar contraseña'}</h1>
      <Field label={token ? 'Nueva contraseña' : 'Email'} htmlFor="value">
        <Input
          id="value"
          type={token ? 'password' : 'email'}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={token ? 'new-password' : 'email'}
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Un momento…' : token ? 'Guardar contraseña' : 'Enviar link'}
      </Button>
    </form>
  )
}
