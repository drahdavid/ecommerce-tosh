import type { CollectionConfig } from 'payload'
import { staff } from '@/access'
import { PROVINCES } from '@/lib/shipping/types'

/** Tabla de tarifas propia: zonas por provincia o rango de CP, con tramos de peso. */
export const ShippingZones: CollectionConfig = {
  slug: 'shipping-zones',
  labels: { singular: 'Zona de envío', plural: 'Zonas de envío' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'priority', 'active'],
    group: 'Envíos',
    description:
      'Tarifas manuales para "Envío a domicilio". Se busca primero por rango de CP y después por provincia; ante varias coincidencias gana la de mayor prioridad.',
  },
  access: { read: staff, create: staff, update: staff, delete: staff },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Nombre', required: true },
        { name: 'priority', type: 'number', label: 'Prioridad', defaultValue: 0 },
        { name: 'active', type: 'checkbox', label: 'Activa', defaultValue: true },
      ],
    },
    {
      name: 'provinces',
      type: 'select',
      hasMany: true,
      label: 'Provincias',
      options: PROVINCES.map((p) => ({ label: p, value: p })),
    },
    {
      name: 'postalRanges',
      type: 'array',
      label: 'Rangos de código postal',
      admin: { description: 'Opcional. Ej.: AMBA 1600–1899. Usa los 4 dígitos del CP.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'from', type: 'number', label: 'Desde', required: true, min: 1000, max: 9999 },
            { name: 'to', type: 'number', label: 'Hasta', required: true, min: 1000, max: 9999 },
          ],
        },
      ],
    },
    {
      name: 'weightBrackets',
      type: 'array',
      label: 'Tramos de peso',
      required: true,
      minRows: 1,
      admin: { description: 'Peso facturable = el mayor entre peso real y volumétrico (L×A×H/5000).' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'maxGrams', type: 'number', label: 'Hasta (gramos)', required: true, min: 1 },
            { name: 'price', type: 'number', label: 'Precio (ARS)', required: true, min: 0 },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'extraPerKg', type: 'number', label: 'Extra por kg adicional (ARS)', min: 0 },
        { name: 'freeEligible', type: 'checkbox', label: 'Aplica envío gratis por monto', defaultValue: true },
      ],
    },
    {
      name: 'etaDays',
      type: 'group',
      label: 'Plazo de entrega (días hábiles)',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'min', type: 'number', label: 'Mín.' },
            { name: 'max', type: 'number', label: 'Máx.' },
          ],
        },
      ],
    },
  ],
}
