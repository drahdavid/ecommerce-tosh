import { MercadoPagoConfig, Payment, PaymentRefund, Preference } from 'mercadopago'

let config: MercadoPagoConfig | null = null

const getConfig = () => {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) throw new Error('Falta MP_ACCESS_TOKEN: configurá las credenciales de Mercado Pago.')
  config ??= new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } })
  return config
}

export const mp = {
  preference: () => new Preference(getConfig()),
  payment: () => new Payment(getConfig()),
  refund: () => new PaymentRefund(getConfig()),
}

export const isMercadoPagoConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN)

let sandboxCheck: { token: string; result: Promise<boolean> } | null = null

/**
 * true si las credenciales son de un usuario de prueba de MP (sandbox). Se consulta una vez
 * por token. En sandbox no se envían datos del pagador: si el email coincide con una cuenta
 * real, MP rechaza con "una de las partes con la que intentás hacer el pago es de prueba".
 */
export const isSandboxSeller = (): Promise<boolean> => {
  const token = process.env.MP_ACCESS_TOKEN ?? ''
  if (!token) return Promise.resolve(false)
  if (sandboxCheck?.token !== token) {
    const result = fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((me: { tags?: string[] } | null) => Boolean(me?.tags?.includes('test_user')))
      .catch(() => false)
    sandboxCheck = { token, result }
  }
  return sandboxCheck.result
}
