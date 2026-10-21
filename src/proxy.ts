import { NextResponse, type NextRequest } from 'next/server'
import { ORDER_NUMBER_RE, ORDER_TOKEN_MAX_AGE, orderTokenCookie, orderTokenPaths } from '@/lib/orders/accessCookie'

const setCookie = (name: string, value: string, path: string) =>
  [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${ORDER_TOKEN_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
    process.env.NODE_ENV === 'production' ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ')

/**
 * Saca el token del pedido (`?t=`) de la URL: lo guarda en una cookie httpOnly y redirige a la
 * misma página sin él. Ver lib/orders/accessCookie.ts.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl
  const token = url.searchParams.get('t')
  const orderNumber = url.pathname.startsWith('/pedido/') ? decodeURIComponent(url.pathname.slice('/pedido/'.length)) : url.searchParams.get('order')

  const params = new URLSearchParams(url.searchParams)
  params.delete('t')
  const query = params.toString()
  // Con la URL pública: detrás de Traefik el host del request puede ser el interno del contenedor.
  const target = new URL(`${url.pathname}${query ? `?${query}` : ''}`, process.env.NEXT_PUBLIC_SERVER_URL || url.origin)
  const response = NextResponse.redirect(target, 307)

  if (token && orderNumber && ORDER_NUMBER_RE.test(orderNumber) && token.length <= 100) {
    // Misma cookie con dos `Path` (dos Set-Cookie): `response.cookies` guarda una sola por nombre.
    for (const path of orderTokenPaths(orderNumber)) response.headers.append('Set-Cookie', setCookie(orderTokenCookie(orderNumber), token, path))
  }
  return response
}

export const config = {
  matcher: [
    { source: '/pedido/:orderNumber', has: [{ type: 'query', key: 't' }] },
    { source: '/checkout/resultado', has: [{ type: 'query', key: 't' }] },
  ],
}
