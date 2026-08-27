import type { Metadata } from 'next'
import { fontVariables } from '@/lib/brand/fonts'
import { isFixtureMode } from '@/lib/commerce'
import { SITE } from '@/lib/site-config'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'The Parcel Concierge, hampers, wine and gifts from Co. Meath',
    template: '%s | The Parcel Concierge',
  },
  description:
    'Hampers packed by hand in Dunshaughlin, over three hundred wines chosen by us, corporate gifting and a hamper you can build yourself. Free hand delivery locally, €8.95 anywhere else in Ireland and free over €100.',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    siteName: SITE.name,
  },
  // Until the live store is connected, prices and stock are a snapshot;
  // the preview must never be indexed as if it were the shop.
  robots: isFixtureMode() ? { index: false, follow: false } : undefined,
}

/**
 * The bare shell: html, body, fonts, skip link. The shop's chrome (banner,
 * header, footer, analytics) lives in the (site) group so that recipient
 * gifting pages under /gift and the fulfilment admin can render without a
 * shop wrapped around them.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" className={fontVariables}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:bg-navy focus:px-4 focus:py-2 focus:text-cream"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
