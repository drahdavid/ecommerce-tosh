import type { CollectionConfig } from 'payload'
import { anyone, staff } from '@/access'
import { slugField } from '@/fields/slug'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Categoría', plural: 'Categorías' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'parent', 'order'],
    group: 'Catálogo',
  },
  access: { read: anyone, create: staff, update: staff, delete: staff },
  defaultSort: 'order',
  fields: [
    { name: 'title', type: 'text', label: 'Nombre', required: true },
    slugField(),
    { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Categoría padre', admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Orden', defaultValue: 0, admin: { position: 'sidebar' } },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagen' },
    { name: 'description', type: 'textarea', label: 'Descripción' },
  ],
  hooks: {
    afterChange: [() => safeRevalidate(TAGS.categories, TAGS.products)],
    afterDelete: [() => safeRevalidate(TAGS.categories, TAGS.products)],
  },
}
