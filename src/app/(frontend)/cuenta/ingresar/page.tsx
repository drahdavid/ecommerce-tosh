import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForms } from '@/components/account/AuthForms'
import { getCurrentCustomer } from '@/lib/data/auth'

export const metadata: Metadata = { title: 'Ingresar', robots: { index: false } }

type SearchParams = Promise<{ next?: string }>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/cuenta'
  if (await getCurrentCustomer()) redirect(safeNext)
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <AuthForms next={safeNext} />
    </div>
  )
}
