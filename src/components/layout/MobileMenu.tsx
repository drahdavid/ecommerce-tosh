'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Menu, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { LOGO, logoWidth } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { whatsappLink } from '@/lib/whatsapp'

type MenuCategory = { id: number; slug?: string | null; title: string }

const itemClass = 'flex h-12 items-center justify-between gap-3 rounded-xl px-3 text-base font-semibold transition hover:bg-zinc-50'

export const MobileMenu = ({ categories, storeName, whatsappNumber }: { categories: MenuCategory[]; storeName: string; whatsappNumber?: string | null }) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Mientras está abierto: Escape lo cierra y la página de atrás no scrollea.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-zinc-100"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div
        className={cn('fixed inset-0 z-50 bg-zinc-950/40 transition-opacity duration-300', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={close}
        aria-hidden="true"
      />
      <nav
        id="mobile-menu"
        aria-label="Menú"
        inert={!open}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-zinc-100 pr-2 pl-4">
          <span className="flex items-center gap-2 font-extrabold tracking-tight">
            <Image src={LOGO.src} alt="" width={logoWidth(30)} height={30} />
            {storeName}
          </span>
          <button className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-zinc-100" onClick={close} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-3">
          <li>
            <Link href="/productos" onClick={close} className={itemClass}>
              Todos los productos
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/categoria/${c.slug}`} onClick={close} className={itemClass}>
                {c.title}
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-zinc-100 p-3">
          <Link href="/cuenta" onClick={close} className={cn(itemClass, 'justify-start')}>
            <User className="h-5 w-5" />
            Mi cuenta
          </Link>
          {whatsappNumber ? (
            <a
              href={whatsappLink(whatsappNumber, 'Hola! Tengo una consulta')}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: 'lime', size: 'lg' }), 'w-full')}
            >
              Escribinos por WhatsApp
            </a>
          ) : null}
        </div>
      </nav>
    </div>
  )
}
