'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

const errorMessage = async (res: Response, fallback: string) => {
  const json = await res.json().catch(() => null)
  const msg: string | undefined = json?.errors?.[0]?.data?.errors?.[0]?.message ?? json?.errors?.[0]?.message
  if (msg?.toLowerCase().includes('verify')) return 'Todavía no confirmaste tu email. Revisá tu casilla.'
  if (msg?.toLowerCase().includes('incorrect') || res.status === 401) return 'Email o contraseña incorrectos.'
  if (msg?.toLowerCase().includes('unique') || msg?.toLowerCase().includes('already')) return 'Ya existe una cuenta con ese email.'
  return msg ?? fallback
}

export const AuthForms = ({ next }: { next: string }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        const res = await fetch('/api/customers/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) throw new Error(await errorMessage(res, 'No pudimos iniciar sesión.'))
        window.location.href = next
      } else {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName }),
        })
        if (!res.ok) throw new Error(await errorMessage(res, 'No pudimos crear la cuenta.'))
        setRegistered(true)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (registered) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">Revisá tu email</h1>
        <p className="mt-3 text-zinc-600">
          Te enviamos un link a <strong>{email}</strong> para confirmar tu cuenta. Después vas a poder ingresar.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 rounded-lg bg-zinc-100 p-1 text-sm">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={cn('rounded-md py-2 font-medium', mode === m ? 'bg-white shadow-sm' : 'text-zinc-600')}
          >
            {m === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" htmlFor="firstName">
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </Field>
            <Field label="Apellido" htmlFor="lastName">
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </Field>
          </div>
        ) : null}
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Contraseña" htmlFor="password" hint={mode === 'register' ? 'Mínimo 8 caracteres.' : undefined}>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </Field>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </Button>
        {mode === 'login' ? (
          <p className="text-center text-sm">
            <Link href="/cuenta/recuperar" className="underline">
              Olvidé mi contraseña
            </Link>
          </p>
        ) : null}
      </form>
      <p className="mt-8 text-center text-xs text-zinc-500">No necesitás cuenta para comprar: podés hacerlo como invitado.</p>
    </div>
  )
}
