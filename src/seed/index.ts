/**
 * Datos de demo para desarrollo:  pnpm seed   (pnpm seed:reset vacía el catálogo antes)
 * Crea admin, configuración, categorías, productos (ARS y USD, con variantes), zonas de envío,
 * un cupón y páginas legales BASE (a revisar por un profesional antes de publicar).
 */
import { randomBytes } from 'node:crypto'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { lexical } from './lexical'

const reset = process.env.SEED_RESET === '1'

const image = async (payload: Payload, label: string, color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`
  const data = await sharp(Buffer.from(svg)).png().toBuffer()
  return payload.create({
    collection: 'media',
    data: { alt: label },
    file: { data, mimetype: 'image/png', name: `${label.toLowerCase().replace(/\W+/g, '-')}.png`, size: data.length },
  })
}

type SeedProduct = {
  title: string
  category: string
  currency: 'ARS' | 'USD'
  price: number
  compareAtPrice?: number
  color: string
  featured?: boolean
  weightGrams: number
  dims: [number, number, number]
  short: string
  options?: { name: string; values: string[] }[]
  /** stock por combinación "M / Negro"; para productos simples, una sola clave "Única". */
  stock: Record<string, number>
}

const PRODUCTS: SeedProduct[] = [
  {
    title: 'Remera Oversize Algodón',
    category: 'indumentaria',
    currency: 'ARS',
    price: 24900,
    compareAtPrice: 29900,
    color: '#18181b',
    featured: true,
    weightGrams: 250,
    dims: [30, 25, 3],
    short: 'Remera de algodón peinado 24/1, calce oversize.',
    options: [
      { name: 'Talle', values: ['S', 'M', 'L', 'XL'] },
      { name: 'Color', values: ['Negro', 'Blanco'] },
    ],
    stock: { 'S / Negro': 5, 'M / Negro': 8, 'L / Negro': 3, 'XL / Negro': 0, 'S / Blanco': 4, 'M / Blanco': 6, 'L / Blanco': 2, 'XL / Blanco': 1 },
  },
  {
    title: 'Buzo Canguro Frisa',
    category: 'indumentaria',
    currency: 'ARS',
    price: 52900,
    color: '#3f3f46',
    featured: true,
    weightGrams: 650,
    dims: [35, 30, 8],
    short: 'Buzo con capucha y bolsillo canguro, frisa invisible.',
    options: [{ name: 'Talle', values: ['M', 'L', 'XL'] }],
    stock: { M: 4, L: 6, XL: 2 },
  },
  {
    title: 'Auriculares Bluetooth Pro',
    category: 'tecnologia',
    currency: 'USD',
    price: 89.99,
    compareAtPrice: 109.99,
    color: '#1d4ed8',
    featured: true,
    weightGrams: 300,
    dims: [20, 18, 8],
    short: 'Cancelación activa de ruido, 30 h de batería, carga USB-C.',
    stock: { Única: 10 },
  },
  {
    title: 'Parlante Portátil Resistente al Agua',
    category: 'tecnologia',
    currency: 'USD',
    price: 49.5,
    color: '#0f766e',
    featured: true,
    weightGrams: 550,
    dims: [22, 12, 12],
    short: 'IP67, 12 h de batería, sonido 360°.',
    options: [{ name: 'Color', values: ['Negro', 'Verde'] }],
    stock: { Negro: 7, Verde: 3 },
  },
  {
    title: 'Mate Térmico Acero',
    category: 'hogar',
    currency: 'ARS',
    price: 18500,
    color: '#b45309',
    weightGrams: 350,
    dims: [12, 10, 10],
    short: 'Doble pared de acero inoxidable, mantiene la temperatura.',
    stock: { Única: 25 },
  },
  {
    title: 'Set de Sartenes Antiadherentes',
    category: 'hogar',
    currency: 'USD',
    price: 120,
    color: '#7c2d12',
    weightGrams: 3200,
    dims: [45, 30, 15],
    short: 'Tres sartenes (20, 24 y 28 cm) aptas inducción.',
    stock: { Única: 2 },
  },
]

const LEGAL_PAGES = [
  {
    title: 'Términos y condiciones',
    slug: 'terminos-y-condiciones',
    content: [
      'BORRADOR — Este texto es un ejemplo y debe ser revisado por un profesional antes de publicar la tienda.',
      { h2: 'Precios y medios de pago' },
      'Todos los precios están expresados en pesos argentinos e incluyen IVA. Los productos cuyo precio de referencia está en dólares se convierten al tipo de cambio oficial del Banco de la Nación Argentina (vendedor) vigente al momento de la compra.',
      { h2: 'Disponibilidad' },
      'El stock se reserva al confirmar el pedido y se libera si el pago no se acredita dentro del plazo informado.',
      { h2: 'Derecho de arrepentimiento' },
      'Podés revocar la compra dentro de los 10 días corridos desde la entrega del producto mediante el Botón de arrepentimiento disponible en el sitio (art. 34, Ley 24.240).',
    ],
  },
  {
    title: 'Política de privacidad',
    slug: 'privacidad',
    content: [
      'BORRADOR — Este texto es un ejemplo y debe ser revisado por un profesional antes de publicar la tienda.',
      'Tratamos tus datos personales conforme a la Ley 25.326 de Protección de Datos Personales. Usamos tus datos solo para procesar tus pedidos, enviarlos y contactarte por ellos.',
      'El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto (art. 14, inc. 3, Ley 25.326). La Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326.',
    ],
  },
  {
    title: 'Cambios y devoluciones',
    slug: 'cambios-y-devoluciones',
    content: [
      'BORRADOR — Ajustá estas condiciones a tu operación.',
      { ul: ['Tenés 30 días para cambios con el producto sin uso y en su empaque.', 'Los cambios por falla no tienen costo.', 'Para arrepentirte de una compra usá el Botón de arrepentimiento.'] },
    ],
  },
  {
    title: 'Envíos',
    slug: 'envios',
    content: [
      'Hacemos envíos a todo el país. El costo y el plazo se calculan en el checkout según tu código postal.',
      'También podés retirar tu compra sin cargo en nuestro local.',
    ],
  },
]

const run = async () => {
  const payload = await getPayload({ config })
  payload.logger.info('Seed: iniciando…')

  if (reset) {
    for (const collection of ['orders', 'payment-events', 'variants', 'products', 'categories', 'coupons', 'shipping-zones', 'pages', 'media'] as const) {
      await payload.delete({ collection, where: { id: { exists: true } }, context: { skipEmails: true } })
    }
    payload.logger.info('Seed: catálogo vaciado')
  }

  // Admin
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@tosh.local'
  const existingAdmin = await payload.find({ collection: 'users', where: { email: { equals: adminEmail } }, limit: 1 })
  let adminPassword: string | null = null
  if (!existingAdmin.docs.length) {
    adminPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString('base64url')
    await payload.create({ collection: 'users', data: { email: adminEmail, password: adminPassword, name: 'Admin', role: 'admin' } })
  }

  // Configuración
  await payload.updateGlobal({
    slug: 'store-settings',
    data: {
      storeName: 'Tosh',
      tagline: 'Indumentaria, tecnología y hogar',
      legalName: 'Tosh S.R.L. (ejemplo)',
      cuit: '30-00000000-0',
      address: 'Av. Siempreviva 742, CABA',
      contactEmail: 'hola@tosh.local',
      whatsappNumber: '5491100000000',
      adminNotificationEmails: [adminEmail],
      priceRoundingStep: 10,
      freeShippingThreshold: 80000,
      installments: { enabled: true, count: 3, interestFree: true },
      mercadoPagoEnabled: true,
      transferEnabled: true,
      transferDiscountPercent: 10,
      bank: { bankName: 'Banco Ejemplo', holder: 'Tosh S.R.L.', cuit: '30-00000000-0', cbu: '0000003100000000000001', alias: 'TOSH.TIENDA.MP' },
      reservationTtlMinutesMP: 30,
      reservationTtlHoursTransfer: 48,
      announcement: 'Envío gratis desde $80.000 · 3 cuotas sin interés · 10% OFF con transferencia',
      heroTitle: 'Nueva temporada',
      heroSubtitle: 'Hasta 3 cuotas sin interés y envíos a todo el país.',
    },
  })

  await payload.updateGlobal({
    slug: 'shipping-settings',
    data: {
      origin: { street: 'Av. Siempreviva', number: '742', city: 'CABA', province: 'CABA', postalCode: '1425' },
      pickup: { enabled: true, address: 'Av. Siempreviva 742, CABA', hours: 'Lun a Vie 10 a 18 h' },
      rateTable: { enabled: true },
      zipnova: { enabled: false },
    },
  })

  // Cotización: intenta la automática; si no hay red, deja una manual para poder probar.
  const { refreshExchangeRate } = await import('../lib/exchange-rate')
  const rate = await refreshExchangeRate(payload)
  if (!rate.ok) {
    await payload.updateGlobal({ slug: 'exchange-rate', data: { mode: 'manual', manualRate: 1200 } })
    payload.logger.warn(`Seed: DolarAPI no respondió (${rate.message}); cotización manual 1200`)
  } else {
    payload.logger.info(`Seed: cotización ${rate.message}`)
  }

  const existingProducts = await payload.count({ collection: 'products' })
  if (existingProducts.totalDocs > 0) {
    payload.logger.info('Seed: ya hay productos; usá pnpm seed:reset para regenerar el catálogo.')
  } else {
    const categories: Record<string, number> = {}
    for (const [slug, title, color, order] of [
      ['indumentaria', 'Indumentaria', '#27272a', 1],
      ['tecnologia', 'Tecnología', '#1e3a8a', 2],
      ['hogar', 'Hogar', '#78350f', 3],
    ] as const) {
      const img = await image(payload, title, color)
      const cat = await payload.create({ collection: 'categories', data: { title, slug, order, image: img.id, description: `Lo mejor en ${title.toLowerCase()}.` } })
      categories[slug] = cat.id
    }

    for (const p of PRODUCTS) {
      const images = [await image(payload, p.title.split(' ').slice(0, 2).join(' '), p.color)]
      const product = await payload.create({
        collection: 'products',
        data: {
          title: p.title,
          category: [categories[p.category]],
          featured: p.featured ?? false,
          images: images.map((i) => i.id),
          shortDescription: p.short,
          description: lexical([p.short, { h2: 'Características' }, { ul: ['Garantía oficial de 6 meses', 'Factura A o B', 'Envíos a todo el país'] }]),
          currency: p.currency,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          taxRate: '21',
          options: p.options?.map((o) => ({ name: o.name, values: o.values })),
          weightGrams: p.weightGrams,
          lengthCm: p.dims[0],
          widthCm: p.dims[1],
          heightCm: p.dims[2],
          _status: 'published',
        },
      })

      // El hook crea una variante "Única": para productos con opciones se reemplaza por las combinaciones.
      const keys = Object.keys(p.stock)
      if (p.options?.length) {
        await payload.delete({ collection: 'variants', where: { product: { equals: product.id } } })
        for (const key of keys) {
          const values = key.split(' / ')
          await payload.create({
            collection: 'variants',
            data: {
              product: product.id,
              options: p.options.map((o, i) => ({ name: o.name, value: values[i] })),
              sku: `${product.slug}-${values.join('-')}`.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
              stock: p.stock[key],
              active: true,
            },
          })
        }
      } else {
        await payload.update({ collection: 'variants', where: { product: { equals: product.id } }, data: { stock: p.stock['Única'] } })
      }
    }
    payload.logger.info(`Seed: ${PRODUCTS.length} productos creados`)

    await payload.create({
      collection: 'shipping-zones',
      data: {
        name: 'CABA',
        priority: 10,
        provinces: ['CABA'],
        weightBrackets: [
          { maxGrams: 1000, price: 4500 },
          { maxGrams: 5000, price: 6900 },
        ],
        extraPerKg: 900,
        etaDays: { min: 1, max: 2 },
        freeEligible: true,
        active: true,
      },
    })
    await payload.create({
      collection: 'shipping-zones',
      data: {
        name: 'GBA',
        priority: 5,
        postalRanges: [{ from: 1600, to: 1899 }],
        weightBrackets: [
          { maxGrams: 1000, price: 5900 },
          { maxGrams: 5000, price: 8400 },
        ],
        extraPerKg: 1100,
        etaDays: { min: 2, max: 3 },
        freeEligible: true,
        active: true,
      },
    })
    await payload.create({
      collection: 'shipping-zones',
      data: {
        name: 'Resto del país',
        priority: 0,
        provinces: ['Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'],
        weightBrackets: [
          { maxGrams: 1000, price: 8900 },
          { maxGrams: 5000, price: 12900 },
        ],
        extraPerKg: 1800,
        etaDays: { min: 3, max: 7 },
        freeEligible: true,
        active: true,
      },
    })

    await payload.create({
      collection: 'coupons',
      data: { code: 'BIENVENIDA10', type: 'percent', value: 10, minSubtotal: 20000, perCustomerLimit: 1, active: true, description: 'Primera compra' },
    })

    for (const page of LEGAL_PAGES) {
      await payload.create({ collection: 'pages', data: { title: page.title, slug: page.slug, showInFooter: true, content: lexical(page.content), _status: 'published' } })
    }
  }

  payload.logger.info('Seed: listo.')
  if (adminPassword) payload.logger.info(`Admin creado → ${adminEmail} / ${adminPassword}  (cambiá la contraseña)`)
  process.exit(0)
}

// payload run importa este módulo y sale al terminar el import: hay que esperar acá.
await run().catch((err) => {
  console.error(err)
  process.exit(1)
})
