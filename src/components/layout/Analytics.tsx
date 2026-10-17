'use client'

import Script from 'next/script'
import { createLocalStore, useHydrated } from '@/lib/localStore'

type Consent = 'granted' | 'denied' | null

const consentStore = createLocalStore<Consent>('consent:analytics', null, (raw) => (raw === 'granted' || raw === 'denied' ? raw : null))

/** GA4 + Meta Pixel. Solo se cargan si el visitante acepta las cookies de medición. */
export const Analytics = ({ ga4Id, metaPixelId }: { ga4Id?: string | null; metaPixelId?: string | null }) => {
  const stored = consentStore.useValue()
  const hydrated = useHydrated()
  // Antes de hidratar no se muestra el banner ni se cargan scripts.
  const consent: Consent | 'unknown' = hydrated ? stored : 'unknown'

  if (!ga4Id && !metaPixelId) return null

  const decide = (value: 'granted' | 'denied') => consentStore.set(value)

  return (
    <>
      {consent === 'granted' && ga4Id ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id}');`}
          </Script>
        </>
      ) : null}
      {consent === 'granted' && metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}
      {consent === null ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm sm:rounded-lg sm:border">
          <p className="text-sm text-zinc-700">
            Usamos cookies de medición para mejorar la tienda. ¿Nos das permiso?
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide('granted')} className="h-9 rounded-md bg-zinc-900 px-4 text-sm text-white">
              Aceptar
            </button>
            <button onClick={() => decide('denied')} className="h-9 rounded-md border border-zinc-300 px-4 text-sm">
              Rechazar
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

type Item = { item_id: string; item_name: string; price: number; quantity: number }

/** Eventos de ecommerce (GA4 + equivalentes de Meta). No hace nada sin consentimiento. */
export const track = (event: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase', params: { value: number; items: Item[]; transaction_id?: string }) => {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void }
  w.gtag?.('event', event, { currency: 'ARS', ...params })
  const meta = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' }[event]
  w.fbq?.('track', meta, { currency: 'ARS', value: params.value, content_ids: params.items.map((i) => i.item_id), content_type: 'product' })
}
