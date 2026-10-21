/* eslint-disable @next/next/no-img-element -- el admin de Payload no pasa por next/image */
import type { ServerProps } from 'payload'
import { LOGO, logoWidth } from '@/lib/brand'

/** Ícono del menú del admin (reemplaza el de Payload). */
export const BrandIcon = () => <img src={LOGO.src} alt="" width={logoWidth(24)} height={24} />

/** Logo de la pantalla de login del admin: isotipo y nombre de la tienda. */
export const BrandLogo = async ({ payload }: ServerProps) => {
  const settings = await payload.findGlobal({ slug: 'store-settings', depth: 0 })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <img src={LOGO.src} alt="" width={logoWidth(56)} height={56} />
      <span style={{ fontSize: 26, fontWeight: 700 }}>{settings.storeName}</span>
    </div>
  )
}
