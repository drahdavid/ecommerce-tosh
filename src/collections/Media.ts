import type { CollectionConfig } from 'payload'
import { anyone, staff } from '@/access'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

// Productos, categorías, portada y páginas cachean la URL de sus imágenes: al reemplazar o
// borrar un archivo, esas URLs dejan de existir.
const revalidateImageUsers = () => safeRevalidate(TAGS.products, TAGS.categories, TAGS.settings, TAGS.pages)

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Imagen', plural: 'Imágenes' },
  admin: { group: 'Catálogo' },
  access: {
    read: anyone,
    create: staff,
    update: staff,
    delete: staff,
  },
  hooks: {
    afterChange: [revalidateImageUsers],
    afterDelete: [revalidateImageUsers],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Texto alternativo',
      required: true,
      admin: { description: 'Describe la imagen (accesibilidad y SEO).' },
    },
  ],
  upload: {
    // Lista explícita: 'image/*' incluye SVG (puede llevar scripts) y todo Media es público,
    // así que tampoco va ningún PDF (facturas, comprobantes): esos se guardan fuera, como URL.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    focalPoint: true,
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, position: 'centre' },
      { name: 'card', width: 640, height: 640, position: 'centre' },
      { name: 'large', width: 1400 },
    ],
    adminThumbnail: 'thumbnail',
  },
}
