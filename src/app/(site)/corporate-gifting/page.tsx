import type { Metadata } from 'next'
import Image from 'next/image'
import { JsonLd } from '@/components/seo/JsonLd'
import { ButtonLink } from '@/components/ui/Button'
import { InkWaves, StampFrame } from '@/components/ui/Stamp'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'
import { VOLUME_TIERS } from '@/lib/corporate/types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Corporate Gifting Made Easy',
  description:
    'Choose your budget and your gifts, share one private link, and your team choose their own hamper and delivery address. No spreadsheets, no collecting addresses, one invoice.',
  alternates: { canonical: '/corporate-gifting' },
}

/**
 * Corporate Gifting Made Easy.
 *
 * The proposition: you choose the budget, they choose the gift, we take
 * care of everything else. The page sells the removal of the worst part
 * of corporate gifting, which is a spreadsheet of home addresses, and it
 * offers two doors the whole way down: build the campaign now, or talk to
 * a person. Big orders want a person.
 */
export default function CorporateGiftingPage() {
  return (
    <>
      <section className="bg-green text-cream">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-24">
          <div className="animate-rise">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">Corporate gifting made easy</p>
            <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">
              Reward your team without collecting a single address
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cream/90">
              Choose your budget and your gifts. We create a private gifting link for your company,
              your recipients pick their own hamper and enter their own delivery details, and we
              take care of everything else.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/corporate-gifting/new" size="large">
                Start a corporate gift campaign
              </ButtonLink>
              <ButtonLink href="/corporate-gifting/enquiry" variant="secondary">
                Speak to our corporate team
              </ButtonLink>
            </div>
            <p className="mt-6 text-sm text-cream/75">
              100 recipients. One payment. One link. Zero address spreadsheets.
            </p>
          </div>

          <StampFrame className="animate-rise bg-beige">
            <Image
              src="/photography/tpc-08-full.jpg"
              alt="A wooden herb growing box, a bottle of red wine and a hand lettered card in a gift box"
              width={1200}
              height={800}
              priority
              sizes="(min-width: 1024px) 42vw, 92vw"
              className="aspect-3/2 w-full object-cover"
            />
          </StampFrame>
        </div>
        <InkWaves className="h-14 w-full text-cream/25" lines={4} />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
        <h2 className="font-display text-[length:var(--text-display)] text-navy">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Choose your budget', 'Tell us how many people you are gifting and how much you want to spend per person.'],
            ['Choose your gifts', 'Select the hampers you would like your recipients to choose from.'],
            ['Share your private link', 'We create a unique gifting page for your company. Send the link by email, Teams, Slack or WhatsApp.'],
            ['We deliver everything', 'Recipients choose their gift and give us their address, and we handle packing, delivery and tracking.'],
          ].map(([title, body], index) => (
            <li key={title} className="border border-navy/15 bg-cream p-6">
              <span className="font-display text-3xl text-gold">{index + 1}</span>
              <h3 className="mt-2 font-serif text-xl text-navy">{title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-navy py-16 text-cream">
        <div className="mx-auto max-w-[900px] px-4 text-center lg:px-8">
          <h2 className="font-display text-[length:var(--text-display)]">
            Stop asking your employees for their home addresses
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-cream/85">
            Traditional corporate gifting means emailing hundreds of people, collecting delivery
            addresses in spreadsheets and manually coordinating orders. This removes all of it.
            You purchase the gifts. We give you one private link. Your team tells us what they
            want and where to send it, and we take care of everything from there.
          </p>
          <p className="mt-6 text-sm text-cream/70">
            Recipients give their address directly to us, so nobody in your company handles a
            colleague&apos;s home address at all.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
        <h2 className="font-display text-[length:var(--text-display)] text-navy">
          100 gifts. One simple link.
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['No address spreadsheets', 'Recipients enter their own details securely, straight to us.'],
            ['Give them choice', 'Each person chooses the hamper they actually want.'],
            ['One invoice', 'Pay once rather than processing hundreds of individual transactions.'],
            ['Live tracking', 'See exactly who has selected their gift, in real time.'],
            ['Nationwide delivery', 'We handle every individual delivery across the Republic of Ireland.'],
            ['Fully branded', 'Your logo, your message, your campaign name on the gifting page.'],
          ].map(([title, body]) => (
            <li key={title} className="border border-navy/15 bg-beige p-6">
              <h3 className="font-serif text-xl text-navy">{title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-rule bg-beige py-14">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-8 px-4 lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl text-navy">Volume pricing</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {VOLUME_TIERS.some((tier) => tier.discountPercent > 0)
                ? 'Corporate discounts apply to the campaign invoice automatically. For 250 recipients and up, pricing is quoted.'
                : 'We price every campaign on its own numbers: tell us how many people and the budget per person, and the quote comes back with your campaign. The bigger the list, the better the price.'}
            </p>
          </div>
          {VOLUME_TIERS.some((tier) => tier.discountPercent > 0) ? (
            <ul className="flex flex-wrap gap-3 text-sm">
              {[...VOLUME_TIERS].reverse().map((tier) => (
                <li key={tier.minRecipients} className="border border-navy/20 bg-cream px-4 py-3">
                  <span className="block font-serif text-lg text-navy">{tier.minRecipients}+</span>
                  <span className="text-ink-muted">{tier.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-4 py-16 text-center lg:px-8">
        <h2 className="font-display text-[length:var(--text-display)] text-navy">
          Whether it is 20 hampers or 2,000
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-ink-muted">
          Create your campaign, share one simple link and let your team choose the gift and
          delivery address that suits them. Larger organisations that need purchase orders,
          invoicing, credit terms or branded packaging can build the campaign online and submit
          it for quotation, or start with a conversation.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/corporate-gifting/new" size="large">
            Create your campaign
          </ButtonLink>
          <ButtonLink href="/corporate-gifting/enquiry" variant="secondary" size="large">
            Talk to our corporate gifting team
          </ButtonLink>
        </div>
      </section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Corporate gifting', path: '/corporate-gifting' },
        ])}
      />
    </>
  )
}
