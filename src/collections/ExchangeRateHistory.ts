import type { CollectionConfig } from 'payload'
import { staff } from '@/access'

export const ExchangeRateHistory: CollectionConfig = {
  slug: 'exchange-rate-history',
  labels: { singular: 'Cotización registrada', plural: 'Historial de cotización' },
  admin: {
    defaultColumns: ['sell', 'buy', 'source', 'accepted', 'createdAt'],
    group: 'Configuración',
  },
  access: { read: staff, create: () => false, update: () => false, delete: staff },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'sell', type: 'number', label: 'Venta' },
        { name: 'buy', type: 'number', label: 'Compra' },
        { name: 'source', type: 'text', label: 'Fuente' },
      ],
    },
    { name: 'apiUpdatedAt', type: 'date', label: 'Actualizada en la fuente' },
    { name: 'accepted', type: 'checkbox', label: 'Aceptada' },
    { name: 'note', type: 'text', label: 'Nota' },
  ],
}
