import Image from 'next/image'
import Link from 'next/link'
import { Search, User } from 'lucide-react'
import { LOGO, logoWidth } from '@/lib/brand'
import type { Category } from '@/payload-types'
import { cn } from '@/lib/utils'
import { CartButton } from './CartButton'
import { CategoryNav } from './CategoryNav'
import { MobileMenu } from './MobileMenu'

const SearchForm = ({ id, className }: { id: string; className?: string }) => (
  <form action="/productos" role="search" className={cn('flex h-11 items-center gap-2 rounded-full bg-zinc-100 pr-1 pl-4 transition focus-within:ring-4 focus-within:ring-brand/15', className)}>
    <label htmlFor={id} className="sr-only">
      Buscar productos
    </label>
    <input
      id={id}
      name="q"
      type="search"
      placeholder="¿Qué estás buscando?"
      className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-zinc-500 focus:outline-none sm:text-sm"
    />
    <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700" aria-label="Buscar">
      <Search className="h-4 w-4" />
    </button>
  </form>
)

export const Header = ({ storeName, categories, whatsappNumber }: { storeName: string; categories: Category[]; whatsappNumber?: string | null }) => {
  // Solo lo que usan los componentes cliente: no serializar la categoría entera.
  const topLevel = categories.filter((c) => !c.parent).map((c) => ({ id: c.id, slug: c.slug, title: c.title }))
  return (
    <>
      {/* Fondo sólido: un backdrop-filter acá encerraría al menú mobile (position: fixed) dentro del header.
          z-50: el menú vive dentro de esta capa y tiene que tapar al botón de WhatsApp (z-40). */}
      <header className="sticky top-0 z-50 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-4 md:gap-6">
          <MobileMenu categories={topLevel} storeName={storeName} whatsappNumber={whatsappNumber} />
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src={LOGO.src} alt="" width={logoWidth(36)} height={36} priority className="shrink-0" />
            {/* En mobile no entra en una línea junto a los íconos: se parte en dos, más chico. */}
            <span className="text-base leading-tight font-extrabold tracking-tight sm:text-xl">{storeName}</span>
          </Link>
          {/* Centrado entre el logo y los íconos, como en las tiendas grandes. */}
          <SearchForm id="header-search" className="mx-auto hidden max-w-2xl flex-1 md:flex" />
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link
              href="/cuenta"
              className="flex h-11 w-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition hover:bg-zinc-100 lg:w-auto lg:px-3"
              aria-label="Mi cuenta"
            >
              <User className="h-5 w-5" />
              <span className="hidden lg:inline" aria-hidden="true">
                Mi cuenta
              </span>
            </Link>
            <CartButton />
          </div>
        </div>
        <div className="px-3 pb-3 md:hidden">
          <SearchForm id="header-search-mobile" />
        </div>
      </header>
      <CategoryNav categories={topLevel.slice(0, 8)} />
    </>
  )
}
