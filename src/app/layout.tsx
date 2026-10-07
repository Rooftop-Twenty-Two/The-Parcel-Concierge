import type { Metadata } from 'next'
import { fontVariables } from '@/lib/brand/fonts'
import { isFixtureMode } from '@/lib/commerce'
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og'
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
    'Hampers packed by hand in Dunshaughlin, over three hundred wines chosen by us, and corporate gifting. Free local delivery, €8.95 across Ireland.',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    siteName: SITE.name,
    // The site had no share image at all, so every link posted to
    // WhatsApp, Messenger, Slack or LinkedIn — which is most of how a gift
    // shop gets shared — rendered as a bare grey box. A product page
    // overrides this with its own photograph; everything else inherits it.
    //
    // A real hamper in the branded box rather than a logo card: the logo
    // says who sent the link, the box says what is being sold.
    images: [DEFAULT_OG_IMAGE],
  },
  // Without this a shared link is a small thumbnail beside the text rather
  // than the full-width card. It governs X and is read by several other
  // scrapers that fall back to Twitter tags before Open Graph.
  twitter: {
    card: 'summary_large_image',
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
