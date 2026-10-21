import Image from 'next/image'
import Link from 'next/link'
import { LOGO, logoWidth } from '@/lib/brand'
import type { Media, StoreSetting } from '@/payload-types'
import { whatsappLink } from '@/lib/whatsapp'

const heading = 'text-xs font-bold tracking-wider text-zinc-500 uppercase'

export const Footer = ({ settings, pages }: { settings: StoreSetting; pages: { id: number; title: string; slug?: string | null }[] }) => {
  const qr = settings.dataFiscalImage && typeof settings.dataFiscalImage === 'object' ? (settings.dataFiscalImage as Media) : null
  return (
    <footer className="mt-16 border-t border-zinc-200/70 bg-white sm:mt-24">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-4 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Image src={LOGO.src} alt="" width={logoWidth(32)} height={32} />
            <p className="text-lg font-extrabold tracking-tight">{settings.storeName}</p>
          </div>
          {settings.tagline ? <p className="mt-2 text-sm text-zinc-600">{settings.tagline}</p> : null}
          <div className="mt-4 flex gap-4 text-sm font-semibold">
            {settings.instagram ? <a href={settings.instagram} target="_blank" rel="noreferrer" className="hover:text-brand">Instagram</a> : null}
            {settings.facebook ? <a href={settings.facebook} target="_blank" rel="noreferrer" className="hover:text-brand">Facebook</a> : null}
            {settings.tiktok ? <a href={settings.tiktok} target="_blank" rel="noreferrer" className="hover:text-brand">TikTok</a> : null}
          </div>
        </div>
        <div>
          <p className={heading}>Ayuda</p>
          <ul className="mt-4 space-y-3 text-sm">
            {pages.map((p) => (
              <li key={p.id}>
                <Link href={`/legales/${p.slug}`} className="hover:text-brand">
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cuenta" className="hover:text-brand">
                Mi cuenta y pedidos
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className={heading}>Contacto</p>
          <ul className="mt-4 space-y-3 text-sm">
            {settings.contactEmail ? <li className="break-words"><a href={`mailto:${settings.contactEmail}`} className="hover:text-brand">{settings.contactEmail}</a></li> : null}
            {settings.whatsappNumber ? <li><a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noreferrer" className="hover:text-brand">WhatsApp</a></li> : null}
            {settings.address ? <li className="text-zinc-600">{settings.address}</li> : null}
          </ul>
          {/* Res. SC 424/2020: el botón de arrepentimiento debe ser visible y de fácil acceso. */}
          <Link
            href="/arrepentimiento"
            className="mt-5 inline-flex min-h-10 items-center rounded-full border border-zinc-900 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-900 hover:text-white"
          >
            Botón de arrepentimiento
          </Link>
        </div>
        <div className="col-span-2 flex flex-col gap-3 text-xs text-zinc-500 lg:col-span-1">
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
