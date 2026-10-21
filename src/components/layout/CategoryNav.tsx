'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavCategory = { id: number; slug?: string | null; title: string }

/** Chips de categorías debajo del header. En mobile se deslizan de costado. */
export const CategoryNav = ({ categories }: { categories: NavCategory[] }) => {
  const pathname = usePathname()
  if (pathname.startsWith('/checkout')) return null
  const items = [{ href: '/productos', label: 'Todo' }, ...categories.map((c) => ({ href: `/categoria/${c.slug}`, label: c.title }))]

  return (
    <nav aria-label="Categorías" className="border-b border-zinc-200/70 bg-white">
      <ul className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-3 pb-3 sm:px-4">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition',
                  active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
