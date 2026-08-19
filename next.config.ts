import type { NextConfig } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Redirects are generated from data/redirects/redirects.csv by
 * `npm run redirects:build`, which writes src/generated/redirects.json.
 *
 * They are never hand-written here. The CSV is the reviewable, diffable
 * source of truth (brief section 9), and the generated JSON is committed so
 * a deploy never silently ships without the map.
 */
function loadGeneratedRedirects(): NextConfig['redirects'] {
  let rows: { source: string; destination: string; permanent: boolean }[] = []
  try {
    const raw = readFileSync(join(process.cwd(), 'src/generated/redirects.json'), 'utf8')
    rows = JSON.parse(raw)
  } catch {
    // Build has not been run yet. Fail loudly in CI, quietly in local dev.
    if (process.env.CI) {
      throw new Error(
        'src/generated/redirects.json is missing. Run `npm run redirects:build` before building.',
      )
    }
  }
  return async () => rows
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
  redirects: loadGeneratedRedirects(),
}

export default nextConfig
