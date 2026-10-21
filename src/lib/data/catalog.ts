import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload, type Where } from 'payload'
import type { Category, Media, Product, StoreSetting, Variant } from '@/payload-types'
import { toSnapshot } from '@/lib/exchange-rate'
import { toCents } from '@/lib/money'
import { toPricingSettings, mediaUrl } from '@/lib/pricing/context'
import { buildPriceDisplay, type PriceDisplay } from '@/lib/pricing/display'
import type { RateSnapshot } from '@/lib/pricing/types'
import { TAGS } from '@/lib/revalidate'

export const getPayloadClient = () => getPayload({ config })

export const getSettings = unstable_cache(
  async (): Promise<StoreSetting> => (await getPayloadClient()).findGlobal({ slug: 'store-settings', depth: 1 }),
  ['store-settings'],
  { tags: [TAGS.settings] },
)

/** Cotización para MOSTRAR precios (el checkout siempre re-cotiza sin cache). */
export const getDisplayRate = unstable_cache(
  async (): Promise<RateSnapshot | null> => {
    const g = await (await getPayloadClient()).findGlobal({ slug: 'exchange-rate', depth: 0, overrideAccess: true })
    return toSnapshot(g)
  },
  ['exchange-rate'],
  { tags: [TAGS.exchangeRate], revalidate: 3600 },
)

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { docs } = await (await getPayloadClient()).find({ collection: 'categories', limit: 100, depth: 1, sort: 'order' })
    return docs
  },
  ['categories'],
  { tags: [TAGS.categories] },
)

export type ProductCardData = {
  id: number
  slug: string
  title: string
  image: { url: string; alt: string } | null
  price: PriceDisplay | null
  fromPrice: boolean
  inStock: boolean
}

const variantDocs = (p: Product): Variant[] =>
  ((p.variants?.docs ?? []) as (number | Variant)[]).filter((v): v is Variant => typeof v === 'object')

const firstImage = (p: Product) => {
  const m = p.images?.[0]
  return m && typeof m === 'object' ? { url: mediaUrl(m as Media, 'card') ?? '', alt: (m as Media).alt ?? p.title } : null
}

export const toCard = (p: Product, settings: StoreSetting, rate: RateSnapshot | null): ProductCardData => {
  const variants = variantDocs(p).filter((v) => v.active)
  const prices = variants.map((v) => v.priceOverride ?? p.price)
  const minPrice = prices.length ? Math.min(...prices) : p.price
  return {
    id: p.id,
    slug: p.slug ?? '',
    title: p.title,
    image: firstImage(p),
    price: buildPriceDisplay({
      priceCents: toCents(minPrice),
      compareAtCents: p.compareAtPrice ? toCents(p.compareAtPrice) : null,
      currency: p.currency,
      taxRate: Number(p.taxRate ?? 21),
      rate,
      settings: toPricingSettings(settings),
    }),
    fromPrice: new Set(prices).size > 1,
    inStock: variants.some((v) => (v.stock ?? 0) > 0),
  }
}

export type ProductQuery = { q?: string; category?: string; sort?: string; page?: number; featured?: boolean; limit?: number }

const SORTS: Record<string, string> = {
  recientes: '-createdAt',
  'precio-asc': 'price',
  'precio-desc': '-price',
  nombre: 'title',
}

const queryProducts = async (query: ProductQuery) => {
  const payload = await getPayloadClient()
  const and: Where[] = [{ _status: { equals: 'published' } }]
  if (query.q) and.push({ title: { like: query.q } })
  if (query.featured) and.push({ featured: { equals: true } })
  if (query.category) {
    const { docs } = await payload.find({ collection: 'categories', where: { slug: { equals: query.category } }, limit: 1, depth: 0 })
    if (!docs[0]) return { docs: [] as Product[], totalDocs: 0, totalPages: 0, page: 1 }
    // Incluye subcategorías directas.
    const children = await payload.find({ collection: 'categories', where: { parent: { equals: docs[0].id } }, limit: 100, depth: 0 })
    and.push({ category: { in: [docs[0].id, ...children.docs.map((c) => c.id)] } })
  }
  const res = await payload.find({
    collection: 'products',
    where: { and },
    sort: SORTS[query.sort ?? ''] ?? '-createdAt',
    limit: query.limit ?? 24,
    page: query.page ?? 1,
    depth: 1,
    joins: { variants: { limit: 100 } },
    overrideAccess: false,
  })
  return { docs: res.docs, totalDocs: res.totalDocs, totalPages: res.totalPages, page: res.page ?? 1 }
}

const fetchProducts = unstable_cache(queryProducts, ['products-list'], { tags: [TAGS.products] })

const MAX_PAGE = 100

/**
 * Los parámetros vienen de la URL y son la clave de la cache: cada valor distinto es una entrada
 * nueva en disco. Se acotan, y las búsquedas de texto no se cachean.
 */
const normalizeQuery = (query: ProductQuery): ProductQuery => ({
  ...query,
  q: query.q?.trim().slice(0, 60) || undefined,
  sort: query.sort && query.sort in SORTS ? query.sort : undefined,
  page: Math.min(MAX_PAGE, Math.max(1, Math.floor(query.page ?? 1) || 1)),
})

export const getProductCards = async (rawQuery: ProductQuery) => {
  const query = normalizeQuery(rawQuery)
  const [res, settings, rate] = await Promise.all([query.q ? queryProducts(query) : fetchProducts(query), getSettings(), getDisplayRate()])
  return { ...res, cards: res.docs.map((p) => toCard(p, settings, rate)) }
}

/**
 * Slugs publicados (una sola entrada de cache por colección). Las fichas se cachean por slug:
 * sin este filtro, cada URL inventada (/productos/xyz1, /productos/xyz2…) crearía una entrada.
 */
const getPublishedSlugs = unstable_cache(
  async (collection: 'products' | 'pages'): Promise<string[]> => {
    const { docs } = await (await getPayloadClient()).find({
      collection,
      where: { _status: { equals: 'published' } },
      pagination: false,
      depth: 0,
      select: { slug: true },
      overrideAccess: false,
    })
    return docs.map((d) => d.slug ?? '').filter(Boolean)
  },
  ['published-slugs'],
  { tags: [TAGS.products, TAGS.pages] },
)

export const getProductBySlug = async (slug: string) => ((await getPublishedSlugs('products')).includes(slug) ? cachedProductBySlug(slug) : null)

const cachedProductBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<Product | null> => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'products',
        where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
        limit: 1,
        depth: 2,
        joins: { variants: { limit: 200, sort: 'id' } },
        overrideAccess: false,
      })
      return docs[0] ?? null
    },
    ['product', slug],
    { tags: [TAGS.products, TAGS.product(slug)] },
  )()

export const getFooterPages = unstable_cache(
  async () => {
    const { docs } = await (await getPayloadClient()).find({
      collection: 'pages',
      where: { and: [{ showInFooter: { equals: true } }, { _status: { equals: 'published' } }] },
      limit: 20,
      depth: 0,
      select: { title: true, slug: true },
      overrideAccess: false,
    })
    return docs
  },
  ['footer-pages'],
  { tags: [TAGS.pages] },
)

export const getPageBySlug = async (slug: string) => ((await getPublishedSlugs('pages')).includes(slug) ? cachedPageBySlug(slug) : null)

const cachedPageBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      const { docs } = await (await getPayloadClient()).find({
        collection: 'pages',
        where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
        limit: 1,
        depth: 1,
        overrideAccess: false,
      })
      return docs[0] ?? null
    },
    ['page', slug],
    { tags: [TAGS.pages] },
  )()
