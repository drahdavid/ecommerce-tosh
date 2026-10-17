export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Despachado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['preparing', 'shipped', 'delivered', 'refunded', 'cancelled'],
  preparing: ['shipped', 'delivered', 'refunded', 'cancelled'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

/**
 * Transiciones que solo puede hacer el sistema (no el admin desde el panel):
 * un pago aprobado que llega tarde para una orden ya cancelada por vencimiento.
 */
const SYSTEM_ONLY: Partial<Record<OrderStatus, OrderStatus[]>> = {
  cancelled: ['paid'],
}

export const canTransition = (from: OrderStatus, to: OrderStatus, opts: { system?: boolean } = {}): boolean => {
  if (from === to) return true
  if (TRANSITIONS[from]?.includes(to)) return true
  return Boolean(opts.system && SYSTEM_ONLY[from]?.includes(to))
}

export const nextStatuses = (from: OrderStatus): OrderStatus[] => TRANSITIONS[from] ?? []

/** Estados en los que la mercadería ya no está comprometida y el stock debe volver. */
export const RELEASES_STOCK: OrderStatus[] = ['cancelled', 'refunded']
