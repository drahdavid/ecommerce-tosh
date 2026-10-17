'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { updateProfileAction } from '@/app/(frontend)/cuenta/actions'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { PROVINCES } from '@/lib/shipping/types'

type Address = { label: string; street: string; number: string; floor: string; city: string; province: string; postalCode: string; isDefault: boolean }
type Profile = { firstName: string; lastName: string; phone: string; dni: string; marketingOptIn: boolean; addresses: Address[] }

const blank: Address = { label: '', street: '', number: '', floor: '', city: '', province: '', postalCode: '', isDefault: false }

export const ProfileForm = ({ initial }: { initial: Profile }) => {
  const [profile, setProfile] = useState(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile((p) => ({ ...p, [k]: v }))
  const setAddr = (i: number, k: keyof Address, v: string | boolean) =>
    setProfile((p) => ({
      ...p,
      addresses: p.addresses.map((a, j) => (j === i ? { ...a, [k]: v } : k === 'isDefault' && v ? { ...a, isDefault: false } : a)),
    }))

  return (
    <form
      className="mt-4 space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        setMessage(null)
        start(async () => {
          const res = await updateProfileAction(profile)
          setMessage(res.ok ? { ok: true, text: 'Datos guardados.' } : { ok: false, text: res.error })
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="p-first">
          <Input id="p-first" value={profile.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </Field>
        <Field label="Apellido" htmlFor="p-last">
          <Input id="p-last" value={profile.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </Field>
        <Field label="Teléfono" htmlFor="p-phone">
          <Input id="p-phone" value={profile.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="DNI o CUIT" htmlFor="p-dni">
          <Input id="p-dni" value={profile.dni} onChange={(e) => set('dni', e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={profile.marketingOptIn} onChange={(e) => set('marketingOptIn', e.target.checked)} />
        Quiero recibir novedades y promociones por email
      </label>

      <div className="space-y-4">
        {profile.addresses.map((a, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-6">
            <Field label="Etiqueta" htmlFor={`a-label-${i}`} className="sm:col-span-2">
              <Input id={`a-label-${i}`} placeholder="Casa" value={a.label} onChange={(e) => setAddr(i, 'label', e.target.value)} />
            </Field>
            <Field label="Calle" htmlFor={`a-street-${i}`} className="sm:col-span-3">
              <Input id={`a-street-${i}`} value={a.street} onChange={(e) => setAddr(i, 'street', e.target.value)} />
            </Field>
            <Field label="Número" htmlFor={`a-number-${i}`}>
              <Input id={`a-number-${i}`} value={a.number} onChange={(e) => setAddr(i, 'number', e.target.value)} />
            </Field>
            <Field label="Piso/Depto" htmlFor={`a-floor-${i}`}>
              <Input id={`a-floor-${i}`} value={a.floor} onChange={(e) => setAddr(i, 'floor', e.target.value)} />
            </Field>
            <Field label="Localidad" htmlFor={`a-city-${i}`} className="sm:col-span-2">
              <Input id={`a-city-${i}`} value={a.city} onChange={(e) => setAddr(i, 'city', e.target.value)} />
            </Field>
            <Field label="Provincia" htmlFor={`a-prov-${i}`} className="sm:col-span-2">
              <Select id={`a-prov-${i}`} value={a.province} onChange={(e) => setAddr(i, 'province', e.target.value)}>
                <option value="">Elegí…</option>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="CP" htmlFor={`a-cp-${i}`}>
              <Input id={`a-cp-${i}`} value={a.postalCode} onChange={(e) => setAddr(i, 'postalCode', e.target.value)} />
            </Field>
            <div className="flex items-center justify-between sm:col-span-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="defaultAddress" checked={a.isDefault} onChange={() => setAddr(i, 'isDefault', true)} />
                Predeterminada
              </label>
              <button type="button" className="flex items-center gap-1 text-sm text-zinc-500" onClick={() => set('addresses', profile.addresses.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </div>
          </div>
        ))}
        {profile.addresses.length < 10 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => set('addresses', [...profile.addresses, { ...blank, isDefault: profile.addresses.length === 0 }])}>
            <Plus className="h-4 w-4" /> Agregar dirección
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
        {message ? <p className={message.ok ? 'text-sm text-success' : 'text-sm text-red-600'}>{message.text}</p> : null}
      </div>
    </form>
  )
}
