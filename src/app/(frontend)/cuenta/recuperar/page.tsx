import type { Metadata } from 'next'
import { PasswordRecovery } from '@/components/account/PasswordRecovery'

export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false } }

type SearchParams = Promise<{ token?: string }>

export default async function RecoverPage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PasswordRecovery token={token ?? null} />
    </div>
  )
}
