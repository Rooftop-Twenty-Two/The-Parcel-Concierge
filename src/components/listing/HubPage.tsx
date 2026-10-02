import Image from 'next/image'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { ProductGrid } from '@/components/product/ProductCard'
import { ButtonLink } from '@/components/ui/Button'
import { InkWaves, StampFrame } from '@/components/ui/Stamp'
import { getListingCopy } from '@/lib/cms'
import { queryListing } from '@/lib/commerce'
import { populatedListings } from '@/lib/commerce/populated'
import { formatMinor } from '@/lib/commerce/money'
import { DELIVERY, handDeliveryZone } from '@/lib/site-config'
import { collectionsInHub, MIN_PRODUCTS_PER_LISTING, type CollectionHub } from '@/lib/commerce/collections'
import type { ProductQuery } from '@/lib/commerce/types'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

/**
 * A hub page.
 *
 * A hub sells the category before it sells a product, which is why the
 * sub-collection cards come before the grid. Everything below the fold is
 * the same machinery as a listing page.
 */
export async function HubPage({
  hub,
  path,
  h1,
  heroImage,
  query,
  /** Sub-collections to feature as cards, by path. Defaults to all in hub. */
  featuredPaths,
  /** Optional promoted band rendered under the collection cards. */
  promo,
}: {
  hub: CollectionHub
  path: string
  h1: string
  heroImage: { src: string; alt: string } | null
  query: ProductQuery
  alcohol: boolean
  featuredPaths?: string[]
  promo?: { eyebrow: string; title: string; body: string; href: string; cta: string }
}) {
  const all = collectionsInHub(hub)
  const candidates = featuredPaths
    ? featuredPaths.flatMap((p) => all.filter((c) => c.path === p))
    : all
  // A card to a listing under the four-product floor would redirect straight
  // back here, so only bands that will open are offered.
  const [copy, result, featured] = await Promise.all([
    getListingCopy(path),
    queryListing(path, query),
    populatedListings(candidates),
  ])

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: h1, path },
  ]

  return (
    <>
      <section className="bg-green text-cream">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-20">
          <div className="animate-rise">
            <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">{h1}</h1>
            {copy ? <p className="mt-5 max-w-xl text-lg text-cream/90">{copy.intro}</p> : null}
            <p className="mt-6 text-sm text-cream/75">
              Free local delivery in {handDeliveryZone() ?? 'our local area'}.{' '}
              {formatMinor(DELIVERY.national.priceMinor)} elsewhere in Ireland with{' '}
              {DELIVERY.carrier}
              {DELIVERY.freeDeliveryThresholdMinor === null
                ? ''
                : `, free over ${formatMinor(DELIVERY.freeDeliveryThresholdMinor)}`}
              .
            </p>
          </div>

          {heroImage ? (
            <StampFrame className="animate-rise bg-beige" >
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                width={1200}
                height={1500}
                priority
                sizes="(min-width: 1024px) 46vw, 92vw"
                className="aspect-4/3 w-full object-cover"
              />
            </StampFrame>
          ) : null}
        </div>
        <InkWaves className="h-14 w-full text-cream/25" lines={4} />
      </section>

      {featured.length ? (
        <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
          <h2 className="font-display text-[length:var(--text-display)] text-navy">
            Where would you like to start?
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((collection) => (
              <li key={collection.path}>
                <Link
                  href={collection.path}
                  className="flex h-full items-center border border-navy/20 bg-beige px-5 py-4 font-serif text-lg text-navy transition-colors hover:bg-navy hover:text-cream"
                >
                  {collection.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {promo ? (
        <section className="bg-navy py-12 text-cream">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-6 px-4 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-gold">{promo.eyebrow}</p>
              <h2 className="font-display text-[length:var(--text-display)]">{promo.title}</h2>
              <p className="mt-3 text-lg text-cream/85">{promo.body}</p>
            </div>
            <ButtonLink href={promo.href} size="large">
              {promo.cta}
            </ButtonLink>
          </div>
        </section>
      ) : null}

      {result.items.length >= MIN_PRODUCTS_PER_LISTING ? (
        <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
          {/*
            A hub shows a sample, not the whole hub. It used to be headed
            "Everything here", which was true of thirty hampers and became
            a lie the day three hundred and forty one wines arrived. The
            full list lives behind the cards above, where it can be paged
            and filtered, and where the reader has told us what they want.

            Deliberately not paginated. Paging needs the URL, reading the
            URL makes the page render on demand, and a hub is the second
            most visited page in its section. It stays static.
          */}
          <h2 className="font-display text-[length:var(--text-display)] text-navy">
            A few to start you off
          </h2>
          <div className="mt-8">
            <ProductGrid products={result.items} priorityCount={4} />
          </div>
        </section>
      ) : null}

      {copy?.seoBlock ? (
        <section className="border-t border-rule bg-beige">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <div
              className="prose-tpc text-ink-muted"
              dangerouslySetInnerHTML={{ __html: copy.seoBlock }}
            />
          </div>
        </section>
      ) : null}

      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}
