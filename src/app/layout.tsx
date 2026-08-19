import type { Metadata } from 'next'
import { Analytics } from '@/components/analytics/Analytics'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { FixtureModeBanner } from '@/components/layout/FixtureModeBanner'
import { JsonLd } from '@/components/seo/JsonLd'
import { fontVariables } from '@/lib/brand/fonts'
import { isFixtureMode } from '@/lib/commerce'
import { localBusinessJsonLd } from '@/lib/seo/structured-data'
import { SITE } from '@/lib/site-config'
import { getTrustSummary } from '@/lib/trustpilot'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'The Parcel Concierge, Irish hampers packed by hand in Co. Meath',
    template: '%s | The Parcel Concierge',
  },
  description:
    'Hampers built from Irish producers and packed by hand in Dunshaughlin, Co. Meath. Free hand delivery locally, €7.95 anywhere else in Ireland.',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    siteName: SITE.name,
  },
  // Fixture mode must never be indexed: the products are invented.
  robots: isFixtureMode() ? { index: false, follow: false } : undefined,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Deliberately no cookie reads in here. The cart badge and the age gate
  // both resolve after hydration, so every page below stays statically
  // renderable and the LCP budget survives.
  const trust = await getTrustSummary()

  return (
    <html lang="en-IE" className={fontVariables}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:bg-navy focus:px-4 focus:py-2 focus:text-cream"
        >
          Skip to main content
        </a>

        {isFixtureMode() ? <FixtureModeBanner /> : null}

        <Header />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer />

        <JsonLd data={localBusinessJsonLd(trust)} />
        <Analytics />
      </body>
    </html>
  )
}
