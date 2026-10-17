import type { CollectionConfig } from 'payload'
import { anyone, staff } from '@/access'

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
    mimeTypes: ['image/*', 'application/pdf'],
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
