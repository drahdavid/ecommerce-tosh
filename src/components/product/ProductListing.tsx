import Link from 'next/link'
import type { Category } from '@/payload-types'
import { getCategories, getProductCards } from '@/lib/data/catalog'
import { cn } from '@/lib/utils'
import { ProductGrid } from './ProductCard'

const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más nuevos' },
  { value: 'precio-asc', label: 'Menor precio' },
  { value: 'precio-desc', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre' },
]

type Props = { title: string; description?: string | null; category?: Category | null; q?: string; sort?: string; page?: number; basePath: string }

export const ProductListing = async ({ title, description, category, q, sort, page = 1, basePath }: Props) => {
  const [result, categories] = await Promise.all([
    getProductCards({ q, sort, page, category: category?.slug ?? undefined }),
    getCategories(),
  ])
  const parentId = (c: Category) => (c.parent && typeof c.parent === 'object' ? c.parent.id : c.parent)
  const subcategories = category ? categories.filter((c) => parentId(c) === category.id) : categories.filter((c) => !c.parent)
  const href = (params: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams()
    const merged = { q, sort, ...params }
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== '' && !(k === 'page' && String(v) === '1')) sp.set(k, String(v))
    const s = sp.toString()
    return s ? `${basePath}?${s}` : basePath
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-8 sm:px-4 sm:py-10">
      <nav className="px-1 text-xs text-zinc-500 sm:px-0" aria-label="Migas de pan">
        <Link href="/" className="hover:text-brand">Inicio</Link> / <Link href="/productos" className="hover:text-brand">Productos</Link>
        {category ? <> / <span className="text-zinc-700">{category.title}</span></> : null}
      </nav>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 px-1 sm:px-0">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{q ? `Resultados para “${q}”` : title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-zinc-600">{description}</p> : null}
          <p className="mt-1 text-sm text-zinc-500">{result.totalDocs} productos</p>
        </div>
        <form className="flex items-center gap-2" action={basePath}>
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <label htmlFor="sort" className="text-sm font-semibold text-zinc-600">
            Ordenar
          </label>
          <select id="sort" name="sort" defaultValue={sort ?? 'recientes'} className="h-10 rounded-full border border-zinc-300 bg-white pr-8 pl-4 text-sm font-medium">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="h-10 rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700">Aplicar</button>
        </form>
      </div>

      {subcategories.length ? (
        <div className="no-scrollbar -mx-3 mt-6 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {subcategories.map((c) => (
            <Link
              key={c.id}
              href={`/categoria/${c.slug}`}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-card transition hover:bg-zinc-900 hover:text-white"
            >
              {c.title}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6 sm:mt-8">
        {result.cards.length ? (
          <ProductGrid products={result.cards} />
        ) : (
          <p className="py-16 text-center text-zinc-500">No encontramos productos{q ? ' con esa búsqueda' : ''}.</p>
        )}
      </div>

      {result.totalPages > 1 ? (
        <nav className="mt-12 flex flex-wrap justify-center gap-2" aria-label="Paginación">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ page: n })}
              aria-current={n === result.page ? 'page' : undefined}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition',
                n === result.page ? 'bg-zinc-900 text-white' : 'bg-white shadow-card hover:bg-zinc-100',
              )}
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  )
}
