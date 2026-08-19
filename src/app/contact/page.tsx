import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PostmarkRoundel, StampFrame } from '@/components/ui/Stamp'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Talk to Karen and Ciaran about an order, a corporate list, or whether we can get something to you by a date.',
  alternates: { canonical: '/contact' },
}

/**
 * Contact.
 *
 * The phone number, email address and opening hours are outstanding client
 * details. Rather than printing a number we have not confirmed, this page
 * routes people to the channels we know exist and says plainly what is
 * missing. Filling them in is an edit to site-config, not to this page.
 */
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <PostmarkRoundel className="h-20 w-20 text-green" />
      <h1 className="mt-6 font-display text-[length:var(--text-hero)] text-navy">Contact us</h1>
      <p className="mt-4 text-lg text-ink-muted">
        You will be talking to {SITE.owners}. We read everything ourselves, which is slower than a
        call centre and considerably more useful.
      </p>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="font-serif text-2xl font-semibold text-navy">About an order</h2>
          <p className="mt-2 text-ink-muted">
            Have your order number ready if you have one. If you are asking whether something can
            arrive by a particular date, tell us the eircode as well and we can answer properly
            rather than guessing.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-navy">Corporate orders</h2>
          <p className="mt-2 text-ink-muted">
            Use the{' '}
            <Link href="/corporate-gifting/enquiry" className="underline underline-offset-4">
              corporate enquiry form
            </Link>{' '}
            rather than emailing. It asks the four things we need to quote you, so it saves a round
            trip.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-navy">Come and see us</h2>
          <p className="mt-2 text-ink-muted">
            {SITE.town}, {SITE.county}, Ireland. The shop carries far more than the website does:
            jewellery, skincare, candles, homeware, cards and a wine room you can browse bottle by
            bottle. If you are anywhere near, it is worth the trip, and one of us will help you
            choose. We hand deliver locally ourselves, which means one of us is often out in the
            van rather than beside the phone.
          </p>
          <StampFrame className="mt-6 bg-beige">
            <Image
              src="/photography/tpc-may-1-2.jpg"
              alt={`The Parcel Concierge shopfront in ${SITE.town}, with opening hours on the sign and wine barrel tables outside`}
              width={1600}
              height={1067}
              sizes="(min-width: 1024px) 42rem, 92vw"
              className="aspect-3/2 w-full object-cover"
            />
          </StampFrame>
        </section>
      </div>
    </div>
  )
}
