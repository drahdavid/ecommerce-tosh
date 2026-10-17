'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import type { Category } from '@/payload-types'

export const MobileMenu = ({ categories }: { categories: Category[] }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="md:hidden">
      <button className="flex h-10 w-10 items-center justify-center" onClick={() => setOpen(true)} aria-label="Abrir menú">
        <Menu className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <nav className="h-full w-72 bg-white p-6" onClick={(e) => e.stopPropagation()} aria-label="Menú">
            <button className="mb-6 flex h-10 w-10 items-center justify-center" onClick={() => setOpen(false)} aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
            <form action="/productos" className="mb-6" role="search" onSubmit={() => setOpen(false)}>
              <input name="q" placeholder="Buscar productos…" className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm" aria-label="Buscar" />
            </form>
            <ul className="space-y-4 text-base">
              <li>
                <Link href="/productos" onClick={() => setOpen(false)}>
                  Todos los productos
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/categoria/${c.slug}`} onClick={() => setOpen(false)}>
                    {c.title}
                  </Link>
                </li>
              ))}
              <li className="border-t border-zinc-200 pt-4">
                <Link href="/cuenta" onClick={() => setOpen(false)}>
                  Mi cuenta
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
