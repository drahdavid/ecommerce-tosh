import type { CollectionConfig } from 'payload'
import { publishedOrStaff, staff } from '@/access'
import { slugField } from '@/fields/slug'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

/** Páginas de contenido: términos, privacidad, cambios y devoluciones, envíos, etc. */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Página', plural: 'Páginas' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'showInFooter'], group: 'Contenido' },
  versions: { drafts: true },
  access: { read: publishedOrStaff, create: staff, update: staff, delete: staff },
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    slugField(),
    { name: 'showInFooter', type: 'checkbox', label: 'Mostrar en el pie', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'content', type: 'richText', label: 'Contenido' },
  ],
  hooks: {
    afterChange: [() => safeRevalidate(TAGS.pages)],
  },
}
