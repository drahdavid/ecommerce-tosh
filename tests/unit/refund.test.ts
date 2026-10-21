import { MPAuthenticationError, MPConnectionError } from 'mercadopago'
import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@/payload-types'

const create = vi.fn()
vi.mock('@/lib/payments/mercadopago/client', () => ({ mp: { refund: () => ({ create }) } }))

const { refundOrder } = await import('@/lib/payments/mercadopago/refund')

const order = { id: 2, paymentMethod: 'mercadopago', mp: { paymentId: '185326665034' } } as Order
const update = vi.fn(async () => ({ ...order, status: 'refunded' }))
const payload = { update } as unknown as Payload

describe('reembolso de Mercado Pago', () => {
  beforeEach(() => {
    create.mockReset()
    update.mockClear()
  })

  it('marca el pedido como reembolsado si MP acepta', async () => {
    create.mockResolvedValue({ id: 1 })
    await refundOrder(payload, order, 'admin@tienda.com')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 2, data: { status: 'refunded' } }))
  })

  it('si MP rechaza, explica qué hacer y no toca el pedido', async () => {
    create.mockRejectedValue(new MPAuthenticationError({ status: 401, message: 'Unauthorized use of live credentials' }))
    await expect(refundOrder(payload, order, 'admin')).rejects.toThrow(/rechazó el reembolso \(Unauthorized use of live credentials\)\. Hacé la devolución/)
    expect(update).not.toHaveBeenCalled()
  })

  it('si MP no responde, avisa que el reembolso pudo haberse hecho', async () => {
    create.mockRejectedValue(new MPConnectionError(new Error('timeout')))
    await expect(refundOrder(payload, order, 'admin')).rejects.toThrow(/no confirmó el reembolso\. Revisá el pago 185326665034/)
    expect(update).not.toHaveBeenCalled()
  })
})
