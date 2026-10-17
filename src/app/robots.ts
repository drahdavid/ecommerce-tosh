import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3100'
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/checkout', '/carrito', '/cuenta', '/pedido'] }],
    sitemap: `${base}/sitemap.xml`,
  }
}
