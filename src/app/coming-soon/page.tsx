import type { Metadata } from 'next'
import Image from 'next/image'
import { InkWaves, PostmarkRoundel } from '@/components/ui/Stamp'
import { CONTACT, SITE, postalAddress } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'A new website is on the way',
  description:
    'The Parcel Concierge in Dunshaughlin, Co. Meath. Our new website is on the way. The shop is open as usual in the meantime.',
  robots: { index: false, follow: false },
}

/**
 * The holding page.
 *
 * Sits outside the (site) group on purpose: the root layout is a bare
 * shell, so there is no header, no footer and no navigation to click into
 * the site this page exists to hold back.
 *
 * It says the shop is open, because it is. A holding page that only says
 * "coming soon" turns a customer away; this one gives them a phone number
 * and an address instead.
 */
export default function ComingSoonPage() {
  // `relative` and `overflow-hidden` on main are load bearing: the
  // watermark is positioned against it and hangs past its right edge, and
  // without both it escapes the viewport and the page scrolls sideways.
  return (
    <main
      id="main"
      className="relative flex min-h-screen flex-col overflow-hidden bg-green text-cream"
    >
      {/* The brand monogram as an oversized watermark, as on the hero. */}
      <Image
        src="/brand/graphic-element-5.svg"
        alt=""
        aria-hidden="true"
        width={767}
        height={1054}
        className="pointer-events-none absolute -right-24 -top-24 hidden w-[560px] opacity-[0.07] lg:block"
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center lg:px-8">
        <Image
          src="/brand/logo-gold.svg"
          alt={SITE.name}
          width={290}
          height={132}
          priority
          className="h-24 w-auto lg:h-32"
        />

        <p className="mt-10 text-xs uppercase tracking-[0.24em] text-gold">
          {SITE.town}, {SITE.county}
        </p>
        <h1 className="mt-4 font-display text-[length:var(--text-hero)] leading-[0.92]">
          A new website is on the way
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-cream/90">
          We are putting the finishing touches to a new home for our hampers, the Wine Vault and
          everything else we make and sell. It will be here shortly.
        </p>

        {/* The red cancellation waves from the brand asset pack. */}
        <Image
          src="/brand/graphic-element-1.svg"
          alt=""
          aria-hidden="true"
          width={304}
          height={156}
          className="mt-10 h-10 w-auto opacity-80"
        />

        <h2 className="mt-10 font-serif text-2xl text-cream">The shop is open as usual</h2>
        <p className="mx-auto mt-3 max-w-xl text-cream/85">
          Nothing has changed in Dunshaughlin. Call in, or ring us and we will put a hamper
          together for you over the phone.
        </p>

        <dl className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          <div className="border border-cream/25 px-5 py-5">
            <dt className="text-xs uppercase tracking-[0.18em] text-gold">Telephone</dt>
            <dd className="mt-2">
              <a
                href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}
                className="font-serif text-xl text-cream underline underline-offset-4 hover:text-gold"
              >
                {CONTACT.phone}
              </a>
            </dd>
          </div>
          <div className="border border-cream/25 px-5 py-5">
            <dt className="text-xs uppercase tracking-[0.18em] text-gold">Email</dt>
            <dd className="mt-2">
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-serif text-lg break-words text-cream underline underline-offset-4 hover:text-gold"
              >
                {CONTACT.email}
              </a>
            </dd>
          </div>
          <div className="border border-cream/25 px-5 py-5 sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.18em] text-gold">Call in and see us</dt>
            <dd className="mt-2 font-serif text-lg text-cream">{postalAddress()}</dd>
          </div>
        </dl>

        <PostmarkRoundel className="mt-12 h-24 w-24 text-gold/70" />
      </div>

      <InkWaves className="h-14 w-full text-cream/20" lines={4} />
    </main>
  )
}
