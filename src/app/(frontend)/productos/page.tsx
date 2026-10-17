import type { Metadata } from 'next'
import { ProductListing } from '@/components/product/ProductListing'

export const metadata: Metadata = { title: 'Productos' }

type SearchParams = Promise<{ q?: string; sort?: string; page?: string }>

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, sort, page } = await searchParams
  return <ProductListing title="Todos los productos" q={q?.trim() || undefined} sort={sort} page={Number(page) || 1} basePath="/productos" />
}
