import type { CollectionConfig } from 'payload'
import { staff } from '@/access'

/** Log de notificaciones de pago. El índice único de `eventKey` garantiza idempotencia. */
export const PaymentEvents: CollectionConfig = {
  slug: 'payment-events',
  labels: { singular: 'Evento de pago', plural: 'Eventos de pago' },
  admin: {
    useAsTitle: 'eventKey',
    defaultColumns: ['mpPaymentId', 'status', 'order', 'source', 'createdAt'],
    group: 'Ventas',
  },
  access: { read: staff, create: () => false, update: () => false, delete: staff },
  fields: [
    { name: 'eventKey', type: 'text', required: true, unique: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'mpPaymentId', type: 'text', label: 'ID de pago MP', index: true },
        { name: 'status', type: 'text', label: 'Estado' },
        { name: 'statusDetail', type: 'text', label: 'Detalle' },
      ],
    },
    { name: 'order', type: 'relationship', relationTo: 'orders', label: 'Pedido' },
    {
      name: 'source',
      type: 'select',
      label: 'Origen',
      options: [
        { label: 'Webhook', value: 'webhook' },
        { label: 'Retorno del checkout', value: 'return' },
        { label: 'Reconciliación (cron)', value: 'reconcile' },
      ],
    },
    { name: 'raw', type: 'json', label: 'Respuesta de MP' },
  ],
}
