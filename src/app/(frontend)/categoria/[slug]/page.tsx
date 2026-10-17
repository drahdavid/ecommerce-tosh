import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductListing } from '@/components/product/ProductListing'
import { getCategories } from '@/lib/data/catalog'

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ sort?: string; page?: string }>

const findCategory = async (slug: string) => (await getCategories()).find((c) => c.slug === slug) ?? null

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = await findCategory((await params).slug)
  if (!category) return {}
  return {
    title: category.meta?.title || category.title,
    description: category.meta?.description || category.description || undefined,
    alternates: { canonical: `/categoria/${category.slug}` },
  }
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params
  const { sort, page } = await searchParams
  const category = await findCategory(slug)
  if (!category) notFound()
  return (
    <ProductListing
      title={category.title}
      description={category.description}
      category={category}
      sort={sort}
      page={Number(page) || 1}
      basePath={`/categoria/${slug}`}
    />
  )
}
