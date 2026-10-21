import type { CollectionConfig } from 'payload'
import { publishedOrStaff, staff } from '@/access'
import { slugField } from '@/fields/slug'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Producto', plural: 'Productos' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'currency', 'price', 'category', '_status', 'updatedAt'],
    group: 'Catálogo',
    preview: (doc) => `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/productos/${doc.slug}`,
  },
  versions: { drafts: true },
  // Sin readVersions explícito Payload deja ver los borradores a cualquier usuario logueado (también clientes).
  access: { read: publishedOrStaff, readVersions: staff, create: staff, update: staff, delete: staff },
  fields: [
    { name: 'title', type: 'text', label: 'Nombre', required: true },
    slugField(),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Categoría',
      hasMany: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Destacado en la home',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            {
              name: 'images',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              label: 'Fotos',
              admin: { description: 'La primera es la portada. Arrastrá para reordenar.' },
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              label: 'Descripción corta',
              maxLength: 300,
            },
            { name: 'description', type: 'richText', label: 'Descripción' },
          ],
        },
        {
          label: 'Precio',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'currency',
                  type: 'select',
                  label: 'Moneda',
                  required: true,
                  defaultValue: 'ARS',
                  options: [
                    { label: 'Pesos (ARS)', value: 'ARS' },
                    { label: 'Dólares (USD)', value: 'USD' },
                  ],
                  admin: {
                    description: 'Si es USD, se muestra y cobra en pesos al dólar oficial BNA vigente.',
                  },
                },
                { name: 'price', type: 'number', label: 'Precio', required: true, min: 0 },
                {
                  name: 'compareAtPrice',
                  type: 'number',
                  label: 'Precio anterior (tachado)',
                  min: 0,
                  admin: { description: 'Opcional, para mostrar descuento.' },
                },
              ],
            },
            {
              name: 'taxRate',
              type: 'select',
              label: 'Alícuota de IVA incluida',
              required: true,
              defaultValue: '21',
              options: [
                { label: '21%', value: '21' },
                { label: '10,5%', value: '10.5' },
                { label: '0% / Exento', value: '0' },
              ],
              admin: {
                description: 'Se usa para informar el precio sin impuestos nacionales (Ley 27.743).',
              },
            },
          ],
        },
        {
          label: 'Variantes y stock',
          fields: [
            {
              name: 'options',
              type: 'array',
              label: 'Opciones',
              labels: { singular: 'Opción', plural: 'Opciones' },
              admin: {
                description:
                  'Ej.: Talle (S, M, L) y Color (Negro, Blanco). Cada combinación se carga como variante abajo, con su propio SKU y stock.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', label: 'Nombre', required: true },
                    { name: 'values', type: 'text', hasMany: true, label: 'Valores', required: true },
                  ],
                },
              ],
            },
            {
              name: 'variants',
              type: 'join',
              collection: 'variants',
              on: 'product',
              label: 'Variantes (stock, SKU, precio)',
              admin: {
                defaultColumns: ['label', 'sku', 'stock', 'priceOverride', 'active'],
                description:
                  'Todo producto tiene al menos una variante. Si no usás opciones, se crea una "Única" automáticamente al guardar: cargale el stock.',
              },
            },
          ],
        },
        {
          label: 'Envío',
          description: 'Peso y medidas del producto embalado, por unidad. Se usan para cotizar el envío.',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'weightGrams', type: 'number', label: 'Peso (g)', required: true, defaultValue: 500, min: 1 },
                { name: 'lengthCm', type: 'number', label: 'Largo (cm)', required: true, defaultValue: 20, min: 1 },
                { name: 'widthCm', type: 'number', label: 'Ancho (cm)', required: true, defaultValue: 15, min: 1 },
                { name: 'heightCm', type: 'number', label: 'Alto (cm)', required: true, defaultValue: 10, min: 1 },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({
            collection: 'variants',
            where: { product: { equals: doc.id } },
            req,
          })
          if (totalDocs === 0) {
            await req.payload.create({
              collection: 'variants',
              data: { product: doc.id, sku: doc.slug || `P${doc.id}`, stock: 0, active: true },
              req,
            })
          }
        }
        safeRevalidate(TAGS.products, TAGS.product(doc.slug))
        return doc
      },
    ],
    afterDelete: [({ doc }) => safeRevalidate(TAGS.products, TAGS.product(doc.slug))],
  },
}
