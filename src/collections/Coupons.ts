import type { CollectionConfig } from 'payload'
import { staff } from '@/access'

export const Coupons: CollectionConfig = {
  slug: 'coupons',
  labels: { singular: 'Cupón', plural: 'Cupones' },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'type', 'value', 'usageCount', 'usageLimit', 'expiresAt', 'active'],
    group: 'Ventas',
  },
  // Los cupones se validan en el servidor (Local API); el público no los lista.
  access: { read: staff, create: staff, update: staff, delete: staff },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'code',
          type: 'text',
          label: 'Código',
          required: true,
          unique: true,
          index: true,
          hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)] },
        },
        { name: 'active', type: 'checkbox', label: 'Activo', defaultValue: true },
      ],
    },
    { name: 'description', type: 'text', label: 'Descripción interna' },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          label: 'Tipo',
          required: true,
          defaultValue: 'percent',
          options: [
            { label: 'Porcentaje', value: 'percent' },
            { label: 'Monto fijo (ARS)', value: 'fixed' },
          ],
        },
        { name: 'value', type: 'number', label: 'Valor', required: true, min: 0, admin: { description: '% o pesos según el tipo.' } },
        { name: 'minSubtotal', type: 'number', label: 'Compra mínima (ARS)', min: 0, defaultValue: 0 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', label: 'Válido desde', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'expiresAt', type: 'date', label: 'Vence', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'usageLimit', type: 'number', label: 'Usos totales máx.', min: 1, admin: { description: 'Vacío = ilimitado.' } },
        { name: 'perCustomerLimit', type: 'number', label: 'Usos por email máx.', min: 1 },
        { name: 'usageCount', type: 'number', label: 'Usos', defaultValue: 0, admin: { readOnly: true } },
      ],
    },
  ],
}
