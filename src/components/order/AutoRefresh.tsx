'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Refresca la página mientras el pago está pendiente (espera la confirmación del webhook). */
export const AutoRefresh = ({ intervalMs = 4000, maxTries = 15 }: { intervalMs?: number; maxTries?: number }) => {
  const router = useRouter()
  const [tries, setTries] = useState(0)
  useEffect(() => {
    if (tries >= maxTries) return
    const t = setTimeout(() => {
      router.refresh()
      setTries((n) => n + 1)
    }, intervalMs)
    return () => clearTimeout(t)
  }, [tries, maxTries, intervalMs, router])
  return tries < maxTries ? <p className="text-sm text-zinc-500">Esperando la confirmación de Mercado Pago…</p> : null
}
