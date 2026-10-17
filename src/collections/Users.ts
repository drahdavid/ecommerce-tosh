import type { CollectionConfig } from 'payload'
import { admins, isAdminUser, staff } from '@/access'

/** Usuarios del panel de administración. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario admin', plural: 'Usuarios admin' },
  admin: {
    useAsTitle: 'email',
    group: 'Configuración',
  },
  auth: true,
  access: {
    read: staff,
    create: admins,
    update: ({ req, id }) => isAdminUser(req) || req.user?.id === id,
    delete: admins,
    admin: ({ req }) => req.user?.collection === 'users',
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre' },
    {
      name: 'role',
      type: 'select',
      label: 'Rol',
      required: true,
      defaultValue: 'staff',
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Staff (productos y pedidos)', value: 'staff' },
      ],
      access: { update: ({ req }) => isAdminUser(req) },
      saveToJWT: true,
    },
  ],
}
