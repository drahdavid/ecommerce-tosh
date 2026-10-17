import type { CreatedShipment, QuoteRequest, ShipmentRequest, ShippingRate } from '../types'

/**
 * Adaptador Zipnova (agregador: Andreani, Correo Argentino, OCA y otros sin contrato propio).
 *
 * PENDIENTE: Zipnova no publica su API; los endpoints, el formato de autenticación y el
 * webhook de tracking se completan cuando la cuenta entregue credenciales y documentación.
 * Mientras tanto el proveedor queda deshabilitado (no devuelve tarifas), sin afectar al resto.
 */
export const isZipnovaConfigured = () => Boolean(process.env.ZIPNOVA_API_KEY && process.env.ZIPNOVA_API_SECRET)

export const quoteZipnova = async (_req: QuoteRequest, _opts: { accountId?: string | null; markupPercent?: number | null }): Promise<ShippingRate[]> => {
  if (!isZipnovaConfigured()) return []
  // TODO(zipnova): POST de cotización con origen, destino (CP), peso facturable y valor declarado;
  // mapear cada servicio a ShippingRate { id: `zipnova:${serviceCode}`, carrier, priceCents (+markup), etaDays }.
  return []
}

export const createZipnovaShipment = async (_req: ShipmentRequest): Promise<CreatedShipment> => {
  throw new Error('La integración con Zipnova todavía no está configurada. Cargá el tracking manualmente en el pedido.')
}
