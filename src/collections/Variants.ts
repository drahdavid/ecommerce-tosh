import type { CollectionConfig } from 'payload'
import { anyone, staff } from '@/access'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

/**
 * Variante vendible de un producto (ej. "M / Negro"). El stock vive SIEMPRE acá:
 * los productos simples tienen una única variante "Única".
 * El stock se descuenta con UPDATE condicional atómico al crear la orden (ver lib/orders/stock.ts).
 */
export const Variants: CollectionConfig = {
  slug: 'variants',
  labels: { singular: 'Variante', plural: 'Variantes' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'stock', 'priceOverride', 'active'],
    group: 'Catálogo',
  },
  access: { read: anyone, create: staff, update: staff, delete: staff },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'Producto',
      required: true,
      index: true,
    },
    {
      name: 'options',
      type: 'array',
      label: 'Valores de opciones',
      admin: { description: 'Ej.: Talle = M, Color = Negro. Dejalo vacío para productos sin variantes.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', label: 'Opción', required: true },
            { name: 'value', type: 'text', label: 'Valor', required: true },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'sku', type: 'text', label: 'SKU', required: true, unique: true, index: true },
        { name: 'stock', type: 'number', label: 'Stock', required: true, defaultValue: 0, min: 0 },
        {
          name: 'priceOverride',
          type: 'number',
          label: 'Precio propio (opcional)',
          min: 0,
          admin: { description: 'En la moneda del producto. Vacío = precio del producto.' },
        },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Foto de la variante' },
    { name: 'active', type: 'checkbox', label: 'Activa', defaultValue: true },
    { name: 'label', type: 'text', label: 'Etiqueta', admin: { readOnly: true, hidden: true } },
    { name: 'title', type: 'text', label: 'Título', admin: { readOnly: true, hidden: true } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        const options = (data.options ?? originalDoc?.options ?? []) as { value?: string }[]
        data.label = options.length ? options.map((o) => o.value).join(' / ') : 'Única'
        const productId = data.product ?? originalDoc?.product
        const id = typeof productId === 'object' ? productId?.id : productId
        if (id) {
          const product = await req.payload
            .findByID({ collection: 'products', id, depth: 0, draft: true, req, select: { title: true } })
            .catch(() => null)
          data.title = product ? `${product.title} — ${data.label}` : data.label
        }
        return data
      },
    ],
    afterChange: [() => safeRevalidate(TAGS.products)],
  },
}
