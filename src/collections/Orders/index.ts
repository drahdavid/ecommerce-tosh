import type { CollectionConfig, Field } from 'payload'
import { staff, staffField, staffOrOwner } from '@/access'
import { httpUrl } from '@/fields/validate'
import { ORDER_STATUSES, STATUS_LABELS } from '@/lib/orders/stateMachine'
import { PROVINCES } from '@/lib/shipping/types'
import { orderAfterChange, orderBeforeChange } from './hooks'
import { orderEndpoints } from './endpoints'

const money = (name: string, label: string): Field => ({
  name,
  type: 'number',
  label,
  admin: { readOnly: true },
})

const ro = { readOnly: true } as const

/**
 * Campos que escribe solo el sistema (checkout, pagos, cron) vía Local API con overrideAccess.
 * `admin.readOnly` bloquea solo la UI: sin esto un staff podría cambiarlos por REST (por ejemplo
 * `mp.paymentId`, y después reembolsar otro pago de la cuenta de Mercado Pago).
 * No incluye statusHistory, paidAt ni shipment: los completa el hook beforeChange en las
 * ediciones del staff y la field access los revertiría.
 */
const systemOnly = { update: () => false }

/** Datos internos que el cliente no ve por la API (las páginas usan Local API). */
const staffOnlyRead = { read: staffField }

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Pedido', plural: 'Pedidos' },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'status', 'email', 'paymentMethod', 'createdAt', 'needsReview'],
    group: 'Ventas',
    listSearchableFields: ['orderNumber', 'email', 'lastName'],
  },
  access: {
    read: staffOrOwner('customer'),
    // Los pedidos se crean solo desde el checkout (Local API con overrideAccess).
    create: () => false,
    update: staff,
    delete: ({ req }) => req.user?.collection === 'users' && (req.user as { role?: string }).role === 'admin',
  },
  endpoints: orderEndpoints,
  hooks: {
    beforeChange: [orderBeforeChange],
    afterChange: [orderAfterChange],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'orderNumber', type: 'text', label: 'N° de pedido', unique: true, index: true, admin: ro, access: systemOnly },
        {
          name: 'status',
          type: 'select',
          label: 'Estado',
          required: true,
          defaultValue: 'pending_payment',
          index: true,
          options: ORDER_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s })),
        },
        {
          name: 'paymentMethod',
          type: 'select',
          label: 'Medio de pago',
          required: true,
          options: [
            { label: 'Mercado Pago', value: 'mercadopago' },
            { label: 'Transferencia bancaria', value: 'transfer' },
          ],
          admin: ro,
          access: systemOnly,
        },
      ],
    },
    {
      name: 'needsReview',
      type: 'select',
      label: 'Requiere revisión',
      defaultValue: 'none',
      index: true,
      options: [
        { label: 'No', value: 'none' },
        { label: 'Sobreventa (pago aprobado sin stock)', value: 'oversold' },
        { label: 'Monto pagado no coincide', value: 'amount_mismatch' },
        { label: 'Otro', value: 'other' },
      ],
      admin: { position: 'sidebar' },
      access: staffOnlyRead,
    },
    { name: 'adminNotes', type: 'textarea', label: 'Notas internas', admin: { position: 'sidebar' }, access: staffOnlyRead },
    {
      type: 'ui',
      name: 'orderActions',
      admin: { position: 'sidebar', components: { Field: '@/components/admin/OrderActions#OrderActions' } },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Cliente',
          fields: [
            { name: 'customer', type: 'relationship', relationTo: 'customers', label: 'Cuenta de cliente', index: true },
            {
              type: 'row',
              fields: [
                { name: 'firstName', type: 'text', label: 'Nombre', required: true },
                { name: 'lastName', type: 'text', label: 'Apellido', required: true },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'email', type: 'email', label: 'Email', required: true, index: true },
                { name: 'phone', type: 'text', label: 'Teléfono' },
                { name: 'dni', type: 'text', label: 'DNI / CUIT' },
              ],
            },
            {
              name: 'clientIp',
              type: 'text',
              label: 'IP de la compra',
              index: true,
              admin: { readOnly: true, description: 'Para limitar pedidos impagos simultáneos.' },
              access: { read: staffField, ...systemOnly },
            },
            {
              name: 'accessToken',
              type: 'text',
              label: 'Token de acceso (invitado)',
              admin: { readOnly: true, hidden: true },
              access: { read: staffField, ...systemOnly },
            },
          ],
        },
        {
          label: 'Productos y totales',
          fields: [
            {
              name: 'items',
              type: 'array',
              label: 'Productos',
              admin: { readOnly: true },
              access: systemOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'product', type: 'relationship', relationTo: 'products', label: 'Producto' },
                    { name: 'variant', type: 'relationship', relationTo: 'variants', label: 'Variante' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'title', type: 'text', label: 'Título' },
                    { name: 'variantTitle', type: 'text', label: 'Variante' },
                    { name: 'sku', type: 'text', label: 'SKU' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'qty', type: 'number', label: 'Cant.' },
                    { name: 'currencyOriginal', type: 'text', label: 'Moneda orig.' },
                    { name: 'unitPriceOriginal', type: 'number', label: 'Precio orig.' },
                    { name: 'unitPrice', type: 'number', label: 'Precio ARS' },
                    { name: 'lineTotal', type: 'number', label: 'Total ARS' },
                  ],
                },
                { name: 'weightGrams', type: 'number', admin: { hidden: true } },
              ],
            },
            {
              name: 'totals',
              type: 'group',
              label: 'Totales (ARS)',
              access: systemOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    money('subtotal', 'Subtotal'),
                    money('couponDiscount', 'Desc. cupón'),
                    money('transferDiscount', 'Desc. transferencia'),
                    money('shipping', 'Envío'),
                    money('total', 'Total'),
                  ],
                },
                money('vatIncluded', 'IVA contenido'),
              ],
            },
            {
              name: 'coupon',
              type: 'group',
              label: 'Cupón aplicado',
              admin: { readOnly: true },
              access: systemOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'code', type: 'text', label: 'Código' },
                    { name: 'type', type: 'text', label: 'Tipo' },
                    { name: 'value', type: 'number', label: 'Valor' },
                  ],
                },
              ],
            },
            {
              name: 'exchangeRate',
              type: 'group',
              label: 'Cotización usada (USD → ARS)',
              admin: { readOnly: true, description: 'Congelada al crear el pedido.' },
              access: systemOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'rate', type: 'number', label: 'ARS por USD' },
                    { name: 'source', type: 'text', label: 'Fuente' },
                    { name: 'fetchedAt', type: 'date', label: 'Obtenida' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Envío',
          fields: [
            {
              name: 'shippingMethod',
              type: 'group',
              label: 'Método elegido',
              admin: { readOnly: true },
              access: systemOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'rateId', type: 'text', label: 'Tarifa' },
                    { name: 'provider', type: 'text', label: 'Proveedor' },
                    { name: 'service', type: 'text', label: 'Servicio' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'carrier', type: 'text', label: 'Transporte' },
                    { name: 'label', type: 'text', label: 'Descripción' },
                    { name: 'price', type: 'number', label: 'Precio' },
                  ],
                },
              ],
            },
            {
              name: 'shippingAddress',
              type: 'group',
              label: 'Dirección de entrega',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'street', type: 'text', label: 'Calle' },
                    { name: 'number', type: 'text', label: 'Número' },
                    { name: 'floor', type: 'text', label: 'Piso / Depto' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'city', type: 'text', label: 'Localidad' },
                    {
                      name: 'province',
                      type: 'select',
                      label: 'Provincia',
                      options: PROVINCES.map((p) => ({ label: p, value: p })),
                    },
                    { name: 'postalCode', type: 'text', label: 'CP' },
                  ],
                },
                { name: 'notes', type: 'textarea', label: 'Indicaciones' },
              ],
            },
            {
              name: 'shipment',
              type: 'group',
              label: 'Despacho',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'carrier', type: 'text', label: 'Transporte' },
                    { name: 'trackingNumber', type: 'text', label: 'N° de seguimiento' },
                    { name: 'trackingUrl', type: 'text', label: 'URL de seguimiento', validate: httpUrl },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'providerShipmentId', type: 'text', label: 'ID en el proveedor', admin: ro },
                    { name: 'labelUrl', type: 'text', label: 'Etiqueta (URL)', validate: httpUrl },
                    { name: 'shippedAt', type: 'date', label: 'Despachado', admin: ro },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Pago',
          fields: [
            {
              name: 'mp',
              type: 'group',
              label: 'Mercado Pago',
              admin: { readOnly: true },
              access: systemOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'preferenceId', type: 'text', label: 'Preferencia' },
                    { name: 'paymentId', type: 'text', label: 'ID de pago', index: true },
                    { name: 'status', type: 'text', label: 'Estado MP' },
                    { name: 'statusDetail', type: 'text', label: 'Detalle' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'paymentTypeId', type: 'text', label: 'Tipo' },
                    { name: 'paymentMethodId', type: 'text', label: 'Medio' },
                    { name: 'installments', type: 'number', label: 'Cuotas' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'transactionAmount', type: 'number', label: 'Monto cobrado' },
                    { name: 'netReceivedAmount', type: 'number', label: 'Neto recibido' },
                    { name: 'approvedAt', type: 'date', label: 'Aprobado' },
                  ],
                },
                { name: 'initPoint', type: 'text', label: 'Link de pago', admin: { hidden: true } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'paidAt', type: 'date', label: 'Pagado', admin: ro },
                { name: 'reservationExpiresAt', type: 'date', label: 'Reserva de stock vence', index: true, admin: ro, access: systemOnly },
                { name: 'stockReleased', type: 'checkbox', label: 'Stock devuelto', defaultValue: false, admin: ro, access: systemOnly },
                { name: 'couponReleased', type: 'checkbox', label: 'Uso de cupón devuelto', defaultValue: false, admin: ro, access: systemOnly },
              ],
            },
            {
              name: 'invoice',
              type: 'group',
              label: 'Factura (ARCA)',
              admin: { description: 'Facturación electrónica: carga manual en v1.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'number', type: 'text', label: 'Número' },
                    { name: 'cae', type: 'text', label: 'CAE' },
                    { name: 'url', type: 'text', label: 'PDF (URL)', validate: httpUrl },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Historial',
          fields: [
            {
              name: 'statusHistory',
              type: 'array',
              label: 'Cambios de estado',
              admin: { readOnly: true },
              access: staffOnlyRead,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'from', type: 'text', label: 'Desde' },
                    { name: 'to', type: 'text', label: 'Hacia' },
                    { name: 'at', type: 'date', label: 'Fecha' },
                    { name: 'by', type: 'text', label: 'Por' },
                  ],
                },
                { name: 'note', type: 'text', label: 'Nota' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
