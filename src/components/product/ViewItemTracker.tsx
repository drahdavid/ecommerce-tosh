'use client'

import { useEffect } from 'react'
import { track } from '@/components/layout/Analytics'

export const ViewItemTracker = ({ value, item }: { value: number; item: { item_id: string; item_name: string; price: number; quantity: number } }) => {
  useEffect(() => {
    track('view_item', { value, items: [item] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.item_id])
  return null
}
