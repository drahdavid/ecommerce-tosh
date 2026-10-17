'use client'

import { useSyncExternalStore } from 'react'

/**
 * Store mínimo respaldado por localStorage para `useSyncExternalStore`: lee una sola vez,
 * sincroniza entre pestañas (evento `storage`) y tolera almacenamiento bloqueado.
 */
export const createLocalStore = <T>(key: string, fallback: T, parse: (raw: unknown) => T) => {
  let state: T = fallback
  let loaded = false
  const listeners = new Set<() => void>()

  const read = (): T => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw == null ? fallback : parse(JSON.parse(raw))
    } catch {
      return fallback
    }
  }

  const emit = () => listeners.forEach((l) => l())

  const getSnapshot = () => {
    if (!loaded) {
      state = read()
      loaded = true
    }
    return state
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      state = read()
      emit()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  const set = (next: T | ((prev: T) => T)) => {
    state = typeof next === 'function' ? (next as (prev: T) => T)(getSnapshot()) : next
    loaded = true
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // almacenamiento no disponible: el estado vive solo en memoria
    }
    emit()
  }

  const useValue = () => useSyncExternalStore(subscribe, getSnapshot, () => fallback)

  return { useValue, set, getSnapshot }
}

const noopSubscribe = () => () => {}

/** true solo después de hidratar en el cliente (evita desajustes con el HTML del servidor). */
export const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
