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
 */
export const safeRevalidate = (...tags: string[]) => {
  for (const tag of tags) {
    try {
      revalidateTag(tag, 'max')
    } catch {
      // sin contexto de Next
    }
  }
}
