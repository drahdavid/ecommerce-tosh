import type { GlobalConfig } from 'payload'
import { admins, staff } from '@/access'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

/**
 * Cotización USD → ARS. En modo automático la actualiza un cron cada hora desde DolarAPI
 * (dólar oficial BNA, venta). El admin puede fijar una cotización manual en cualquier momento.
 */
export const ExchangeRate: GlobalConfig = {
  slug: 'exchange-rate',
  label: 'Cotización del dólar',
  admin: { group: 'Configuración' },
  access: { read: staff, update: admins },
  fields: [
    {
      name: 'mode',
      type: 'radio',
      label: 'Modo',
      required: true,
      defaultValue: 'auto',
      options: [
        { label: 'Automático (dólar oficial BNA, venta)', value: 'auto' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    {
      name: 'manualRate',
      type: 'number',
      label: 'Cotización manual (ARS por USD)',
      min: 1,
      admin: { condition: (data) => data?.mode === 'manual' },
    },
    {
      name: 'effectiveRate',
      type: 'number',
      label: 'Cotización vigente (ARS por USD)',
      admin: { readOnly: true, description: 'La que se usa para mostrar y cobrar los productos en USD.' },
    },
    {
      type: 'collapsible',
      label: 'Datos de la fuente automática',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'autoSell', type: 'number', label: 'Venta', admin: { readOnly: true } },
            { name: 'autoBuy', type: 'number', label: 'Compra', admin: { readOnly: true } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'apiUpdatedAt', type: 'date', label: 'Actualizada en BNA', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
            { name: 'checkedAt', type: 'date', label: 'Última consulta exitosa', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
          ],
        },
        { name: 'lastError', type: 'text', label: 'Último error', admin: { readOnly: true } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Controles de seguridad',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'maxStalenessHours',
              type: 'number',
              label: 'Antigüedad máxima (horas)',
              defaultValue: 6,
              min: 1,
              admin: { description: 'Si la última consulta exitosa es más vieja, se reintenta al cotizar; si sigue fallando, se bloquea la venta de productos en USD.' },
            },
            {
              name: 'maxDeltaPercent',
              type: 'number',
              label: 'Variación máxima aceptada (%)',
              defaultValue: 15,
              min: 1,
              admin: { description: 'Un salto mayor entre consultas se rechaza y se avisa (protege ante datos erróneos).' },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        data.effectiveRate = data.mode === 'manual' && data.manualRate ? data.manualRate : data.autoSell ?? null
        return data
      },
    ],
    afterChange: [() => safeRevalidate(TAGS.exchangeRate, TAGS.products)],
  },
}
