import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ProductGrid } from '@/components/product/ProductCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { ButtonLink } from '@/components/ui/Button'
import { InkWaves, StampFrame } from '@/components/ui/Stamp'
import { queryProducts } from '@/lib/commerce'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'
import { BULK_ORDER_MINIMUM } from '@/lib/corporate'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Corporate gifting',
  description:
    'Client and staff hampers from Irish producers, with your branding on the card. Bulk orders, individual addresses handled, and volume pricing on request.',
  alternates: { canonical: '/corporate-gifting' },
}

/**
 * Corporate gifting.
 *
 * A real flow, not a contact link. The June review found the corporate
 * offer amounted to an email address, and corporate is where the AOV and
 * the repeat orders are.
 */
export default async function CorporateGiftingPage() {
  const { items } = await queryProducts({ tags: ['occasion:corporate'], first: 8 })

  return (
    <>
      <section className="bg-navy text-cream">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">For business</p>
            <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">
              Corporate gifting
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cream/85">
              Hampers built from small Irish producers, packed by hand in Co. Meath, with your
              branding on a card inside the lid. Send us the list and we will handle the addresses.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/corporate-gifting/enquiry" size="large">
                Start an enquiry
              </ButtonLink>
              <ButtonLink href="/hampers/corporate" variant="ghost" className="border-cream text-cream hover:bg-cream hover:text-navy">
                See corporate hampers
              </ButtonLink>
            </div>
          </div>

          <StampFrame className="bg-beige">
            <Image
              src="/placeholder/hamper-3.png"
              alt="A corporate hamper boxed and hand tied with ribbon"
              width={1200}
              height={1500}
              priority
              sizes="(min-width: 1024px) 46vw, 92vw"
              className="aspect-4/3 w-full object-cover"
            />
          </StampFrame>
        </div>
        <InkWaves className="h-14 w-full text-cream/25" lines={4} />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
        <h2 className="font-display text-[length:var(--text-display)] text-navy">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            {
              title: 'Tell us the shape of it',
              body: `How many, roughly what per unit, and when it has to land. ${BULK_ORDER_MINIMUM} units is where volume pricing starts.`,
            },
            {
              title: 'We quote you',
              body: 'A price per unit including branding and delivery, with a firm date. No discount table you have to interpret.',
            },
            {
              title: 'Send the list',
              body: 'A spreadsheet with name, address, eircode and phone for each recipient. The phone number is the one people forget.',
            },
            {
              title: 'We pack and send',
              body: 'Packed by hand here, dispatched together, tracked. We tell you what landed and what came back.',
            },
          ].map((step, index) => (
            <li key={step.title} className="border-t-2 border-gold pt-4">
              <span className="font-display text-3xl text-green">{index + 1}</span>
              <h3 className="mt-1 font-serif text-lg font-semibold text-navy">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-beige py-14">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <CorporateCard
              href="/corporate-gifting/bulk-orders"
              title="Bulk orders"
              body="Volume pricing, lead times, and what we need from you to hit a date in December."
            />
            <CorporateCard
              href="/corporate-gifting/branding-personalisation"
              title="Branding and personalisation"
              body="Printed cards, ribbon in your colours, handwritten notes and bespoke contents."
            />
            <CorporateCard
              href="/corporate-gifting/enquiry"
              title="Make an enquiry"
              body="Quantity, budget per unit, delivery mode and deadline. Two minutes, and we come back the same day."
            />
          </div>
        </div>
      </section>

      {items.length ? (
        <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
          <h2 className="font-display text-[length:var(--text-display)] text-navy">
            Where most companies start
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">
            These are the boxes we send by the hundred. Any of them can be branded, and the
            alcohol free ones exist so you do not have to check the list first.
          </p>
          <div className="mt-8">
            <ProductGrid products={items} />
          </div>
        </section>
      ) : null}

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Corporate gifting', path: '/corporate-gifting' },
        ])}
      />
    </>
  )
}

function CorporateCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group block border border-navy/20 bg-cream p-8 transition-colors hover:border-navy"
    >
      <h2 className="font-serif text-2xl font-semibold text-navy group-hover:underline">{title}</h2>
      <p className="mt-3 text-ink-muted">{body}</p>
      <span className="mt-5 inline-block text-sm text-green">Read more →</span>
    </Link>
  )
}
