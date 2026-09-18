import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ProductGrid } from '@/components/product/ProductCard'
import { TrustpilotStars } from '@/components/trust/TrustpilotStars'
import { ButtonLink } from '@/components/ui/Button'
import { FairyLights, HollySprig } from '@/components/ui/Festive'
import { InkWaves, PostmarkRoundel, StampFrame } from '@/components/ui/Stamp'
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup'
import { VisitTheShop } from '@/components/VisitTheShop'
import { getHomepage, getMakers } from '@/lib/cms'
import type { HomepageSlot } from '@/lib/cms/types'
import { getProduct, queryProducts } from '@/lib/commerce'
import { getCollectionByPath, HAMPERS_COLLECTION } from '@/lib/commerce/collections'
import type { ProductCard } from '@/lib/commerce/types'
import { getTrustSummary } from '@/lib/trustpilot'

export const revalidate = 1800

/**
 * The homepage is reachable as `/`, as `/?utm_source=...` from every
 * campaign, and as the target of a pile of legacy redirects. Without a
 * self-canonical it was the only page on the site not telling Google which
 * of those is the real one. Title and description are inherited from the
 * root layout, which is where the site-wide defaults belong.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

/**
 * Home.
 *
 * The hero is a thesis and the thesis is hampers. Module order comes from
 * the CMS so the client can weight the page seasonally without a deploy,
 * which is the whole reason the ordering lives there rather than here.
 */
export default async function HomePage() {
  const [homepage, trust] = await Promise.all([getHomepage(), getTrustSummary()])

  // One switch for the whole seasonal treatment: the lights on the hero
  // and the holly on the Christmas band are on only while the Christmas
  // band is in the slot list, so pulling that band in January takes the
  // lot with it and nobody has to remember a second place. The snowfall
  // that used to fall over the page came off at the client's request in
  // September 2026: it sat over the hero photograph.
  const festive = homepage.slots.some((slot) => slot.kind === 'christmas')

  return (
    <>
      {homepage.slots.map((slot, index) => (
        <Slot
          key={`${slot.kind}-${index}`}
          slot={slot}
          trust={trust}
          first={index === 0}
          festive={festive}
        />
      ))}
    </>
  )
}

async function Slot({
  slot,
  trust,
  first,
  festive,
}: {
  slot: HomepageSlot
  trust: { rating: number; reviewCount: number }
  first: boolean
  festive: boolean
}) {
  switch (slot.kind) {
    case 'hero':
      return <Hero slot={slot} trust={trust} priority={first} festive={festive} />
    case 'christmas':
      return <ChristmasBand slot={slot} />
    case 'budget-bands':
      return <BudgetBands />
    case 'featured-hampers':
      return <FeaturedHampers slot={slot} />
    case 'hamper-builder':
      return <BuilderBand slot={slot} />
    case 'occasions':
      return <OccasionBand slot={slot} />
    case 'wine-vault':
      return <WineVault slot={slot} />
    case 'trustpilot':
      return <TrustBand trust={trust} />
    case 'corporate':
      return <CorporateBand slot={slot} />
    case 'makers':
      return <MakersBand slot={slot} />
    case 'visit-shop':
      return <VisitTheShop title={slot.title} body={slot.body} />
    case 'newsletter':
      return (
        <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
          <div className="flex items-center gap-8 border border-rule bg-beige px-6 py-12 lg:px-12">
            {/* The gift boy from the brand asset pack. */}
            <Image
              src="/brand/graphic-element-2.svg"
              alt=""
              aria-hidden="true"
              width={247}
              height={219}
              className="hidden h-36 w-auto shrink-0 md:block"
            />
            <div className="min-w-0 flex-1">
              <NewsletterSignup />
            </div>
          </div>
        </section>
      )
  }
}

// ---------------------------------------------------------------------------

async function Hero({
  slot,
  trust,
  priority,
  festive,
}: {
  slot: Extract<HomepageSlot, { kind: 'hero' }>
  trust: { rating: number; reviewCount: number }
  priority: boolean
  festive: boolean
}) {
  const copy = <HeroCopy slot={slot} trust={trust} />

  // A supplied photograph is the whole hero: full bleed, with the copy and
  // the CTA sitting on top of it. The client's table shot puts the hamper
  // and the bottles on the right and leaves the left third as empty linen,
  // which is exactly where the copy goes.
  if (slot.image) {
    return (
      <section className="relative isolate overflow-hidden bg-green">
        <Image
          src={slot.image.src}
          alt={slot.image.alt}
          fill
          priority={priority}
          sizes="100vw"
          // The focal point is the basket, two thirds of the way across.
          // On a phone the frame is tall and narrow, so that keeps the
          // basket in shot rather than the right-hand bottles alone.
          className="object-cover object-[67%_center] lg:object-right"
        />
        {/* Legibility wash. Brand green under the copy on the left, and
            gone by the middle so the photograph is the hero, not the wash:
            the products start just under halfway across at desktop widths
            and the client wants them unobscured. The subhead keeps to the
            left third, where the wash is still strong enough to carry
            cream text over the pale linen. On a phone the copy spans the
            width, so a lighter even wash does too. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 bg-green/60 lg:bg-transparent lg:bg-linear-to-r lg:from-green/90 lg:via-green/55 lg:via-30% lg:to-green/0 lg:to-55%"
        />

        {festive ? (
          <FairyLights className="absolute inset-x-0 top-0 z-0 text-cream" />
        ) : null}
        <div
          className={`relative mx-auto flex max-w-[1400px] items-center px-4 py-16 lg:min-h-[680px] lg:px-8 lg:py-24 ${
            festive ? 'pt-20' : ''
          }`}
        >
          <div className="max-w-xl">{copy}</div>
        </div>

        <InkWaves className="relative h-16 w-full text-cream/25" lines={4} />
      </section>
    )
  }

  // No photograph: the copy beside a product shot in a stamp frame.
  const product = slot.imageHandle ? await getProduct(slot.imageHandle) : null
  const image = product?.images[0] ?? null

  return (
    <section className="relative overflow-hidden bg-green">
      {/* The brand monogram as an oversized watermark, from the asset pack. */}
      <Image
        src="/brand/graphic-element-5.svg"
        alt=""
        aria-hidden="true"
        width={767}
        height={1054}
        className="pointer-events-none absolute -right-24 -top-24 hidden w-[560px] opacity-[0.07] lg:block"
      />

      {/* A string of lights along the top edge. The extra top padding on
          small screens keeps the eyebrow clear of the lowest bulbs. */}
      {festive ? (
        <FairyLights className="absolute inset-x-0 top-0 z-0 text-cream" />
      ) : null}
      <div
        className={`relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20 ${
          festive ? 'pt-20' : ''
        }`}
      >
        {copy}

        <div className="relative animate-rise" style={{ animationDelay: '120ms' }}>
          <StampFrame className="bg-beige">
            {image ? (
              <Image
                src={image.url}
                alt={image.alt}
                width={image.width}
                height={image.height}
                priority={priority}
                sizes="(min-width: 1024px) 46vw, 92vw"
                className="aspect-4/3 w-full object-cover"
              />
            ) : (
              <Image
                src="/photography/tpc-01-full.jpg"
                alt="A Parcel Concierge hamper packed by hand in Co. Meath"
                width={1200}
                height={900}
                priority={priority}
                sizes="(min-width: 1024px) 46vw, 92vw"
                className="aspect-4/3 w-full object-cover"
              />
            )}
          </StampFrame>

          <PostmarkRoundel className="absolute -bottom-9 -left-9 hidden h-48 w-48 text-gold lg:block" />
        </div>
      </div>

      <InkWaves className="h-16 w-full text-cream/25" lines={4} />
    </section>
  )
}

/** The hero's words: eyebrow, headline, subhead, CTAs and the Trustpilot line. */
function HeroCopy({
  slot,
  trust,
}: {
  slot: Extract<HomepageSlot, { kind: 'hero' }>
  trust: { rating: number; reviewCount: number }
}) {
  return (
    <div className="animate-rise text-cream">
      <p className="mb-4 text-xs uppercase tracking-[0.24em] text-gold">
        Dunshaughlin, Co. Meath
      </p>
      <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">
        {slot.headline}
      </h1>
      <p className="mt-5 max-w-md text-lg text-cream/90">{slot.subhead}</p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <ButtonLink href={slot.ctaHref} size="large">
          {slot.ctaLabel}
        </ButtonLink>
        <Link
          href="/build-your-own-hamper"
          className="text-cream underline underline-offset-4 hover:text-gold"
        >
          Or build your own
        </Link>
      </div>

      <div className="mt-8">
        <TrustpilotStars rating={trust.rating} reviewCount={trust.reviewCount} variant="light" />
      </div>
    </div>
  )
}

/**
 * The Christmas band. Premium and quiet: deep red ground, gold type, one
 * photograph in a stamp frame, and a sprig of holly drawn in gold line
 * work in the corner. No clip art. The snow falling over it belongs to
 * the page, not the band.
 *
 * The frame takes either a photograph from /public or a product shot that
 * links to its product. It is a photograph today because the seasonal
 * hamper range is still being packed, so there is no one box to point at.
 */
async function ChristmasBand({ slot }: { slot: Extract<HomepageSlot, { kind: 'christmas' }> }) {
  const product = slot.image || !slot.imageHandle ? null : await getProduct(slot.imageHandle)
  const image = product?.images[0] ?? null

  return (
    <section className="relative overflow-hidden bg-wine text-cream">
      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-14 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          {/* In the flow rather than pinned to a corner, so it can never
              land under the photograph or on top of the title at any
              width. The negative margin lines the left leaf up with the
              text edge. */}
          <HollySprig className="-ml-2 mb-3 h-16 w-auto text-gold lg:h-20" />
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">Christmas 2026</p>
          <h2 className="font-display text-[length:var(--text-display)]">{slot.title}</h2>
          <p className="mt-4 max-w-xl text-lg text-cream/90">{slot.body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {/* Not ButtonLink: its red fill and wine hover both disappear
                into this band's wine ground. Cream on wine, gold on hover. */}
            <Link
              href={slot.ctaHref}
              className="inline-flex items-center justify-center rounded-[2px] bg-cream px-8 py-4 text-lg font-medium tracking-wide text-wine transition-colors duration-200 hover:bg-gold hover:text-navy"
            >
              {slot.ctaLabel}
            </Link>
            <Link
              href="/corporate-gifting"
              className="text-cream underline underline-offset-4 hover:text-gold"
            >
              Corporate Christmas gifting
            </Link>
          </div>
        </div>

        {slot.image ? (
          <StampFrame className="bg-beige">
            <Image
              src={slot.image.src}
              alt={slot.image.alt}
              width={1200}
              height={800}
              sizes="(min-width: 1024px) 38vw, 92vw"
              className="aspect-4/3 w-full object-cover"
            />
          </StampFrame>
        ) : image && product ? (
          <Link href={`/hampers/${product.handle}`} className="group relative block">
            <StampFrame className="bg-beige">
              <Image
                src={image.url}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1024px) 38vw, 92vw"
                className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </StampFrame>
            <p className="mt-3 font-serif text-lg text-cream group-hover:underline">
              {product.title}
            </p>
          </Link>
        ) : null}
      </div>

      <InkWaves className="h-12 w-full text-gold/30" lines={3} />
    </section>
  )
}

const BUDGET_BAND_PATHS = [
  '/gifts-by-budget/under-50',
  '/gifts-by-budget/50-100',
  '/gifts-by-budget/100-150',
  '/gifts-by-budget/150-plus',
]

function BudgetBands() {
  const bands = BUDGET_BAND_PATHS.map((path) => getCollectionByPath(path)).filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
      <SectionHeading
        eyebrow="The fastest way in"
        title="Shop by budget"
        body="Most people start with a figure in mind. Pick yours and see everything we can do for it, hampers and wine together."
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bands.map((band) => (
          <li key={band.path}>
            <Link
              href={band.path}
              className="group flex h-full flex-col justify-between border border-navy/20 bg-beige p-6 transition-colors hover:bg-navy hover:text-cream"
            >
              <span className="font-display text-4xl text-navy group-hover:text-cream">
                {band.title.replace('Gifts ', '')}
              </span>
              <span className="mt-6 text-sm text-ink-muted group-hover:text-cream/80">
                Shop this band
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

async function FeaturedHampers({
  slot,
}: {
  slot: Extract<HomepageSlot, { kind: 'featured-hampers' }>
}) {
  // The seasonal hamper collection, read from the one constant the hub and
  // /occasions/christmas also read, so the homepage can never end up showing
  // a different range from the rest of the site. slot.title drives the
  // heading; the slot no longer carries handles, because this band has not
  // been a hand-picked list since the range went Christmas-only.
  const { items } = await queryProducts({ collection: HAMPERS_COLLECTION, first: 8 })
  if (items.length < 3) return null

  return (
    <section className="bg-beige py-16">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <SectionHeading
          eyebrow="Packed by hand in Meath"
          title={slot.title}
          body="Every one of these is built from producers we buy from directly, and packed in our own shop."
          action={{ href: '/hampers', label: 'See all hampers' }}
        />
        <div className="mt-10">
          <ProductGrid products={items} />
        </div>
      </div>
    </section>
  )
}

function BuilderBand({ slot }: { slot: Extract<HomepageSlot, { kind: 'hamper-builder' }> }) {
  return (
    <section className="bg-navy py-16 text-cream">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 lg:grid-cols-[1.1fr_1fr] lg:px-8">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">Made to order</p>
          <h2 className="font-display text-[length:var(--text-display)]">{slot.title}</h2>
          <p className="mt-4 max-w-lg text-lg text-cream/85">{slot.body}</p>
          <ButtonLink href="/build-your-own-hamper" size="large" className="mt-8">
            Start building
          </ButtonLink>
        </div>

        {/* A baby hamper here, per the client: the builder's job is to
            show that a box gets built around a person, and the baby boxes
            say that faster than a generic gift box does. */}
        <StampFrame className="bg-beige">
          <Image
            src="/photography/hamper-hello-baby-girl.jpg"
            alt="A new baby hamper with a teddy bear, a pink blanket, sparkling rosé and chocolates in a green gift box"
            width={1200}
            height={1500}
            sizes="(min-width: 1024px) 40vw, 92vw"
            className="aspect-4/3 w-full object-cover"
          />
        </StampFrame>
      </div>
    </section>
  )
}

function OccasionBand({ slot }: { slot: Extract<HomepageSlot, { kind: 'occasions' }> }) {
  const collections = slot.paths
    .map((path) => getCollectionByPath(path))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
      <SectionHeading
        eyebrow="If you know what it is for"
        title={slot.title}
        action={{ href: '/occasions', label: 'All occasions' }}
      />
      <ul className="mt-8 flex flex-wrap gap-3">
        {collections.map((collection) => (
          <li key={collection.path}>
            <Link
              href={collection.path}
              className="inline-block border border-navy/25 px-5 py-3 font-serif text-lg text-navy transition-colors hover:bg-navy hover:text-cream"
            >
              {collection.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

async function WineVault({ slot }: { slot: Extract<HomepageSlot, { kind: 'wine-vault' }> }) {
  const { items } = await queryProducts({ collection: 'fine-wines-1', first: 4 })

  return (
    <section className="bg-green py-16 text-cream">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">The second pillar</p>
            <h2 className="font-display text-[length:var(--text-display)]">{slot.title}</h2>
            <p className="mt-4 text-lg text-cream/85">{slot.body}</p>
          </div>
          <ButtonLink href="/wine" variant="primary">
            Browse the Wine Vault
          </ButtonLink>
        </div>

        {items.length ? (
          <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {items.map((product) => (
              <li key={product.id}>
                <WineTile product={product} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

function WineTile({ product }: { product: ProductCard }) {
  return (
    <Link href={`/wine/${product.handle}`} className="group block">
      <StampFrame className="bg-beige" size="small">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            width={product.image.width}
            height={product.image.height}
            sizes="(min-width: 768px) 22vw, 45vw"
            className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
      </StampFrame>
      <h3 className="mt-3 font-serif text-base leading-snug text-cream group-hover:underline">
        {product.title}
      </h3>
    </Link>
  )
}

function TrustBand({ trust }: { trust: { rating: number; reviewCount: number } }) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
      <div className="flex flex-col items-center gap-4 border-y border-rule py-12 text-center">
        <PostmarkRoundel className="h-20 w-20 text-green" />
        <h2 className="font-display text-[length:var(--text-display)] text-navy">
          {trust.reviewCount} reviews, {trust.rating.toFixed(1)} out of 5
        </h2>
        <TrustpilotStars
          rating={trust.rating}
          reviewCount={trust.reviewCount}
          variant="dark"
          showCount={false}
        />
        <p className="max-w-lg text-ink-muted">
          Rated on Trustpilot by people who have actually received one of our boxes.
        </p>
      </div>
    </section>
  )
}

function CorporateBand({ slot }: { slot: Extract<HomepageSlot, { kind: 'corporate' }> }) {
  return (
    <section className="bg-beige py-16">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 lg:grid-cols-2 lg:px-8">
        <StampFrame className="order-2 bg-cream lg:order-1">
          {/* The shop, not a hamper. A product shot here reads as "this is
              the box your team gets", which is the opposite of the
              proposition: the recipient picks their own. Not the Christmas
              frame either, which the seasonal band above now uses. */}
          <Image
            src="/photography/tpc-may-1-2.jpg"
            alt="The Parcel Concierge shopfront in Dunshaughlin, with wine barrel tables outside"
            width={1600}
            height={1067}
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="aspect-3/2 w-full object-cover"
          />
        </StampFrame>

        <div className="order-1 lg:order-2">
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-green">For business</p>
          <h2 className="font-display text-[length:var(--text-display)] text-navy">{slot.title}</h2>
          <p className="mt-4 max-w-lg text-lg text-ink-muted">{slot.body}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/corporate-gifting/new" variant="secondary">
              Create a corporate gift campaign
            </ButtonLink>
            <ButtonLink href="/corporate-gifting" variant="ghost">
              How it works
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}

async function MakersBand({ slot }: { slot: Extract<HomepageSlot, { kind: 'makers' }> }) {
  const makers = await getMakers()
  const shown = makers.filter((m) => slot.makerSlugs.includes(m.slug))

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
      <SectionHeading
        eyebrow="Guaranteed Irish"
        title={slot.title}
        body={slot.body}
        action={{ href: '/about/our-makers', label: 'Meet the makers' }}
      />
      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {shown.map((maker) => (
          <li key={maker.slug} className="border-l-2 border-gold pl-5">
            <h3 className="font-serif text-xl font-semibold text-navy">{maker.name}</h3>
            {maker.county ? (
              <p className="text-sm uppercase tracking-[0.16em] text-ink-muted">
                Co. {maker.county}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string
  title: string
  body?: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-green">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-[length:var(--text-display)] text-navy">{title}</h2>
        {body ? <p className="mt-3 text-lg text-ink-muted">{body}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className="text-navy underline underline-offset-4 hover:text-green">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
