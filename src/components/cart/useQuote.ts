'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { quoteCartAction, type QuoteRequest, type QuoteResponse } from '@/app/(frontend)/actions'

/**
 * Pide la cotización al servidor cada vez que cambia el request (con debounce).
 * Descarta respuestas viejas para que una cotización lenta no pise a una más nueva.
 */
export const useQuote = (request: QuoteRequest | null, delayMs = 250) => {
  const [data, setData] = useState<QuoteResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const seq = useRef(0)
  const key = request ? JSON.stringify(request) : null

  useEffect(() => {
    if (!key) return
    const id = ++seq.current
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await quoteCartAction(JSON.parse(key) as QuoteRequest)
          if (id === seq.current) {
            setData(res)
            setError(null)
          }
        } catch {
          if (id === seq.current) setError('No pudimos actualizar los precios. Revisá tu conexión.')
        }
      })
    }, delayMs)
    return () => clearTimeout(timer)
  }, [key, delayMs])

  return { data, error, loading: pending || (key !== null && data === null && !error) }
}
