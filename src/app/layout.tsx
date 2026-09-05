import type { Metadata } from 'next'
import { fontVariables } from '@/lib/brand/fonts'
import { isFixtureMode } from '@/lib/commerce'
import {
  GOOGLE_SITE_VERIFICATION,
  SITE,
  SITE_COMING_SOON,
  SITE_NOINDEX,
} from '@/lib/site-config'
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
  // Noindex while on fixtures (a snapshot, not the shop) or while an
  // environment is held back from launch (SITE_NOINDEX) — e.g. the production
  // Vercel domain before the real domain and legal pages go live.
  robots:
    isFixtureMode() || SITE_NOINDEX || SITE_COMING_SOON
      ? { index: false, follow: false }
      : undefined,
  // Proves ownership to Search Console. Unset means no tag at all, which is
  // the right default: an empty verification tag is worse than none.
  verification: GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : undefined,
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
