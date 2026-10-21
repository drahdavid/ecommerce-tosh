import type { CollectionConfig } from 'payload'
import { admins, isAdminUser, isStaffUser, staff } from '@/access'
import { authHardening } from '@/lib/auth/hardening'

/** Usuarios del panel de administración. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario admin', plural: 'Usuarios admin' },
  admin: {
    useAsTitle: 'email',
    group: 'Configuración',
  },
  auth: { cookies: authHardening.cookies },
  hooks: { beforeOperation: [authHardening.beforeOperation] },
  access: {
    read: staff,
    create: admins,
    // Se compara también la colección: customers y users comparten la secuencia de ids (1, 2, …).
    update: ({ req, id }) => isAdminUser(req) || (isStaffUser(req) && req.user?.id === id),
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
