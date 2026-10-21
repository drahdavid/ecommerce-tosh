import { sql } from '@payloadcms/db-postgres'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { orderEndpoints } from '@/collections/Orders/endpoints'
import { placeOrder } from '@/lib/orders/placeOrder'
import { resetRateLimits } from '@/lib/rateLimit'
import type { Customer, User } from '@/payload-types'

let payload: Payload
let variantId: number

const DOMAIN = '@sec.test'
const PASSWORD = 'contraseña-segura'

/** Un pedido "de afuera" (REST anónimo) a la Local API. */
const restReq = (ip = '203.0.113.7') => ({ headers: new Headers({ 'x-forwarded-for': ip }), payloadAPI: 'REST' as const }) as Partial<PayloadRequest>

const asCustomer = (c: Customer) => ({ ...c, collection: 'customers' as const })
const asUser = (u: User) => ({ ...u, collection: 'users' as const })

const execute = (query: ReturnType<typeof sql>) => (payload.db as unknown as { drizzle: { execute: (q: typeof query) => Promise<unknown> } }).drizzle.execute(query)

/** Customer y user con el MISMO id numérico (comparten la secuencia 1, 2, …). */
const customerAndUserWithSameId = async () => {
  const r = (await execute(sql`SELECT greatest((SELECT coalesce(max(id), 0) FROM users), (SELECT coalesce(max(id), 0) FROM customers)) + 100 AS n`)) as { rows: { n: number }[] }
  const n = Number(r.rows[0].n)
  await execute(sql`SELECT setval(pg_get_serial_sequence('users', 'id'), ${n})`)
  await execute(sql`SELECT setval(pg_get_serial_sequence('customers', 'id'), ${n})`)
  const user = await payload.create({ collection: 'users', data: { email: `admin${DOMAIN}`, password: PASSWORD, role: 'admin' } })
  const customer = await payload.create({ collection: 'customers', data: { email: `cliente${DOMAIN}`, password: PASSWORD, _verified: true } })
  return { user, customer }
}

const wipe = async () => {
  await payload.delete({ collection: 'orders', where: { email: { like: DOMAIN } }, context: { skipEmails: true } })
  await payload.delete({ collection: 'customers', where: { email: { like: DOMAIN } } })
  await payload.delete({ collection: 'users', where: { email: { like: DOMAIN } } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.updateGlobal({
    slug: 'store-settings',
    data: { storeName: 'Test', transferEnabled: true, mercadoPagoEnabled: true, adminNotificationEmails: [], maxPendingOrdersPerEmail: 1000, maxPendingOrdersPerIp: 1000 },
  })
  await payload.updateGlobal({ slug: 'shipping-settings', data: { pickup: { enabled: true, address: 'Local' } } })
  await payload.updateGlobal({ slug: 'exchange-rate', data: { mode: 'manual', manualRate: 1000 } })
  const product = await payload.create({
    collection: 'products',
    data: { title: `Seguridad ${Date.now()}`, currency: 'ARS', price: 1000, taxRate: '21', weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 10, _status: 'published' },
  })
  const { docs } = await payload.find({ collection: 'variants', where: { product: { equals: product.id } }, depth: 0 })
  variantId = docs[0].id
  await payload.update({ collection: 'variants', id: variantId, data: { stock: 100 } })
})

beforeEach(async () => {
  resetRateLimits()
  await wipe()
})

afterAll(async () => {
  await wipe()
})

describe('usuarios del panel', () => {
  it('un cliente no puede modificar al admin que tiene su mismo id', async () => {
    const { user, customer } = await customerAndUserWithSameId()
    expect(customer.id).toBe(user.id)
    await expect(
      payload.update({ collection: 'users', id: user.id, data: { password: 'tomada-por-el-cliente' }, user: asCustomer(customer), overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.update({ collection: 'users', id: user.id, data: { email: `robado${DOMAIN}` }, user: asCustomer(customer), overrideAccess: false }),
    ).rejects.toThrow()
    expect((await payload.findByID({ collection: 'users', id: user.id })).email).toBe(`admin${DOMAIN}`)
  })

  it('un staff sí puede editar su propio usuario', async () => {
    const staff = await payload.create({ collection: 'users', data: { email: `staff${DOMAIN}`, password: PASSWORD, role: 'staff' } })
    const updated = await payload.update({ collection: 'users', id: staff.id, data: { name: 'Nuevo' }, user: asUser(staff), overrideAccess: false })
    expect(updated.name).toBe('Nuevo')
  })
})

describe('clientes', () => {
  it('no puede cambiar su email (vincularía pedidos de invitado ajenos)', async () => {
    const c = await payload.create({ collection: 'customers', data: { email: `uno${DOMAIN}`, password: PASSWORD, _verified: true } })
    await expect(
      payload.update({ collection: 'customers', id: c.id, data: { email: `victima${DOMAIN}` }, user: asCustomer(c), overrideAccess: false }),
    ).rejects.toThrow(/email/)
    const ok = await payload.update({ collection: 'customers', id: c.id, data: { firstName: 'Ana' }, user: asCustomer(c), overrideAccess: false })
    expect(ok.firstName).toBe('Ana')
    expect(ok.email).toBe(`uno${DOMAIN}`)
  })

  it('no puede marcarse como verificado ni crear cuentas verificadas', async () => {
    const c = await payload.create({ collection: 'customers', data: { email: `dos${DOMAIN}`, password: PASSWORD, _verified: true } })
    const otra = await payload.create({
      collection: 'customers',
      data: { email: `victima${DOMAIN}`, password: PASSWORD, _verified: true },
      user: asCustomer(c),
      overrideAccess: false,
      disableVerificationEmail: true,
    })
    expect((await payload.findByID({ collection: 'customers', id: otra.id }))._verified).toBe(false)

    const anon = await payload.create({
      collection: 'customers',
      data: { email: `anonimo${DOMAIN}`, password: PASSWORD, _verified: true },
      overrideAccess: false,
      disableVerificationEmail: true,
      req: restReq(),
    })
    expect((await payload.findByID({ collection: 'customers', id: anon.id }))._verified).toBe(false)
  })

  it('el staff sí puede corregir el email de un cliente', async () => {
    const staff = await payload.create({ collection: 'users', data: { email: `staff${DOMAIN}`, password: PASSWORD, role: 'staff' } })
    const c = await payload.create({ collection: 'customers', data: { email: `tres${DOMAIN}`, password: PASSWORD, _verified: true } })
    const updated = await payload.update({ collection: 'customers', id: c.id, data: { email: `tres-bis${DOMAIN}` }, user: asUser(staff), overrideAccess: false })
    expect(updated.email).toBe(`tres-bis${DOMAIN}`)
  })

  it('exige contraseñas de al menos 8 caracteres en la API', async () => {
    await expect(
      payload.create({ collection: 'customers', data: { email: `corta${DOMAIN}`, password: '1234' }, overrideAccess: false, disableVerificationEmail: true, req: restReq() }),
    ).rejects.toThrow(/al menos 8/)
  })

  it('limita los registros y los intentos de login por IP', async () => {
    const ip = '198.51.100.9'
    for (let i = 0; i < 5; i++) {
      await payload.create({ collection: 'customers', data: { email: `alta${i}${DOMAIN}`, password: PASSWORD }, overrideAccess: false, disableVerificationEmail: true, req: restReq(ip) })
    }
    await expect(
      payload.create({ collection: 'customers', data: { email: `alta5${DOMAIN}`, password: PASSWORD }, overrideAccess: false, disableVerificationEmail: true, req: restReq(ip) }),
    ).rejects.toThrow(/Demasiados intentos/)

    const login = () => payload.login({ collection: 'customers', data: { email: `nadie${DOMAIN}`, password: 'incorrecta' }, overrideAccess: false, req: restReq(ip) })
    for (let i = 0; i < 10; i++) await expect(login()).rejects.not.toThrow(/Demasiados intentos/)
    await expect(login()).rejects.toThrow(/Demasiados intentos/)
  })
})

describe('catálogo', () => {
  it('un cliente no ve las versiones (borradores) de productos ni páginas', async () => {
    const c = await payload.create({ collection: 'customers', data: { email: `cat${DOMAIN}`, password: PASSWORD, _verified: true } })
    await expect(payload.findVersions({ collection: 'products', user: asCustomer(c), overrideAccess: false })).rejects.toThrow()
    await expect(payload.findVersions({ collection: 'pages', user: asCustomer(c), overrideAccess: false })).rejects.toThrow()
  })
})

describe('pedidos', () => {
  const order = async (email: string, customerId?: number) => {
    const res = await placeOrder(
      payload,
      {
        lines: [{ variantId, qty: 1 }],
        contact: { email, firstName: 'Ana', lastName: 'García', phone: '1155555555', dni: '30111222' },
        shippingRateId: 'pickup:store',
        paymentMethod: 'transfer',
        acceptTerms: true,
      },
      customerId,
    )
    if (!res.ok) throw new Error(res.error)
    return (await payload.find({ collection: 'orders', where: { orderNumber: { equals: res.orderNumber } }, depth: 0 })).docs[0]
  }

  it('el cliente no ve las notas internas ni la revisión de su pedido', async () => {
    const c = await payload.create({ collection: 'customers', data: { email: `pedidos${DOMAIN}`, password: PASSWORD, _verified: true } })
    const o = await order(`pedidos${DOMAIN}`, c.id)
    await payload.update({ collection: 'orders', id: o.id, data: { adminNotes: 'cliente difícil', needsReview: 'other' }, context: { skipEmails: true } })
    const seen = await payload.findByID({ collection: 'orders', id: o.id, user: asCustomer(c), overrideAccess: false })
    expect(seen.orderNumber).toBe(o.orderNumber)
    expect(seen.adminNotes).toBeUndefined()
    expect(seen.needsReview).toBeUndefined()
    // Payload devuelve los arrays sin permiso de lectura vacíos.
    expect(seen.statusHistory ?? []).toEqual([])
    expect(seen.accessToken).toBeUndefined()
  })

  it('el staff no puede tocar los datos de pago ni los totales, pero sí el estado (con historial)', async () => {
    const staff = await payload.create({ collection: 'users', data: { email: `staff${DOMAIN}`, password: PASSWORD, role: 'staff' } })
    const o = await order(`staff-pedido${DOMAIN}`)
    const updated = await payload.update({
      collection: 'orders',
      id: o.id,
      data: { status: 'paid', mp: { paymentId: '999' }, totals: { total: 1 }, accessToken: 'otro' },
      user: asUser(staff),
      overrideAccess: false,
      context: { skipEmails: true },
    })
    const fresh = await payload.findByID({ collection: 'orders', id: o.id })
    expect(updated.status).toBe('paid')
    expect(fresh.mp?.paymentId).toBeFalsy()
    expect(fresh.totals?.total).toBe(o.totals?.total)
    expect(fresh.accessToken).toBe(o.accessToken)
    expect(fresh.paidAt).toBeTruthy()
    expect(fresh.statusHistory?.map((h) => h.to)).toEqual(['pending_payment', 'paid'])
    expect(fresh.statusHistory?.at(-1)?.by).toBe(`staff${DOMAIN}`)
  })

  it('solo un admin puede reembolsar', async () => {
    const staff = await payload.create({ collection: 'users', data: { email: `staff${DOMAIN}`, password: PASSWORD, role: 'staff' } })
    const o = await order(`reembolso${DOMAIN}`)
    const refund = orderEndpoints.find((e) => e.path === '/:id/refund')!
    const res = await refund.handler({ user: asUser(staff), routeParams: { id: String(o.id) }, payload } as unknown as PayloadRequest)
    expect(res.status).toBe(401)
  })

  it('rechaza un checkout con demasiadas líneas', async () => {
    const res = await placeOrder(payload, {
      lines: Array.from({ length: 51 }, () => ({ variantId, qty: 1 })),
      contact: { email: `lineas${DOMAIN}`, firstName: 'Ana', lastName: 'García', phone: '1155555555', dni: '30111222' },
      shippingRateId: 'pickup:store',
      paymentMethod: 'transfer',
      acceptTerms: true,
    })
    expect(res.ok).toBe(false)
  })
})
