import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { es } from '@payloadcms/translations/languages/es'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Coupons } from './collections/Coupons'
import { Customers } from './collections/Customers'
import { ExchangeRateHistory } from './collections/ExchangeRateHistory'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Pages } from './collections/Pages'
import { PaymentEvents } from './collections/PaymentEvents'
import { Products } from './collections/Products'
import { RegretRequests } from './collections/RegretRequests'
import { ShippingZones } from './collections/ShippingZones'
import { Users } from './collections/Users'
import { Variants } from './collections/Variants'
import { ExchangeRate } from './globals/ExchangeRate'
import { ShippingSettings } from './globals/ShippingSettings'
import { StoreSettings } from './globals/StoreSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Imágenes en Cloudflare R2 (S3 compatible) si hay credenciales; si no, disco local (desarrollo).
const useR2 = Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — Admin tienda' },
  },
  i18n: { supportedLanguages: { es }, fallbackLanguage: 'es' },
  collections: [
    Products,
    Variants,
    Categories,
    Media,
    Orders,
    Customers,
    Coupons,
    ShippingZones,
    PaymentEvents,
    RegretRequests,
    Pages,
    ExchangeRateHistory,
    Users,
  ],
  globals: [StoreSettings, ExchangeRate, ShippingSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      // En serverless cada instancia abre su propio pool: mantenerlo chico (Neon pooled).
      max: Number(process.env.DATABASE_POOL_MAX || 5),
    },
  }),
  ...(process.env.RESEND_API_KEY
    ? {
        email: resendAdapter({
          apiKey: process.env.RESEND_API_KEY,
          defaultFromAddress: process.env.EMAIL_FROM || 'pedidos@example.com',
          defaultFromName: process.env.EMAIL_FROM_NAME || 'Tienda',
        }),
      }
    : {}),
  sharp,
  plugins: [
    seoPlugin({
      collections: ['products', 'categories', 'pages'],
      uploadsCollection: 'media',
      tabbedUI: false,
      generateTitle: ({ doc }) => doc?.title ?? '',
      generateDescription: ({ doc }) => doc?.shortDescription ?? doc?.description ?? '',
      generateURL: ({ doc, collectionSlug }) => {
        const base = process.env.NEXT_PUBLIC_SERVER_URL || ''
        const prefix = collectionSlug === 'products' ? 'productos' : collectionSlug === 'categories' ? 'categoria' : 'legales'
        return `${base}/${prefix}/${doc?.slug ?? ''}`
      },
    }),
    s3Storage({
      enabled: useR2,
      collections: {
        media: process.env.NEXT_PUBLIC_MEDIA_URL
          ? { generateFileURL: ({ filename, prefix }) => `${process.env.NEXT_PUBLIC_MEDIA_URL}/${[prefix, filename].filter(Boolean).join('/')}` }
          : true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'auto',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: true,
      },
    }),
  ],
})
