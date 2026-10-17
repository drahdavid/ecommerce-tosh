import type { CollectionConfig } from 'payload'
import { isStaffUser, staff } from '@/access'
import { PROVINCES } from '@/lib/shipping/types'

const siteUrl = () => process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

const isStaffOrSelf = ({ req, id }: { req: Parameters<typeof isStaffUser>[0]; id?: string | number }) =>
  isStaffUser(req) || (req.user?.collection === 'customers' && req.user.id === id)

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
        { name: 'firstName', type: 'text', label: 'Nombre' },
        { name: 'lastName', type: 'text', label: 'Apellido' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'phone', type: 'text', label: 'Teléfono' },
        { name: 'dni', type: 'text', label: 'DNI / CUIT' },
      ],
    },
    {
      name: 'addresses',
      type: 'array',
      label: 'Direcciones',
      labels: { singular: 'Dirección', plural: 'Direcciones' },
      fields: [
        { name: 'label', type: 'text', label: 'Etiqueta (Casa, Trabajo…)' },
        {
          type: 'row',
          fields: [
            { name: 'street', type: 'text', label: 'Calle', required: true },
            { name: 'number', type: 'text', label: 'Número', required: true },
            { name: 'floor', type: 'text', label: 'Piso / Depto' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'city', type: 'text', label: 'Localidad', required: true },
            {
              name: 'province',
              type: 'select',
              label: 'Provincia',
              required: true,
              options: PROVINCES.map((p) => ({ label: p, value: p })),
            },
            { name: 'postalCode', type: 'text', label: 'Código postal', required: true },
          ],
        },
        { name: 'isDefault', type: 'checkbox', label: 'Predeterminada' },
      ],
    },
    { name: 'marketingOptIn', type: 'checkbox', label: 'Acepta recibir novedades', defaultValue: false },
  ],
}
