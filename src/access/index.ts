import type { Access, FieldAccess, PayloadRequest } from 'payload'

/** Usuario del panel (colección `users`), no un cliente de la tienda. */
export const isStaffUser = (req: PayloadRequest): boolean => req.user?.collection === 'users'

export const isAdminUser = (req: PayloadRequest): boolean =>
  req.user?.collection === 'users' && (req.user as { role?: string }).role === 'admin'

export const anyone: Access = () => true

export const staff: Access = ({ req }) => isStaffUser(req)

export const admins: Access = ({ req }) => isAdminUser(req)

export const staffField: FieldAccess = ({ req }) => isStaffUser(req)

/** Productos/páginas: el público solo ve lo publicado. */
export const publishedOrStaff: Access = ({ req }) =>
  isStaffUser(req) ? true : { _status: { equals: 'published' } }

/** Cliente logueado: solo sus propios documentos (por el campo `field`). */
export const staffOrOwner =
  (field: string): Access =>
  ({ req }) => {
    if (isStaffUser(req)) return true
    if (req.user?.collection === 'customers') return { [field]: { equals: req.user.id } }
    return false
  }
