import type { Metadata } from 'next'
import Image from 'next/image'
import { AgeGate } from '@/components/commerce/AgeGate'
import { JsonLd } from '@/components/seo/JsonLd'
import { ButtonLink } from '@/components/ui/Button'
import { InkWaves, StampFrame } from '@/components/ui/Stamp'
import { getListingCopy } from '@/lib/cms'
import { formatMinor } from '@/lib/commerce/money'
import { WINE_PROFILES } from '@/lib/wine-club/profiles'
import { BUDGET_TIERS } from '@/lib/wine-club/recommend'
import { CADENCES, SIZES } from '@/lib/wine-club'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

export const revalidate = 1800

export const metadata: Metadata = {
  // Trimmed to fit. With the " | The Parcel Concierge" template a title has
  // about 37 characters to play with before Google cuts it, and the old one
  // ran to 76 — the brand and half the promise were lost to an ellipsis.
  title: 'Wine subscription built to your taste',
  description:
    'Tell us what you like eating and drinking, and we build you a case from over three hundred wines. Set the size, budget and how often. Pause any time.',
  alternates: { canonical: '/wine-club' },
}

/**
 * The club's front door.
 *
 * The page sells one action: start the taste quiz. The per-band counts and
 * the prices are computed from the catalogue at build time, so the page
 * cannot claim a price level the shop does not carry.
 *
 * The headline number is the Wine Vault's own, "three hundred and more",
 * the same figure the hero and /wine use. It used to render
 * WINE_PROFILES.length, which is the club-eligible subset (in stock, and
 * red, white, rosé or sparkling) and so read lower than the vault the rest
 * of the site describes. Two different true numbers on one site reads as
 * one wrong one.
 */
export default async function WineClubLanding() {
  const copy = await getListingCopy('/wine-club')

  const counts = BUDGET_TIERS.map((tier) => ({
    tier,
    count: WINE_PROFILES.filter(
      (w) => w.priceMinor >= tier.minMinor && (tier.maxMinor === null || w.priceMinor <= tier.maxMinor),
    ).length,
  }))

  return (
    <>
      <AgeGate context="listing" />

      <section className="bg-green text-cream">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-24">
          <div className="animate-rise">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">The Wine Vault Club</p>
            <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">
              A wine subscription built around what you actually like
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cream/90">
              Answer a few questions about food and drink, no wine jargon involved, and we choose a
              case for you from the three hundred and more wines in the shop. You can swap any
              bottle before it ships.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/wine-club/build" size="large">
                Find my wines
              </ButtonLink>
              <span className="text-sm text-cream/75">Takes about two minutes. No account needed.</span>
            </div>

            <ul className="mt-8 grid max-w-xl gap-2 text-sm text-cream/85 sm:grid-cols-2">
              <li>Personalised to your taste</li>
              <li>Swap or skip wines whenever you like</li>
              <li>Pause or cancel from your account</li>
              <li>Every case comes with a card explaining each bottle</li>
            </ul>
          </div>

          <StampFrame className="animate-rise bg-beige">
            <Image
              src="/photography/tpc-may-13.jpg"
              alt="The wine room in the shop in Dunshaughlin, shelved floor to ceiling on both sides"
              width={1200}
              height={1500}
              priority
              sizes="(min-width: 1024px) 42vw, 92vw"
              className="aspect-4/3 w-full object-cover"
            />
          </StampFrame>
        </div>
        <InkWaves className="h-14 w-full text-cream/25" lines={4} />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
        {/* The stamped waves from the brand asset pack. */}
        <Image
          src="/brand/graphic-element-7.svg"
          alt=""
          aria-hidden="true"
          width={420}
          height={215}
          className="h-8 w-auto opacity-60"
        />
        <h2 className="mt-4 font-display text-[length:var(--text-display)] text-navy">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            ['Tell us your taste', 'Seven quick questions about food and drink you already know.'],
            ['Shape the box', 'Red, white, rosé or sparkling. Three or six bottles. Your budget.'],
            ['See your wines', 'We pick the case and tell you why each bottle is there. Swap anything.'],
            ['It arrives', 'Packed by hand in Dunshaughlin, as often as you chose. Change it any time.'],
          ].map(([title, body], index) => (
            <li key={title} className="border border-navy/15 bg-cream p-6">
              <span className="font-display text-3xl text-gold">{index + 1}</span>
              <h3 className="mt-2 font-serif text-xl text-navy">{title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-rule bg-beige py-16">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <h2 className="font-display text-[length:var(--text-display)] text-navy">
            Priced by the bottle, proven by the shelf
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            You pick roughly what to spend per bottle and the case price follows. Every level is
            backed by wines in stock right now, counted from the same list you can browse.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {counts.map(({ tier, count }) => (
              <li key={tier.id} className="border border-navy/20 bg-cream p-6">
                <h3 className="font-serif text-xl text-navy">{tier.label}</h3>
                <p className="mt-1 text-sm text-ink-muted">{tier.detail}</p>
                <p className="mt-4 text-sm text-navy">
                  {count} wines in stock at this level. A six bottle case is{' '}
                  {formatMinor(tier.chargeMinor * 6)}.
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-muted">
            Delivered {CADENCES.map((c) => c.label.toLowerCase()).join(', ')}. Cases of{' '}
            {SIZES.map((s) => s.bottles).join(', ')} bottles.
          </p>
        </div>
      </section>

      {copy?.seoBlock ? (
        <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
          <div className="prose-tpc text-ink-muted" dangerouslySetInnerHTML={{ __html: copy.seoBlock }} />
        </section>
      ) : null}

      <section className="bg-navy py-16 text-center text-cream">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-[length:var(--text-display)]">Two minutes, no jargon</h2>
          <p className="mt-3 text-cream/85">
            You must be over 18, and somebody over 18 has to take the delivery in.
          </p>
          <ButtonLink href="/wine-club/build" size="large" className="mt-6">
            Find my wines
          </ButtonLink>
        </div>
      </section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'The Wine Vault Club', path: '/wine-club' },
        ])}
      />
    </>
  )
}
