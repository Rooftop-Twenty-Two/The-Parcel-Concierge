import type { MetadataRoute } from 'next'
import { isFixtureMode } from '@/lib/commerce'
import { FACET_KEYS } from '@/lib/commerce/collections'
import { SITE, SITE_NOINDEX } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  // A preview/fixture build, or any environment held back from launch
  // (SITE_NOINDEX), must never be crawled.
  if (isFixtureMode() || SITE_NOINDEX) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  // Filtered listings are kept out of the crawl. A dozen grapes and a handful
  // of countries make millions of combinations, each rendered on request, and
  // ClaudeBot spent September 2026 walking them at ten a second. `?more=`
  // stays open so a crawler can still page an unfiltered listing.
  const filtered = FACET_KEYS.map((key) => `/*?*${key}=`)

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart', '/api/', '/checkout-unavailable', '/gift/', '/admin/', '/corporate-gifting/dashboard/', '/search', ...filtered],
    },
    sitemap: new URL('/sitemap.xml', SITE.url).toString(),
  }
}
