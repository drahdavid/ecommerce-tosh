import type { GlobalConfig } from 'payload'
import { admins, anyone, staffField } from '@/access'
import { httpUrl, matches } from '@/fields/validate'
import { safeRevalidate, TAGS } from '@/lib/revalidate'

export const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: 'Configuración de la tienda',
  admin: { group: 'Configuración' },
  access: { read: anyone, update: admins },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Tienda',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'storeName', type: 'text', label: 'Nombre de la tienda', required: true, defaultValue: 'Tosh' },
                { name: 'tagline', type: 'text', label: 'Bajada' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'legalName', type: 'text', label: 'Razón social' },
                { name: 'cuit', type: 'text', label: 'CUIT' },
              ],
            },
            { name: 'address', type: 'text', label: 'Domicilio legal' },
            {
              type: 'row',
              fields: [
                { name: 'contactEmail', type: 'email', label: 'Email de contacto' },
                { name: 'whatsappNumber', type: 'text', label: 'WhatsApp', admin: { description: 'Formato internacional sin +: 5491112345678' } },
              ],
            },
            {
              name: 'adminNotificationEmails',
              type: 'text',
              hasMany: true,
              validate: (value: string[] | null | undefined) =>
                (value ?? []).every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) || 'Hay un email inválido',
              label: 'Emails que reciben aviso de pedidos',
              access: { read: staffField },
            },
            {
              type: 'row',
              fields: [
                { name: 'instagram', type: 'text', label: 'Instagram (URL)', validate: httpUrl },
                { name: 'facebook', type: 'text', label: 'Facebook (URL)', validate: httpUrl },
                { name: 'tiktok', type: 'text', label: 'TikTok (URL)', validate: httpUrl },
              ],
            },
            {
              name: 'dataFiscalUrl',
              type: 'text',
              label: 'Link del QR "Data Fiscal" de ARCA',
              validate: httpUrl,
              admin: { description: 'Obligatorio exhibirlo en el sitio. Se obtiene en ARCA → "Formulario 960 - Data Fiscal".' },
            },
            { name: 'dataFiscalImage', type: 'upload', relationTo: 'media', label: 'Imagen del QR Data Fiscal' },
          ],
        },
        {
          label: 'Precios y pagos',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'priceRoundingStep',
                  type: 'number',
                  label: 'Redondeo de precios en USD (ARS)',
                  defaultValue: 10,
                  min: 0.01,
                  admin: { description: 'Los precios convertidos se redondean hacia arriba a este múltiplo. Ej.: 10 → $12.340.' },
                },
                {
                  name: 'freeShippingThreshold',
                  type: 'number',
                  label: 'Envío gratis desde (ARS)',
                  min: 0,
                  admin: { description: 'Vacío o 0 = sin envío gratis.' },
                },
              ],
            },
            {
              name: 'installments',
              type: 'group',
              label: 'Cuotas a publicitar',
              admin: {
                description:
                  'Solo se muestran cuotas SIN interés (las absorbe el comercio en Mercado Pago). Publicitar cuotas con interés obliga a informar CFT y TEA.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'enabled', type: 'checkbox', label: 'Mostrar cuotas', defaultValue: true },
                    { name: 'count', type: 'number', label: 'Cantidad', defaultValue: 3, min: 2, max: 24 },
                    { name: 'interestFree', type: 'checkbox', label: 'Son sin interés (configuradas en MP)', defaultValue: true },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'mercadoPagoEnabled', type: 'checkbox', label: 'Aceptar Mercado Pago', defaultValue: true },
                { name: 'transferEnabled', type: 'checkbox', label: 'Aceptar transferencia', defaultValue: true },
                { name: 'transferDiscountPercent', type: 'number', label: '% descuento por transferencia', defaultValue: 10, min: 0, max: 50 },
              ],
            },
            {
              name: 'bank',
              type: 'group',
              label: 'Datos para transferencia',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'bankName', type: 'text', label: 'Banco / billetera' },
                    { name: 'holder', type: 'text', label: 'Titular' },
                    { name: 'cuit', type: 'text', label: 'CUIT' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'cbu', type: 'text', label: 'CBU / CVU' },
                    { name: 'alias', type: 'text', label: 'Alias' },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'reservationTtlMinutesMP', type: 'number', label: 'Reserva de stock con MP (min)', defaultValue: 30, min: 10 },
                { name: 'reservationTtlHoursTransfer', type: 'number', label: 'Reserva de stock con transferencia (h)', defaultValue: 48, min: 1 },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'maxPendingOrdersPerEmail',
                  type: 'number',
                  label: 'Pedidos impagos simultáneos por email',
                  defaultValue: 2,
                  min: 1,
                  admin: { description: 'Evita que alguien bloquee stock armando pedidos que no paga.' },
                },
                {
                  name: 'maxPendingOrdersPerIp',
                  type: 'number',
                  label: 'Pedidos impagos simultáneos por conexión (IP)',
                  defaultValue: 5,
                  min: 1,
                  admin: { description: 'Más alto que por email: varias personas pueden compartir una conexión.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Marketing',
          fields: [
            {
              type: 'row',
              fields: [
                // Se insertan dentro de un <script>: solo el formato del ID, nada más.
                { name: 'ga4Id', type: 'text', label: 'Google Analytics 4 (G-XXXX)', validate: matches(/^G-[A-Z0-9]{4,20}$/, 'Formato: G-XXXXXXX') },
                { name: 'metaPixelId', type: 'text', label: 'Meta Pixel ID', validate: matches(/^\d{5,20}$/, 'Son solo números') },
              ],
            },
            {
              name: 'announcement',
              type: 'text',
              label: 'Barra de anuncio',
              admin: { description: 'Ej.: "Envío gratis desde $80.000 · 3 cuotas sin interés"' },
            },
            { name: 'heroTitle', type: 'text', label: 'Título de portada' },
            { name: 'heroSubtitle', type: 'text', label: 'Subtítulo de portada' },
            { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Imagen de portada' },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [() => safeRevalidate(TAGS.settings, TAGS.products)],
  },
}
