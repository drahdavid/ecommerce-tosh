import Image from 'next/image'
import Link from 'next/link'
import { CreditCard, RotateCcw, Truck } from 'lucide-react'
import type { Media } from '@/payload-types'
import { ProductGrid } from '@/components/product/ProductCard'
import { buttonVariants } from '@/components/ui/button'
import { getCategories, getProductCards, getSettings } from '@/lib/data/catalog'
import { formatMoney, toCents } from '@/lib/money'
import { mediaUrl } from '@/lib/pricing/context'

export default async function HomePage() {
  const [settings, categories, featured, latest] = await Promise.all([
    getSettings(),
    getCategories(),
    getProductCards({ featured: true, limit: 8 }),
    getProductCards({ sort: 'recientes', limit: 8 }),
  ])
  const hero = settings.heroImage && typeof settings.heroImage === 'object' ? (settings.heroImage as Media) : null
  const products = featured.cards.length ? featured.cards : latest.cards
  const topCategories = categories.filter((c) => !c.parent).slice(0, 4)

  return (
    <>
      <section className="relative overflow-hidden bg-zinc-100">
        {hero?.url ? (
          <Image src={mediaUrl(hero, 'large') ?? hero.url} alt={hero.alt} fill priority sizes="100vw" className="object-cover" />
        ) : null}
        <div className={`relative mx-auto flex min-h-[420px] max-w-7xl flex-col justify-center px-4 py-16 ${hero ? 'text-white' : ''}`}>
          {hero ? <div className="absolute inset-0 -z-0 bg-gradient-to-r from-black/60 to-transparent" /> : null}
          <div className="relative max-w-xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{settings.heroTitle || settings.storeName}</h1>
            {settings.heroSubtitle || settings.tagline ? (
              <p className="mt-4 text-lg opacity-90">{settings.heroSubtitle || settings.tagline}</p>
            ) : null}
            <Link href="/productos" className={`${buttonVariants({ size: 'lg' })} mt-8 ${hero ? 'bg-white !text-zinc-900 hover:bg-zinc-200' : ''}`}>
              Ver productos
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 text-sm sm:grid-cols-3">
          {settings.installments?.enabled && settings.installments.interestFree ? (
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 shrink-0" />
              <span>{settings.installments.count} cuotas sin interés con Mercado Pago</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 shrink-0" />
              <span>Pagá con Mercado Pago: tarjetas, dinero en cuenta y más</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 shrink-0" />
            <span>
              {settings.freeShippingThreshold
                ? `Envío gratis desde ${formatMoney(toCents(settings.freeShippingThreshold))}`
                : 'Envíos a todo el país'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 shrink-0" />
            <span>
              {settings.transferDiscountPercent ? `${settings.transferDiscountPercent}% OFF pagando con transferencia` : 'Cambios y devoluciones fáciles'}
            </span>
          </div>
        </div>
      </section>

      {topCategories.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Categorías</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {topCategories.map((c) => {
              const img = c.image && typeof c.image === 'object' ? (c.image as Media) : null
              return (
                <Link key={c.id} href={`/categoria/${c.slug}`} className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-lg bg-zinc-200 p-4">
                  {img?.url ? (
                    <Image src={mediaUrl(img, 'card') ?? img.url} alt={img.alt} fill sizes="25vw" className="object-cover transition-transform group-hover:scale-105" />
                  ) : null}
                  <span className="relative rounded bg-white/90 px-3 py-1 text-sm font-medium">{c.title}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">{featured.cards.length ? 'Destacados' : 'Novedades'}</h2>
          <Link href="/productos" className="text-sm underline underline-offset-4">
            Ver todo
          </Link>
        </div>
        <div className="mt-6">
          {products.length ? <ProductGrid products={products} /> : <p className="text-zinc-500">Pronto vas a encontrar productos acá.</p>}
        </div>
      </section>
    </>
  )
}
