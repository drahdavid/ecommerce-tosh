import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { isStaffUser, staff } from '@/access'
import { authHardening } from '@/lib/auth/hardening'
import { PROVINCES } from '@/lib/shipping/types'

const siteUrl = () => process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

const isStaffOrSelf = ({ req, id }: { req: Parameters<typeof isStaffUser>[0]; id?: string | number }) =>
  isStaffUser(req) || (req.user?.collection === 'customers' && req.user.id === id)

/**
 * Un cliente (o un visitante por REST) no puede marcarse como verificado ni cambiar su email:
 * los pedidos de invitado se vinculan por email verificado (ver linkGuestOrders).
 * El código del servidor (Local API sin usuario) y el staff no tienen esa restricción.
 */
const protectIdentity: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const actingCustomer = req.user?.collection === 'customers'
  const anonymousApi = !req.user && req.payloadAPI !== 'local'
  if (isStaffUser(req) || !(actingCustomer || anonymousApi)) return data
  delete data._verified
  if (operation === 'update' && typeof data.email === 'string' && data.email.trim().toLowerCase() !== String(originalDoc?.email ?? '').toLowerCase()) {
    throw new APIError('No se puede cambiar el email de la cuenta.', 403, null, true)
  }
  return data
}

/** Clientes de la tienda. La compra como invitado siempre está disponible: registrarse es opcional. */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Cliente', plural: 'Clientes' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'createdAt'],
    group: 'Ventas',
  },
  auth: {
    cookies: authHardening.cookies,
    tokenExpiration: 60 * 60 * 24 * 30,
    verify: {
      generateEmailSubject: () => 'Confirmá tu email',
      generateEmailHTML: ({ token }) =>
        `<p>¡Hola! Confirmá tu cuenta haciendo clic acá:</p><p><a href="${siteUrl()}/cuenta/verificar?token=${token}">Confirmar mi email</a></p>`,
    },
    forgotPassword: {
      generateEmailSubject: () => 'Recuperá tu contraseña',
      generateEmailHTML: (args) =>
        `<p>Para elegir una nueva contraseña hacé clic acá:</p><p><a href="${siteUrl()}/cuenta/recuperar?token=${args?.token}">Elegir contraseña</a></p><p>Si no lo pediste, ignorá este email.</p>`,
    },
  },
  hooks: {
    beforeOperation: [authHardening.beforeOperation],
    beforeChange: [protectIdentity],
  },
  access: {
    // Registro público; el resto, solo staff o el propio cliente.
    create: () => true,
    read: ({ req }) => (isStaffUser(req) ? true : req.user?.collection === 'customers' ? { id: { equals: req.user.id } } : false),
    update: ({ req, id }) => isStaffOrSelf({ req, id }),
    delete: staff,
    admin: () => false,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', label: 'Nombre', maxLength: 80 },
        { name: 'lastName', type: 'text', label: 'Apellido', maxLength: 80 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'phone', type: 'text', label: 'Teléfono', maxLength: 30 },
        { name: 'dni', type: 'text', label: 'DNI / CUIT', maxLength: 13 },
      ],
    },
    {
      name: 'addresses',
      type: 'array',
      label: 'Direcciones',
      labels: { singular: 'Dirección', plural: 'Direcciones' },
      fields: [
        { name: 'label', type: 'text', label: 'Etiqueta (Casa, Trabajo…)', maxLength: 40 },
        {
          type: 'row',
          fields: [
            { name: 'street', type: 'text', label: 'Calle', required: true, maxLength: 120 },
            { name: 'number', type: 'text', label: 'Número', required: true, maxLength: 20 },
            { name: 'floor', type: 'text', label: 'Piso / Depto', maxLength: 30 },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'city', type: 'text', label: 'Localidad', required: true, maxLength: 120 },
            {
              name: 'province',
              type: 'select',
              label: 'Provincia',
              required: true,
              options: PROVINCES.map((p) => ({ label: p, value: p })),
            },
            { name: 'postalCode', type: 'text', label: 'Código postal', required: true, maxLength: 8 },
          ],
        },
        { name: 'isDefault', type: 'checkbox', label: 'Predeterminada' },
      ],
    },
    { name: 'marketingOptIn', type: 'checkbox', label: 'Acepta recibir novedades', defaultValue: false },
  ],
}
