import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/**
 * Destino interno para redirigir después del login. Solo rutas propias: "//x" y "/\x" los
 * navegadores los resuelven como otro dominio (redirección abierta).
 */
export const safeNextPath = (next: string | null | undefined, fallback = '/cuenta') =>
  typeof next === 'string' && /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : fallback
