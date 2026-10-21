import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CreditCard, LayoutGrid, MessageCircle, Percent, RotateCcw, Truck } from 'lucide-react'
import type { Media } from '@/payload-types'
import { ProductGrid } from '@/components/product/ProductCard'
import { buttonVariants } from '@/components/ui/button'
import { getCategories, getProductCards, getSettings, type ProductCardData } from '@/lib/data/catalog'
import { formatMoney, toCents } from '@/lib/money'
import { mediaUrl } from '@/lib/pricing/context'
import { cn } from '@/lib/utils'
import { whatsappLink } from '@/lib/whatsapp'

export default async function HomePage() {
  const [settings, categories, featured, latest] = await Promise.all([
    getSettings(),
    getCategories(),
    getProductCards({ featured: true, limit: 10 }),
    getProductCards({ sort: 'recientes', limit: 20 }),
  ])
  const hero = settings.heroImage && typeof settings.heroImage === 'object' ? (settings.heroImage as Media) : null
  // Con catálogo chico los destacados y los nuevos se pisan: la segunda fila no repite productos.
  const featuredIds = new Set(featured.cards.map((p) => p.id))
  const newest = latest.cards.filter((p) => !featuredIds.has(p.id)).slice(0, 10)
  const topCategories = categories.filter((c) => !c.parent)
  // El tagline va como etiqueta solo si no se está usando ya como subtítulo.
  const subtitle = settings.heroSubtitle || settings.tagline
  const eyebrow = settings.heroSubtitle ? settings.tagline : null
  const whatsapp = settings.whatsappNumber ? whatsappLink(settings.whatsappNumber, 'Hola! Tengo una consulta') : null

  const benefits = [
    settings.installments?.enabled && settings.installments.interestFree
      ? { icon: CreditCard, title: `${settings.installments.count} cuotas`, text: 'sin interés' }
      : { icon: CreditCard, title: 'Mercado Pago', text: 'tarjetas y más' },
    settings.freeShippingThreshold
      ? { icon: Truck, title: 'Envío gratis', text: `desde ${formatMoney(toCents(settings.freeShippingThreshold))}` }
      : { icon: Truck, title: 'Envíos', text: 'a todo el país' },
    settings.transferDiscountPercent
      ? { icon: Percent, title: `${settings.transferDiscountPercent}% OFF`, text: 'con transferencia' }
      : { icon: RotateCcw, title: 'Cambios', text: 'y devoluciones' },
  ]

  return (
    <>
      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-6">
        <div
          className={cn(
            // En desktop más bajo: que los productos asomen sin scrollear en una notebook.
            'relative isolate flex flex-col overflow-hidden rounded-[28px] px-5 pt-6 pb-7 sm:px-12 sm:py-16 lg:py-12',
            hero ? 'min-h-[420px] justify-end bg-zinc-900 text-white sm:justify-center lg:min-h-[360px]' : 'bg-brand-soft',
          )}
        >
          {hero?.url ? (
            <>
              <Image src={mediaUrl(hero, 'large') ?? hero.url} alt={hero.alt} fill priority sizes="(min-width: 1280px) 1248px, 100vw" className="-z-10 object-cover" />
              {/* En mobile el texto va abajo: el degradé sube desde ahí. En desktop, desde la izquierda. */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950/85 via-zinc-950/40 to-transparent sm:bg-gradient-to-r sm:from-zinc-950/75 sm:via-zinc-950/30" />
            </>
          ) : (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
              <span className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-lime sm:-top-28 sm:-right-10 sm:h-[26rem] sm:w-[26rem]" />
              {/* El triángulo del logo. */}
              <svg viewBox="0 0 300 260" className="absolute top-6 right-5 w-32 sm:top-16 sm:right-24 sm:w-72">
                <path d="M10 10h280L150 250Z" className="fill-brand-logo" />
              </svg>
            </div>
          )}
          <div className="relative max-w-xl lg:max-w-2xl">
            {eyebrow ? (
              <span className={cn('inline-flex rounded-full px-3 py-1.5 text-xs font-bold', hero ? 'bg-white/15 text-white backdrop-blur' : 'bg-white text-brand')}>
                {eyebrow}
              </span>
            ) : null}
            <h1 className={cn('text-[2.5rem] leading-[1.02] font-extrabold sm:mt-6 sm:text-6xl lg:mt-5 lg:text-[3.5rem]', !hero && 'mt-16', hero && eyebrow && 'mt-4')}>
              {settings.heroTitle || settings.storeName}
            </h1>
            {subtitle ? <p className={cn('mt-4 text-base leading-relaxed sm:text-lg', hero ? 'text-white/85' : 'text-zinc-700')}>{subtitle}</p> : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/productos" className={buttonVariants({ variant: hero ? 'lime' : 'primary', size: 'lg' })}>
                Ver productos
                <ArrowRight className="h-4 w-4" />
              </Link>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  data-whatsapp-cta=""
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    hero ? 'border-white/40 bg-white/10 text-white hover:border-white' : 'border-zinc-900/15 bg-white/70',
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4" aria-label="Beneficios">
        {/* Mobile: tres tarjetas. Desde sm: una sola barra dividida, que pesa menos debajo del hero. */}
        <ul className="grid grid-cols-3 gap-2 sm:gap-0 sm:divide-x sm:divide-zinc-200/70 sm:overflow-hidden sm:rounded-2xl sm:bg-white">
          {benefits.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className={cn(
                'flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:rounded-none sm:px-5 sm:py-4',
                i === benefits.length - 1 ? 'bg-lime' : 'bg-white',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0 sm:h-6 sm:w-6', i === benefits.length - 1 ? 'text-zinc-900' : 'text-brand')} />
              <p className="text-xs leading-snug sm:text-sm">
                <strong className="block font-bold">{title}</strong>
                <span className={i === benefits.length - 1 ? 'text-zinc-800' : 'text-zinc-600'}>{text}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {topCategories.length ? (
        <section className="mx-auto max-w-7xl pt-12 sm:px-4 sm:pt-16 lg:pt-12">
          <h2 className="px-4 text-2xl font-extrabold sm:px-0">Comprá por categoría</h2>
          <div className="no-scrollbar mt-5 flex snap-x gap-2 overflow-x-auto px-3 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
            {topCategories.map((c) => {
              const img = c.image && typeof c.image === 'object' ? (c.image as Media) : null
              return (
                <Link
                  key={c.id}
                  href={`/categoria/${c.slug}`}
                  className={cn(
                    'group flex min-w-26 shrink-0 snap-start flex-col items-center gap-3 rounded-[20px] bg-white px-2 pt-4 pb-3.5 text-center transition hover:shadow-card-hover sm:p-5',
                    // En desktop, tarjeta horizontal y baja: tres círculos solos en 1200px dejaban mucho vacío.
                    'lg:flex-row lg:gap-4 lg:p-4 lg:text-left',
                    // Con más de 3 la cuarta queda asomando: se nota que la fila se desliza.
                    topCategories.length > 3 ? 'basis-[30%]' : 'basis-[calc((100%_-_1rem)/3)]',
                  )}
                >
                  <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-brand sm:h-24 sm:w-24 lg:h-16 lg:w-16">
                    {img?.url ? (
                      <Image src={mediaUrl(img, 'thumbnail') ?? img.url} alt="" fill sizes="96px" className="object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <LayoutGrid className="h-7 w-7" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-tight font-bold sm:text-sm lg:text-base">{c.title}</span>
                    <span className="mt-1 hidden items-center gap-1 text-sm font-semibold text-brand group-hover:text-brand-strong lg:flex">
                      Ver productos
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {featured.cards.length ? (
        <ProductSection title="Destacados" products={featured.cards} />
      ) : (
        <ProductSection title="Novedades" products={latest.cards.slice(0, 10)} />
      )}

      {whatsapp ? (
        <section className="mx-auto max-w-7xl px-3 pt-12 sm:px-4 sm:pt-16 lg:pt-14">
          <div className="flex items-center gap-4 rounded-[26px] bg-lime px-5 py-6 sm:px-10 sm:py-10">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold sm:text-3xl">¿Dudas con un producto?</h2>
              <p className="mt-1.5 text-sm text-zinc-800 sm:text-base">Te asesoramos por WhatsApp antes de comprar.</p>
            </div>
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label="Escribinos por WhatsApp"
              data-whatsapp-cta=""
              className="flex h-13 w-13 shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-900 font-semibold text-white transition hover:bg-zinc-700 active:scale-[.98] sm:h-12 sm:w-auto sm:px-6"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="hidden sm:inline">Escribinos</span>
            </a>
          </div>
        </section>
      ) : null}

      {featured.cards.length && newest.length ? <ProductSection title="Recién llegados" products={newest} priority={false} /> : null}
    </>
  )
}

const ProductSection = ({ title, products, priority }: { title: string; products: ProductCardData[]; priority?: boolean }) => (
  <section className="mx-auto max-w-7xl px-3 pt-12 sm:px-4 sm:pt-16 lg:pt-14">
    <div className="flex items-end justify-between gap-4 px-1 sm:px-0">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <Link href="/productos" className="-my-2.5 inline-flex h-11 items-center gap-1 text-sm font-bold text-brand hover:text-brand-strong">
        Ver todo
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
    <div className="mt-5">
      {products.length ? <ProductGrid products={products} priority={priority} /> : <p className="text-zinc-500">Pronto vas a encontrar productos acá.</p>}
    </div>
  </section>
)
