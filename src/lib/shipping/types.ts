export type ProviderId = 'pickup' | 'rateTable' | 'zipnova' | 'correoArgentino' | 'andreani'

export type Destination = {
  postalCode: string
  province: string
  city?: string
}

export type PackedCart = {
  /** Peso facturable: el mayor entre real y volumétrico. */
  billableGrams: number
  realGrams: number
  volumetricGrams: number
  /** Valor declarado en centavos ARS. */
  declaredValueCents: number
  itemCount: number
}

export type ShippingRate = {
  /** `${provider}:${service}` — estable entre cotizaciones para poder re-cotizar en el servidor. */
  id: string
  provider: ProviderId
  service: string
  carrier: string
  label: string
  priceCents: number
  etaDays?: { min: number; max: number } | null
  /** Si puede bonificarse por el umbral de envío gratis. */
  freeEligible: boolean
  /** false para retiro en local. */
  requiresAddress: boolean
}

export type ShipmentAddress = {
  name: string
  phone?: string | null
  email: string
  street: string
  number: string
  floor?: string | null
  city: string
  province: string
  postalCode: string
}

export type CreatedShipment = {
  trackingNumber: string
  providerShipmentId?: string
  labelUrl?: string
  labelPdf?: Buffer
}

export type TrackingEvent = { at: string; status: string; description?: string; location?: string }

export type QuoteRequest = { packed: PackedCart; destination: Destination | null }

export type ShipmentRequest = {
  orderNumber: string
  service: string
  packed: PackedCart
  recipient: ShipmentAddress
}

export interface ShippingProvider {
  id: ProviderId
  quote(req: QuoteRequest): Promise<ShippingRate[]>
  createShipment?(req: ShipmentRequest): Promise<CreatedShipment>
  track?(trackingNumber: string): Promise<TrackingEvent[]>
}

export const PROVINCES = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const

export type Province = (typeof PROVINCES)[number]
