import type { ShippingRate } from '../types'

export const quotePickup = (address?: string | null, hours?: string | null): ShippingRate[] => [
  {
    id: 'pickup:store',
    provider: 'pickup',
    service: 'store',
    carrier: 'Retiro en local',
    label: ['Retiro en local', address, hours].filter(Boolean).join(' — '),
    priceCents: 0,
    etaDays: null,
    freeEligible: true,
    requiresAddress: false,
  },
]
