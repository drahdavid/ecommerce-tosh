import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPageBySlug } from '@/lib/data/catalog'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await getPageBySlug((await params).slug)
  return page ? { title: page.meta?.title || page.title, description: page.meta?.description ?? undefined } : {}
}

export default async function LegalPage({ params }: { params: Params }) {
  const page = await getPageBySlug((await params).slug)
  if (!page) notFound()
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      {page.content ? <RichText data={page.content} className="prose-content mt-6" /> : null}
    </article>
  )
}
