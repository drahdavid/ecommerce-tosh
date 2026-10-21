import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { getPayloadClient } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Confirmar email', robots: { index: false } }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ token?: string }>

export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams
  let ok = false
  if (token) {
    const payload = await getPayloadClient()
    ok = await payload.verifyEmail({ collection: 'customers', token }).catch(() => false)
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold">{ok ? '¡Email confirmado!' : 'El link no es válido'}</h1>
      <p className="mt-3 text-zinc-600">{ok ? 'Ya podés ingresar a tu cuenta.' : 'Puede que ya lo hayas usado o que haya vencido.'}</p>
      <Link href="/cuenta/ingresar" className={`${buttonVariants()} mt-8`}>
        Ingresar
      </Link>
    </div>
  )
}
