import type { MetadataRoute } from 'next'
import { isFixtureMode } from '@/lib/commerce'
import { SITE, SITE_NOINDEX } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  // A preview/fixture build, or any environment held back from launch
  // (SITE_NOINDEX), must never be crawled.
  if (isFixtureMode() || SITE_NOINDEX) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart', '/api/', '/checkout-unavailable', '/gift/', '/admin/', '/corporate-gifting/dashboard/', '/search'],
    },
    sitemap: new URL('/sitemap.xml', SITE.url).toString(),
  }
}
