import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-medium text-zinc-500">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="mt-3 text-zinc-600">Puede que el producto ya no esté disponible o que el link sea incorrecto.</p>
      <Link href="/productos" className={`${buttonVariants()} mt-8`}>
        Ver productos
      </Link>
    </div>
  )
}
