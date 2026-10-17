import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { CreditCard, ShieldCheck, Truck } from 'lucide-react'
import type { Category, Media, Variant } from '@/payload-types'
import { ProductPurchase, type PurchaseVariant } from '@/components/product/ProductPurchase'
import { ViewItemTracker } from '@/components/product/ViewItemTracker'
import { getDisplayRate, getProductBySlug, getSettings } from '@/lib/data/catalog'
import { formatMoney, fromCents, toCents } from '@/lib/money'
import { mediaUrl, toPricingSettings } from '@/lib/pricing/context'
import { buildPriceDisplay } from '@/lib/pricing/display'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug)
  if (!product) return {}
  const image = product.images?.[0] && typeof product.images[0] === 'object' ? (product.images[0] as Media) : null
  const description = product.meta?.description || product.shortDescription || undefined
  return {
    title: product.meta?.title || product.title,
    description,
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: { title: product.title, description, images: image?.url ? [{ url: mediaUrl(image, 'large') ?? image.url, alt: image.alt }] : undefined },
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params
  const [product, settings, rate] = await Promise.all([getProductBySlug(slug), getSettings(), getDisplayRate()])
  if (!product) notFound()

  const pricingSettings = toPricingSettings(settings)
  const variants = ((product.variants?.docs ?? []) as (number | Variant)[]).filter((v): v is Variant => typeof v === 'object' && Boolean(v.active))
  const options = (product.options ?? []).map((o) => ({ name: o.name, values: (o.values ?? []) as string[] }))

  const purchaseVariants: PurchaseVariant[] = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    stock: v.stock ?? 0,
    options: Object.fromEntries((v.options ?? []).map((o) => [o.name, o.value])),
    imageUrl: v.image && typeof v.image === 'object' ? mediaUrl(v.image as Media, 'large') : null,
    price: buildPriceDisplay({
      priceCents: toCents(v.priceOverride ?? product.price),
      compareAtCents: product.compareAtPrice ? toCents(product.compareAtPrice) : null,
      currency: product.currency,
      taxRate: Number(product.taxRate ?? 21),
      rate,
      settings: pricingSettings,
    }),
  }))

  const images = [
    ...(product.images ?? []),
    ...variants.map((v) => v.image).filter(Boolean),
  ]
    .filter((m): m is Media => typeof m === 'object' && m !== null)
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .map((m) => ({ url: mediaUrl(m, 'large') ?? m.url ?? '', thumb: mediaUrl(m, 'thumbnail') ?? m.url ?? '', alt: m.alt || product.title }))

  const category = (product.category ?? []).find((c): c is Category => typeof c === 'object')
  const base = process.env.NEXT_PUBLIC_SERVER_URL || ''
  const firstPrice = purchaseVariants.find((v) => v.price)?.price
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription ?? undefined,
    image: images.map((i) => i.url),
    sku: purchaseVariants[0]?.sku,
    offers: purchaseVariants
      .filter((v) => v.price)
      .map((v) => ({
        '@type': 'Offer',
        sku: v.sku,
        price: fromCents(v.price!.priceCents).toFixed(2),
        priceCurrency: 'ARS',
        availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: `${base}/productos/${product.slug}`,
      })),
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="mb-6 text-xs text-zinc-500" aria-label="Migas de pan">
        <Link href="/">Inicio</Link> / <Link href="/productos">Productos</Link>
        {category ? (
          <>
            {' / '}
            <Link href={`/categoria/${category.slug}`}>{category.title}</Link>
          </>
        ) : null}
      </nav>

      <ProductPurchase
        productId={product.id}
        title={product.title}
        options={options}
        variants={purchaseVariants}
        images={images}
        transferDiscountPercent={pricingSettings.transferDiscountPercent}
      >
        <ul className="space-y-3 border-t border-zinc-200 pt-6 text-sm text-zinc-700">
          <li className="flex gap-3">
            <Truck className="h-5 w-5 shrink-0" />
            <span>
              Envíos a todo el país{settings.freeShippingThreshold ? ` · Gratis desde ${formatMoney(toCents(settings.freeShippingThreshold))}` : ''}. Calculá el costo en el carrito.
            </span>
          </li>
          <li className="flex gap-3">
            <CreditCard className="h-5 w-5 shrink-0" />
            <span>Mercado Pago: tarjetas de crédito y débito, dinero en cuenta y cuotas.</span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span>
              Compra protegida. Tenés 10 días para arrepentirte (<Link href="/arrepentimiento" className="underline">botón de arrepentimiento</Link>).
            </span>
          </li>
        </ul>
        {product.shortDescription ? <p className="text-zinc-700">{product.shortDescription}</p> : null}
      </ProductPurchase>

      {product.description ? (
        <section className="mt-16 max-w-3xl">
          <h2 className="text-xl font-semibold">Descripción</h2>
          <RichText data={product.description} className="prose-content mt-4" />
        </section>
      ) : null}

      {firstPrice ? (
        <ViewItemTracker
          value={firstPrice.priceCents / 100}
          item={{ item_id: purchaseVariants[0].sku, item_name: product.title, price: firstPrice.priceCents / 100, quantity: 1 }}
        />
      ) : null}
    </div>
  )
}
