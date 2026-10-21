import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/** Hosts desde los que next/image puede optimizar: el sitio (media local) y el bucket R2. */
const remotePatterns = [process.env.NEXT_PUBLIC_SERVER_URL, process.env.NEXT_PUBLIC_MEDIA_URL]
  .filter((u): u is string => Boolean(u))
  .map((u) => {
    const url = new URL(u)
    return { protocol: url.protocol.replace(':', '') as 'http' | 'https', hostname: url.hostname, port: url.port, pathname: '/**' }
  })

const nextConfig: NextConfig = {
  // Imagen Docker mínima (servidor propio). Vercel ignora esta opción.
  output: 'standalone',
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }, { pathname: '/logo.png', search: '' }],
    remotePatterns,
    // En desarrollo el host es localhost: Next bloquea optimizar IPs privadas por defecto.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
