import type { Metadata } from 'next'
import Link from 'next/link'
import { AgeGate } from '@/components/commerce/AgeGate'
import { WineClubBuilder } from '@/components/wine-club/WineClubBuilder'
import { JsonLd } from '@/components/seo/JsonLd'
import { Accordion } from '@/components/ui/Accordion'
import { ProductGrid } from '@/components/product/ProductCard'
import { InkWaves, PostmarkRoundel } from '@/components/ui/Stamp'
import { queryProducts } from '@/lib/commerce'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/structured-data'
import { BANDS } from '@/lib/wine-club'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'The Wine Vault Club',
  description:
    'A case of wine chosen by us, as often as you want it. Pick the size, the budget per bottle and the style. Pause or cancel any time.',
  alternates: { canonical: '/wine/subscription' },
}

/**
 * The wine subscription.
 *
 * A gifting business sells hard for six weeks and quietly for the rest of
 * the year. A club is the most direct fix for that, and this one is built
 * on the list the shop already has rather than on a range that would have
 * to be bought in.
 *
 * The recurrence is Shopify's, through selling plans. We choose a plan and
 * hand it to the cart. See src/lib/wine-club.ts and docs/wine-club.md.
 */
export default async function WineClubPage() {
  // Counts come from the live catalogue, so the page cannot claim a range
  // the shop does not have.
  const bandCounts = await Promise.all(
    BANDS.map(async (band) => {
      const { items } = await queryProducts({
        kinds: ['wine'],
        minPriceMinor: band.fromMinor,
        ...(band.toMinor === null ? {} : { maxPriceMinor: band.toMinor }),
        first: 250,
      })
      return { bandId: band.id, count: items.length }
    }),
  )

  const { items: recent } = await queryProducts({
    kinds: ['wine'],
    wineFlags: ['fineWine'],
    sort: 'price-asc',
    first: 4,
  })

  const faqs = [
    {
      question: 'Who chooses the wine?',
      answer:
        'We do. You set the size, the budget per bottle and whether you want red, white or a mix, and we pick from the list. Every case comes with a card saying what each bottle is and what to drink it with.',
    },
    {
      question: 'Can I pause or cancel?',
      answer:
        'Any time, from your account, with no notice period and nothing to ring us about. If you pause before a case is packed you are not charged for it.',
    },
    {
      question: 'What if I do not like something?',
      answer:
        'Tell us and we will not send it again, and we will replace the bottle in your next case. We would rather know.',
    },
    {
      question: 'Is it a gift subscription?',
      answer:
        'It can be. Set the delivery address to theirs and the billing address to yours, choose how many cases you want to pay for up front, and we will write the card for the first one.',
    },
    {
      question: 'How is it delivered?',
      answer:
        'The same way everything else is: free by hand in our local area, €7.95 anywhere else in Ireland. Somebody over 18 has to take it in.',
    },
  ]

  return (
    <>
      <AgeGate context="listing" />

      <section className="bg-navy text-cream">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_auto] lg:px-8">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">The Wine Vault Club</p>
            <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">
              A case of wine, as often as you want it
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-cream/85">
              You set the size, the budget per bottle and the style. We choose the wine from the
              same list we sell bottle by bottle, write a card explaining each one, and send it.
              Pause or cancel whenever you like.
            </p>
          </div>
          <PostmarkRoundel className="hidden h-40 w-40 text-gold lg:block" />
        </div>
        <InkWaves className="h-14 w-full text-cream/25" lines={4} />
      </section>

      <WineClubBuilder bandCounts={bandCounts} />

      <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
        <h2 className="font-display text-[length:var(--text-display)] text-navy">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            { title: 'Choose the shape', body: 'How many bottles, roughly what per bottle, red or white or a mix, and how often.' },
            { title: 'We pick the wine', body: 'From the same list we sell bottle by bottle. Never the same thing twice in a row.' },
            { title: 'It arrives', body: 'Packed by hand with a card explaining every bottle and what to eat with it.' },
            { title: 'You change your mind', body: 'Pause, skip a case, change the size or stop entirely, from your account.' },
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
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="font-display text-[length:var(--text-display)] text-navy">
            The things people ask
          </h2>
          <div className="mt-6">
            {faqs.map((faq) => (
              <Accordion key={faq.question} title={faq.question}>
                <p>{faq.answer}</p>
              </Accordion>
            ))}
          </div>
        </div>
      </section>

      {recent.length ? (
        <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
          <h2 className="font-display text-[length:var(--text-display)] text-navy">
            The kind of thing that turns up
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Bottles from the fine wine list. A case is never only these, but this is the standard.
          </p>
          <div className="mt-8">
            <ProductGrid products={recent} />
          </div>
          <Link href="/wine" className="mt-6 inline-block text-navy underline underline-offset-4">
            Browse the whole list
          </Link>
        </section>
      ) : null}

      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Wine and spirits', path: '/wine' },
          { name: 'The Wine Vault Club', path: '/wine/subscription' },
        ])}
      />
    </>
  )
}
