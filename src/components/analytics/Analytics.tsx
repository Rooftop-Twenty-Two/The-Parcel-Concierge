import Script from 'next/script'

/**
 * GA4 and the ad platforms.
 *
 * Loaded only where a measurement id is configured (outstanding item 6), so
 * a missing id means no tag rather than a broken one.
 *
 * The purchase event is NOT fired here. It fires on the Shopify side of the
 * checkout handoff, and firing it here as well is how a site double counts
 * revenue across a domain change. See docs/analytics.md for the verification
 * steps before launch.
 */
export function Analytics() {
  const ga4 = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const googleAds = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
  const metaPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID

  if (!ga4 && !googleAds && !metaPixel) return null

  return (
    <>
      {ga4 || googleAds ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4 ?? googleAds}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${ga4 ? `gtag('config', '${ga4}', { send_page_view: true });` : ''}
              ${googleAds ? `gtag('config', '${googleAds}');` : ''}
            `}
          </Script>
        </>
      ) : null}

      {metaPixel ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixel}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  )
}
