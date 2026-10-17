'use client'

import { useState, useTransition } from 'react'
import { deleteAccountAction } from '@/app/(frontend)/cuenta/actions'
import { Button } from '@/components/ui/button'

export const DeleteAccount = () => {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="mt-8 space-y-3">
      {confirming ? (
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteAccountAction()
                if (res && !res.ok) setError(res.error)
              })
            }
          >
            {pending ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
          </Button>
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setConfirming(true)}>
          Eliminar mi cuenta
        </Button>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
