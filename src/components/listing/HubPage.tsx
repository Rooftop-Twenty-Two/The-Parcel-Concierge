import Image from 'next/image'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { ProductGrid } from '@/components/product/ProductCard'
import { AgeGate } from '@/components/commerce/AgeGate'
import { InkWaves, StampFrame } from '@/components/ui/Stamp'
import { getListingCopy } from '@/lib/cms'
import { queryListing } from '@/lib/commerce'
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
  alcohol,
  /** Sub-collections to feature as cards, by path. Defaults to all in hub. */
  featuredPaths,
}: {
  hub: CollectionHub
  path: string
  h1: string
  heroImage: { src: string; alt: string } | null
  query: ProductQuery
  alcohol: boolean
  featuredPaths?: string[]
}) {
  const [copy, result] = await Promise.all([getListingCopy(path), queryListing(path, query)])

  const all = collectionsInHub(hub)
  const featured = featuredPaths
    ? featuredPaths.flatMap((p) => all.filter((c) => c.path === p))
    : all

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: h1, path },
  ]

  return (
    <>
      {alcohol ? <AgeGate context="listing" /> : null}

      <section className="bg-green text-cream">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-20">
          <div className="animate-rise">
            <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">{h1}</h1>
            {copy ? <p className="mt-5 max-w-xl text-lg text-cream/90">{copy.intro}</p> : null}
            <p className="mt-6 text-sm text-cream/75">
              Free hand delivery in our local area. €7.95 anywhere else in Ireland.
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

      {result.items.length >= MIN_PRODUCTS_PER_LISTING ? (
        <section className="mx-auto max-w-[1400px] px-4 pb-14 lg:px-8">
          <h2 className="font-display text-[length:var(--text-display)] text-navy">Everything here</h2>
          <div className="mt-8">
            <ProductGrid products={result.items} priorityCount={4} />
          </div>
        </section>
      ) : null}

      {copy ? (
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
