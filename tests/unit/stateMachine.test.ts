import { describe, expect, it } from 'vitest'
import { canTransition, ORDER_STATUSES } from '@/lib/orders/stateMachine'

describe('máquina de estados del pedido', () => {
  it('permite el flujo feliz', () => {
    expect(canTransition('pending_payment', 'paid')).toBe(true)
    expect(canTransition('paid', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'shipped')).toBe(true)
    expect(canTransition('shipped', 'delivered')).toBe(true)
  })

  it('permite cancelar antes de despachar y reembolsar después de pagar', () => {
    expect(canTransition('pending_payment', 'cancelled')).toBe(true)
    expect(canTransition('paid', 'cancelled')).toBe(true)
    expect(canTransition('preparing', 'refunded')).toBe(true)
    expect(canTransition('delivered', 'refunded')).toBe(true)
  })

  it('rechaza saltos inválidos', () => {
    expect(canTransition('pending_payment', 'shipped')).toBe(false)
    expect(canTransition('pending_payment', 'refunded')).toBe(false)
    expect(canTransition('shipped', 'cancelled')).toBe(false)
    expect(canTransition('delivered', 'paid')).toBe(false)
    expect(canTransition('shipped', 'pending_payment')).toBe(false)
  })

  it('los estados finales no tienen salida (salvo el pago tardío del sistema)', () => {
    for (const to of ORDER_STATUSES) {
      if (to !== 'refunded') expect(canTransition('refunded', to)).toBe(false)
      if (to !== 'cancelled') expect(canTransition('cancelled', to)).toBe(false)
    }
    expect(canTransition('cancelled', 'paid', { system: true })).toBe(true)
    expect(canTransition('refunded', 'paid', { system: true })).toBe(false)
  })

  it('quedarse en el mismo estado siempre es válido', () => {
    for (const s of ORDER_STATUSES) expect(canTransition(s, s)).toBe(true)
  })
})
