import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/data/catalog'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3100'
  const payload = await getPayloadClient()
  const published = { _status: { equals: 'published' } } as const
  const [products, categories, pages] = await Promise.all([
    payload.find({ collection: 'products', where: published, limit: 5000, depth: 0, select: { slug: true, updatedAt: true }, overrideAccess: false }),
    payload.find({ collection: 'categories', limit: 500, depth: 0, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'pages', where: published, limit: 100, depth: 0, select: { slug: true, updatedAt: true }, overrideAccess: false }),
  ])
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/productos`, changeFrequency: 'daily', priority: 0.9 },
    ...categories.docs.map((c) => ({ url: `${base}/categoria/${c.slug}`, lastModified: c.updatedAt, priority: 0.8 })),
    ...products.docs.map((p) => ({ url: `${base}/productos/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...pages.docs.map((p) => ({ url: `${base}/legales/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
    { url: `${base}/arrepentimiento`, priority: 0.2 },
  ]
}
