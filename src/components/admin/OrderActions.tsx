'use client'

import { Button, useAuth, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Acciones rápidas del pedido en el panel: reembolso por MP, generar envío y ver en MP. */
export const OrderActions = () => {
  const { id } = useDocumentInfo()
  const { user } = useAuth<{ role?: string }>()
  const router = useRouter()
  const status = useFormFields(([fields]) => fields.status?.value as string | undefined)
  const paymentMethod = useFormFields(([fields]) => fields.paymentMethod?.value as string | undefined)
  const paymentId = useFormFields(([fields]) => fields['mp.paymentId']?.value as string | undefined)
  const provider = useFormFields(([fields]) => fields['shippingMethod.provider']?.value as string | undefined)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!id) return null

  const call = async (action: 'refund' | 'create-shipment', confirmText: string) => {
    if (!window.confirm(confirmText)) return
    setBusy(action)
    setMessage(null)
    try {
      const res = await fetch(`/api/orders/${id}/${action}`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setMessage(action === 'refund' ? 'Reembolso solicitado.' : `Envío generado: ${json.trackingNumber}`)
      router.refresh()
    } catch (err) {
      setMessage((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const canRefund = user?.role === 'admin' && paymentMethod === 'mercadopago' && paymentId && ['paid', 'preparing', 'shipped', 'delivered'].includes(status ?? '')
  const canShip = provider && !['pickup', 'rateTable'].includes(provider) && ['paid', 'preparing'].includes(status ?? '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
      <strong>Acciones</strong>
      {canShip ? (
        <Button buttonStyle="primary" size="small" disabled={!!busy} onClick={() => call('create-shipment', '¿Generar el envío y la etiqueta en el transportista?')}>
          {busy === 'create-shipment' ? 'Generando…' : 'Generar envío'}
        </Button>
      ) : null}
      {canRefund ? (
        <Button buttonStyle="secondary" size="small" disabled={!!busy} onClick={() => call('refund', '¿Reembolsar el total del pago en Mercado Pago? No se puede deshacer.')}>
          {busy === 'refund' ? 'Reembolsando…' : 'Reembolsar en Mercado Pago'}
        </Button>
      ) : null}
      {paymentId ? (
        <a href={`https://www.mercadopago.com.ar/activities/1?q=${paymentId}`} target="_blank" rel="noreferrer">
          Ver pago {paymentId} en Mercado Pago ↗
        </a>
      ) : null}
      {message ? <p style={{ margin: 0, fontSize: 13 }}>{message}</p> : null}
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        Para cambiar el estado usá el selector &quot;Estado&quot; y guardá: las transiciones inválidas se rechazan y cada cambio queda en el historial.
      </p>
    </div>
  )
}
