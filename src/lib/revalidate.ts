import { revalidateTag } from 'next/cache'

export const TAGS = {
  products: 'products',
  product: (slug: string) => `product:${slug}`,
  categories: 'categories',
  exchangeRate: 'exchange-rate',
  settings: 'settings',
  pages: 'pages',
} as const

/**
 * Invalida tags de cache del storefront. Fuera de Next (seeds, scripts, tests) revalidateTag
 * lanza error porque no hay contexto de request: en ese caso no hay nada que invalidar.
 *
 * `expire: 0` en vez de `'max'`: con stale-while-revalidate la primera visita después de un
 * cambio en el admin mostraría la versión anterior, y si se reemplazó una foto, esa versión
 * apunta a un archivo que ya no existe.
 */
export const safeRevalidate = (...tags: string[]) => {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch {
      // sin contexto de Next
    }
  }
}
