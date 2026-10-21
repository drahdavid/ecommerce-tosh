/**
 * El token de acceso del invitado llega en la URL (links de los emails y retorno de Mercado Pago).
 * `src/proxy.ts` lo pasa a una cookie httpOnly y lo saca de la URL, así no lo registran GA4 ni el
 * Pixel de Meta (que guardan la URL completa) ni queda en el historial del navegador.
 */
export const ORDER_NUMBER_RE = /^[A-Za-z0-9-]{1,40}$/

export const orderTokenCookie = (orderNumber: string) => `ot_${orderNumber}`

/** Rutas que muestran el pedido: la cookie solo viaja a ellas. */
export const orderTokenPaths = (orderNumber: string) => [`/pedido/${orderNumber}`, '/checkout/resultado']

export const ORDER_TOKEN_MAX_AGE = 60 * 60 * 24 * 90
