import Image from 'next/image'
import Link from 'next/link'
import { LOGO, logoWidth } from '@/lib/brand'
import type { Media, StoreSetting } from '@/payload-types'
import { whatsappLink } from '@/lib/whatsapp'

export const Footer = ({ settings, pages }: { settings: StoreSetting; pages: { id: number; title: string; slug?: string | null }[] }) => {
  const qr = settings.dataFiscalImage && typeof settings.dataFiscalImage === 'object' ? (settings.dataFiscalImage as Media) : null
  return (
    <footer className="mt-24 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Image src={LOGO.src} alt="" width={logoWidth(32)} height={32} />
            <p className="text-lg font-bold">{settings.storeName}</p>
          </div>
          {settings.tagline ? <p className="mt-2 text-sm text-zinc-600">{settings.tagline}</p> : null}
          <div className="mt-4 flex gap-4 text-sm">
            {settings.instagram ? <a href={settings.instagram} target="_blank" rel="noreferrer">Instagram</a> : null}
            {settings.facebook ? <a href={settings.facebook} target="_blank" rel="noreferrer">Facebook</a> : null}
            {settings.tiktok ? <a href={settings.tiktok} target="_blank" rel="noreferrer">TikTok</a> : null}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Ayuda</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {pages.map((p) => (
              <li key={p.id}>
                <Link href={`/legales/${p.slug}`} className="hover:text-zinc-900">
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cuenta" className="hover:text-zinc-900">
                Mi cuenta y pedidos
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {settings.contactEmail ? <li><a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></li> : null}
            {settings.whatsappNumber ? <li><a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noreferrer">WhatsApp</a></li> : null}
            {settings.address ? <li>{settings.address}</li> : null}
          </ul>
          {/* Res. SC 424/2020: el botón de arrepentimiento debe ser visible y de fácil acceso. */}
          <Link
            href="/arrepentimiento"
            className="mt-5 inline-flex h-10 items-center rounded-md border border-zinc-900 px-4 text-sm font-medium hover:bg-zinc-900 hover:text-white"
          >
            Botón de arrepentimiento
          </Link>
        </div>
        <div className="flex flex-col gap-3 text-xs text-zinc-500">
          {qr?.url ? (
            <a href={settings.dataFiscalUrl ?? '#'} target="_blank" rel="noreferrer" className="w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.url} alt="Data Fiscal ARCA" width={80} height={110} />
            </a>
          ) : settings.dataFiscalUrl ? (
            <a href={settings.dataFiscalUrl} target="_blank" rel="noreferrer" className="underline">
              Data Fiscal
            </a>
          ) : null}
          <p>
            {settings.legalName ? `${settings.legalName} · ` : ''}
            {settings.cuit ? `CUIT ${settings.cuit}` : ''}
          </p>
          <p>Precios en pesos argentinos, IVA incluido.</p>
          <p>© {new Date().getFullYear()} {settings.storeName}</p>
        </div>
      </div>
    </footer>
  )
}
