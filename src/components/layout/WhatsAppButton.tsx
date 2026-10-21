'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { whatsappLink } from '@/lib/whatsapp'

/**
 * Botón flotante de WhatsApp. En una ficha de producto precarga el mensaje con el link.
 * Se esconde mientras se ve otro link de WhatsApp de la página (marcado con `data-whatsapp-cta`) para no taparlo.
 */
export const WhatsAppButton = ({ number }: { number: string }) => {
  const pathname = usePathname()
  const [ctaVisible, setCtaVisible] = useState(false)

  useEffect(() => {
    const targets = document.querySelectorAll('[data-whatsapp-cta]')
    if (!targets.length) return
    const visible = new Set<Element>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target)
        else visible.delete(entry.target)
      }
      setCtaVisible(visible.size > 0)
    })
    targets.forEach((t) => observer.observe(t))
    return () => {
      observer.disconnect()
      setCtaVisible(false)
    }
  }, [pathname])

  if (pathname.startsWith('/checkout')) return null
  const isProduct = pathname.startsWith('/productos/')
  const baseHref = whatsappLink(number, 'Hola! Tengo una consulta')

  return (
    <a
      href={baseHref}
      // El link al producto se arma al hacer click: usar `window` durante el render rompe la hidratación.
      onClick={(e) => {
        if (!isProduct) return
        e.currentTarget.href = whatsappLink(number, `Hola! Tengo una consulta sobre este producto: ${window.location.href}`)
      }}
      target="_blank"
      rel="noreferrer"
      aria-label="Consultanos por WhatsApp"
      aria-hidden={ctaVisible || undefined}
      tabIndex={ctaVisible ? -1 : undefined}
      className={cn(
        'fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition duration-300 hover:scale-105',
        // En mobile la ficha tiene una barra de compra fija abajo: el botón se ubica encima.
        isProduct ? 'bottom-24 sm:bottom-4' : 'bottom-4',
        ctaVisible && 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.750-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.43 9.43 0 0 1-4.8-1.31l-.35-.2-3.57.93.96-3.48-.23-.36a9.42 9.42 0 0 1-1.44-5.030c0-5.2 4.24-9.44 9.45-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.680c0 5.21-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.6 23.3l5.7-1.5a11.33 11.33 0 0 0 5.74 1.47h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z" />
      </svg>
    </a>
  )
}
