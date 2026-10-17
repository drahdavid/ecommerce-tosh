import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { CartProvider } from '@/components/cart/CartProvider'
import { Analytics } from '@/components/layout/Analytics'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { getCategories, getFooterPages, getSettings } from '@/lib/data/catalog'
import './styles.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const name = settings.storeName || 'Tienda'
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3100'),
    title: { default: name, template: `%s | ${name}` },
    description: settings.tagline ?? `Tienda online ${name}`,
    openGraph: { siteName: name, locale: 'es_AR', type: 'website' },
  }
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const [settings, categories, pages] = await Promise.all([getSettings(), getCategories(), getFooterPages()])
  return (
    <html lang="es-AR" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <CartProvider>
          {settings.announcement ? (
            <div className="bg-zinc-900 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">{settings.announcement}</div>
          ) : null}
          <Header storeName={settings.storeName || 'Tienda'} categories={categories} />
          <main className="flex-1">{children}</main>
          <Footer settings={settings} pages={pages} />
          {settings.whatsappNumber ? <WhatsAppButton number={settings.whatsappNumber} /> : null}
        </CartProvider>
        <Analytics ga4Id={settings.ga4Id ?? process.env.NEXT_PUBLIC_GA4_ID} metaPixelId={settings.metaPixelId ?? process.env.NEXT_PUBLIC_META_PIXEL_ID} />
      </body>
    </html>
  )
}
