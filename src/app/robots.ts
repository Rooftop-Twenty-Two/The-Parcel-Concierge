import type { MetadataRoute } from 'next'
import { isFixtureMode } from '@/lib/commerce'
import { SITE } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  // A preview build serving fixture products must never be crawled.
  if (isFixtureMode()) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart', '/api/', '/checkout-unavailable', '/gift/', '/admin/', '/corporate-gifting/dashboard/'],
    },
    sitemap: new URL('/sitemap.xml', SITE.url).toString(),
  }
}
