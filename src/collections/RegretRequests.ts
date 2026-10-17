import type { CollectionConfig } from 'payload'
import { staff } from '@/access'

/**
 * Botón de arrepentimiento (Res. SC 424/2020): el consumidor puede revocar la compra dentro de
 * los 10 días corridos sin registrarse, y el proveedor debe informarle un código de
 * identificación dentro de las 24 h.
 */
export const RegretRequests: CollectionConfig = {
  slug: 'regret-requests',
  labels: { singular: 'Arrepentimiento', plural: 'Arrepentimientos' },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'orderNumber', 'email', 'status', 'createdAt'],
    group: 'Ventas',
  },
  access: { read: staff, create: () => false, update: staff, delete: staff },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'code', type: 'text', label: 'Código', unique: true, admin: { readOnly: true } },
        {
          name: 'status',
          type: 'select',
          label: 'Estado',
          defaultValue: 'received',
          options: [
            { label: 'Recibida', value: 'received' },
            { label: 'En proceso', value: 'processing' },
            { label: 'Cerrada', value: 'closed' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'orderNumber', type: 'text', label: 'N° de pedido', required: true },
        { name: 'order', type: 'relationship', relationTo: 'orders', label: 'Pedido' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Nombre', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'phone', type: 'text', label: 'Teléfono' },
      ],
    },
    { name: 'reason', type: 'textarea', label: 'Comentario' },
  ],
}
