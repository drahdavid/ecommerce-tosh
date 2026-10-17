'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { createLocalStore, useHydrated } from '@/lib/localStore'

export type CartLine = { variantId: string; qty: number }

type Stored = { lines: CartLine[]; couponCode: string | null }

type CartContextValue = {
  lines: CartLine[]
  count: number
  ready: boolean
  add: (variantId: string | number, qty?: number) => void
  setQty: (variantId: string, qty: number) => void
  remove: (variantId: string) => void
  clear: () => void
  couponCode: string | null
  setCouponCode: (code: string | null) => void
}

const EMPTY: Stored = { lines: [], couponCode: null }

const cartStore = createLocalStore<Stored>('cart:v1', EMPTY, (raw) => {
  const parsed = raw as Partial<Stored> | null
  if (!parsed || !Array.isArray(parsed.lines)) return EMPTY
  return {
    lines: parsed.lines.filter((l) => l && typeof l.variantId === 'string' && Number.isInteger(l.qty) && l.qty > 0),
    couponCode: typeof parsed.couponCode === 'string' ? parsed.couponCode : null,
  }
})

const CartContext = createContext<CartContextValue | null>(null)

/**
 * El carrito del navegador guarda solo variante + cantidad (y el cupón). Precios, stock y
 * nombres siempre se piden al servidor: el cliente nunca calcula importes.
 */
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const state = cartStore.useValue()
  const ready = useHydrated()

  const add = useCallback((variantId: string | number, qty = 1) => {
    const id = String(variantId)
    cartStore.set((s) => {
      const existing = s.lines.find((l) => l.variantId === id)
      const lines = existing
        ? s.lines.map((l) => (l.variantId === id ? { ...l, qty: Math.min(99, l.qty + qty) } : l))
        : [...s.lines, { variantId: id, qty }]
      return { ...s, lines }
    })
  }, [])

  const setQty = useCallback((variantId: string, qty: number) => {
    cartStore.set((s) => ({
      ...s,
      lines:
        qty <= 0
          ? s.lines.filter((l) => l.variantId !== variantId)
          : s.lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(99, qty) } : l)),
    }))
  }, [])

  const remove = useCallback((variantId: string) => cartStore.set((s) => ({ ...s, lines: s.lines.filter((l) => l.variantId !== variantId) })), [])
  const clear = useCallback(() => cartStore.set(EMPTY), [])
  const setCouponCode = useCallback((couponCode: string | null) => cartStore.set((s) => ({ ...s, couponCode })), [])

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      count: state.lines.reduce((n, l) => n + l.qty, 0),
      ready,
      add,
      setQty,
      remove,
      clear,
      couponCode: state.couponCode,
      setCouponCode,
    }),
    [state, ready, add, setQty, remove, clear, setCouponCode],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
