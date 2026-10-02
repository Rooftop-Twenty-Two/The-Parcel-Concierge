import Link from 'next/link'
import { DeliveryPromise } from '@/components/commerce/DeliveryPromise'
import { AddToCart } from '@/components/product/AddToCart'
import { CardUpsell } from '@/components/product/CardUpsell'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductCarousel } from '@/components/product/ProductCarousel'
import {
  VariantPrice,
  VariantSelectionProvider,
  VariantSelector,
} from '@/components/product/VariantSelector'
import { JsonLd } from '@/components/seo/JsonLd'
import { TrustpilotStars } from '@/components/trust/TrustpilotStars'
import { Accordion } from '@/components/ui/Accordion'
import { TAG_LABELS } from '@/lib/commerce/taxonomy'
import type { Product, ProductCard } from '@/lib/commerce/types'
import { withChristmasGallery } from '@/lib/commerce/christmas-images'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/structured-data'
import { demoteHeadings } from '@/lib/seo/demote-headings'

/**
 * Hamper product page.
 *
 * Required blocks, in order: gallery, price, stars, delivery promise,
 * personalisation, "What's inside", allergens, add to cart with a live stock
 * check, then the cross-sell.
 *
 * "What's inside" renders from the contents metafield as a list. It is never
 * buried in the prose, because it is the thing the shopper is actually
 * trying to read.
 */
export function HamperProductPage({
  product,
  trust,
  similar,
  cards = [],
}: {
  product: Product
  trust: { rating: number; reviewCount: number }
  /** Greeting cards offered once the hamper is in the cart. */
  cards?: ProductCard[]
  /** More from the same range, for the carousel at the foot of the page. */
  similar: ProductCard[]
}) {
  const hamper = product.hamper

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Hampers', path: '/hampers' },
    { name: product.title, path: `/hampers/${product.handle}` },
  ]

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap gap-2 text-sm text-ink-muted">
            {crumbs.map((crumb, index) => (
              <li key={crumb.path} className="flex gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {index === crumbs.length - 1 ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <Link href={crumb.path} className="hover:underline">
                    {crumb.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <VariantSelectionProvider product={product}>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            {/* The Christmas photograph leads while the treatment is on, so
                a card clicked on /occasions/christmas opens on the same
                image. See commerce/christmas-images.ts. */}
            <ProductGallery
              images={withChristmasGallery(product.handle, product.images)}
              title={product.title}
            />

            <div>
            <div className="flex flex-wrap gap-2">
              {product.tags
                .filter((t) => t.startsWith('badge:'))
                .map((tag) => (
                  <span
                    key={tag}
                    className="bg-navy px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-cream"
                  >
                    {TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
            </div>

            <h1 className="mt-3 font-display text-[length:var(--text-display)] text-navy">
              {product.title}
            </h1>

            <VariantPrice />

            <div className="mt-3">
              <TrustpilotStars rating={trust.rating} reviewCount={trust.reviewCount} />
            </div>

            <div className="mt-6">
              <DeliveryPromise leadTime={hamper?.leadTime ?? null} />
            </div>

            <div
              className="prose-tpc mt-6 text-ink-muted"
              dangerouslySetInnerHTML={{ __html: demoteHeadings(product.descriptionHtml) }}
            />

            <VariantSelector />
            <AddToCart
              product={product}
              label="Add to cart"
              confirmation="Added to cart"
              afterAdded={<CardUpsell cards={cards} />}
            />

            {hamper ? <HamperDetails product={product} /> : null}
            </div>
          </div>
        </VariantSelectionProvider>
      </div>

      {/* The "Finish the gift" add-on band was here. Taken off at the
          client's request, September 2026: it read the four cheapest
          add-ons in the shop, and the shop's cheapest add-ons are stock
          lines with no photograph and no price — "Chaos SS Crystal, €0"
          sat under every hamper on the site. The add-ons still sell
          through Build a Gift and through the same band in the cart,
          which is priced and photographed because the customer chose
          what is in the box by then. */}

      {similar.length ? (
        <section className="border-t border-rule">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <h2 className="font-display text-[length:var(--text-display)] text-navy">
              More hampers
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">Every one of them packed by hand in Dunshaughlin.</p>
            <div className="mt-8">
              <ProductCarousel products={similar} label="More hampers" />
            </div>
          </div>
        </section>
      ) : null}

      <JsonLd data={productJsonLd(product, trust)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}

function HamperDetails({ product }: { product: Product }) {
  const hamper = product.hamper
  if (!hamper) return null

  return (
    <div className="mt-10 border-t border-rule">
      {hamper.contents.length ? (
        <section className="border-b border-rule py-6">
          <h2 className="font-display text-2xl text-navy">What is inside</h2>
          <ul className="mt-4 space-y-2">
            {hamper.contents.map((line) => (
              <li key={`${line.name}-${line.size ?? ''}`} className="flex flex-wrap gap-x-2 text-ink-muted">
                <span className="text-navy">{line.name}</span>
                {line.producer ? <span>by {line.producer}</span> : null}
                {line.size ? <span className="text-ink-muted/80">{line.size}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hamper.allergens ? (
        <Accordion title="Allergens" defaultOpen={false}>
          <p>{hamper.allergens}</p>
        </Accordion>
      ) : null}

      {hamper.packaging ? (
        <Accordion title="How it arrives">
          <p>{hamper.packaging}</p>
        </Accordion>
      ) : null}

      {hamper.dimensionsWeight ? (
        <Accordion title="Size and weight">
          <p>{hamper.dimensionsWeight}</p>
        </Accordion>
      ) : null}

      {hamper.producers.length ? (
        <Accordion title="Who made what is in it">
          <ul className="space-y-1">
            {hamper.producers.map((producer) => (
              <li key={producer}>{producer}</li>
            ))}
          </ul>
          <p className="mt-3">
            <Link href="/about/our-makers" className="underline underline-offset-4">
              Read about our makers
            </Link>
          </p>
        </Accordion>
      ) : null}
    </div>
  )
}
