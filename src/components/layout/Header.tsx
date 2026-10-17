import Link from 'next/link'
import { Search, User } from 'lucide-react'
import type { Category } from '@/payload-types'
import { CartButton } from './CartButton'
import { MobileMenu } from './MobileMenu'

export const Header = ({ storeName, categories }: { storeName: string; categories: Category[] }) => {
  const topLevel = categories.filter((c) => !c.parent)
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <MobileMenu categories={topLevel} />
        <Link href="/" className="text-xl font-bold tracking-tight">
          {storeName}
        </Link>
        <nav className="ml-6 hidden items-center gap-5 text-sm md:flex" aria-label="Categorías">
          <Link href="/productos" className="hover:text-zinc-500">
            Todo
          </Link>
          {topLevel.slice(0, 6).map((c) => (
            <Link key={c.id} href={`/categoria/${c.slug}`} className="hover:text-zinc-500">
              {c.title}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <form action="/productos" className="hidden items-center sm:flex" role="search">
            <label htmlFor="header-search" className="sr-only">
              Buscar productos
            </label>
            <input
              id="header-search"
              name="q"
              placeholder="Buscar…"
              className="h-9 w-44 rounded-l-md border border-r-0 border-zinc-300 px-3 text-sm focus:outline-none lg:w-64"
            />
            <button className="flex h-9 w-9 items-center justify-center rounded-r-md border border-zinc-300" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </button>
          </form>
          <Link href="/productos" className="flex h-10 w-10 items-center justify-center sm:hidden" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/cuenta" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-zinc-100" aria-label="Mi cuenta">
            <User className="h-5 w-5" />
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  )
}
