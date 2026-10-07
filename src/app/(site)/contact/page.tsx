import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ContactForm } from '@/components/contact/ContactForm'
import { PostmarkRoundel, StampFrame } from '@/components/ui/Stamp'
import { CONTACT, SITE, postalAddress } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Talk to Karen and Ciaran about an order, a corporate list, or whether we can get something to you by a date.',
  alternates: { canonical: '/contact' },
}

/**
 * Contact.
 *
 * The phone number and email address are confirmed and come from
 * site-config, so they are stated once and cannot drift from the legal
 * pages that also carry them. Opening hours are still outstanding: the sign
 * in the shopfront photograph carries them in the meantime.
 */
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <PostmarkRoundel className="h-20 w-20 text-green" />
      <h1 className="mt-6 font-display text-[length:var(--text-hero)] text-navy">Contact us</h1>
      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="border border-navy/20 bg-beige p-6">
          <dt className="text-xs uppercase tracking-[0.18em] text-green">Email</dt>
          <dd className="mt-2">
            <a
              href={`mailto:${CONTACT.email}`}
              // wrap-anywhere: the address is one unbreakable word, and at
              // 320px it pushed the whole page sideways.
              className="font-serif text-xl text-navy underline underline-offset-4 wrap-anywhere"
            >
              {CONTACT.email}
            </a>
          </dd>
        </div>
        <div className="border border-navy/20 bg-beige p-6">
          <dt className="text-xs uppercase tracking-[0.18em] text-green">Telephone</dt>
          <dd className="mt-2">
            <a
              href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}
              className="font-serif text-xl text-navy underline underline-offset-4"
            >
              {CONTACT.phone}
            </a>
          </dd>
        </div>
        <div className="border border-navy/20 bg-beige p-6 sm:col-span-2">
          <dt className="text-xs uppercase tracking-[0.18em] text-green">Address</dt>
          <dd className="mt-2 font-serif text-xl text-navy">{postalAddress()}</dd>
        </div>
      </dl>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-navy">Send us a message</h2>
        <p className="mt-2 text-ink-muted">
          For anything about an order, a gift, or whether we can get something to you by a date. We
          read every one ourselves and reply the same working day.
        </p>
        <div className="mt-6">
          <ContactForm />
        </div>
      </section>

      <div className="mt-10 space-y-8">
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
