'use client'

import { useEffect } from 'react'
import { track } from '@/components/layout/Analytics'

/** Dispara `purchase` una sola vez por pedido pagado. */
export const PurchaseTracker = (props: { orderNumber: string; value: number; items: { item_id: string; item_name: string; price: number; quantity: number }[] }) => {
  useEffect(() => {
    const key = `tracked:${props.orderNumber}`
    try {
      if (window.localStorage.getItem(key)) return
      window.localStorage.setItem(key, '1')
    } catch {
      // ignorar
    }
    track('purchase', { transaction_id: props.orderNumber, value: props.value, items: props.items })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.orderNumber])
  return null
}
