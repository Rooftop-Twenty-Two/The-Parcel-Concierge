import { Analytics } from '@/components/analytics/Analytics'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { FixtureModeBanner } from '@/components/layout/FixtureModeBanner'
import { JsonLd } from '@/components/seo/JsonLd'
import { isFixtureMode } from '@/lib/commerce'
import { localBusinessJsonLd, websiteJsonLd } from '@/lib/seo/structured-data'
import { getTrustSummary } from '@/lib/trustpilot'

/**
 * The shop's chrome: banner, header, footer.
 *
 * Every normal page lives in this group. What does NOT: the /gift
 * recipient pages, which must feel like receiving a present rather than
 * visiting a shop, and the fulfilment admin. Those render inside the bare
 * root layout with no navigation at all.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Deliberately no cookie reads in here. The cart badge and the age gate
  // both resolve after hydration, so every page below stays statically
  // renderable and the LCP budget survives.
  const trust = await getTrustSummary()

  return (
    <>
      {isFixtureMode() ? <FixtureModeBanner /> : null}

      <Header />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />

      <JsonLd data={localBusinessJsonLd(trust)} />
      <JsonLd data={websiteJsonLd()} />
      <Analytics />
    </>
  )
}
