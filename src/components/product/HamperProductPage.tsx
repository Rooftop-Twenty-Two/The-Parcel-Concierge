import Link from 'next/link'
import { AgeGate } from '@/components/commerce/AgeGate'
import { DeliveryPromise } from '@/components/commerce/DeliveryPromise'
import { AddToCart } from '@/components/product/AddToCart'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductGrid } from '@/components/product/ProductCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { TrustpilotStars } from '@/components/trust/TrustpilotStars'
import { Accordion } from '@/components/ui/Accordion'
import { formatMoney } from '@/lib/commerce/money'
import { TAG_LABELS } from '@/lib/commerce/taxonomy'
import type { Product, ProductCard } from '@/lib/commerce/types'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/structured-data'

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
  crossSell,
}: {
  product: Product
  trust: { rating: number; reviewCount: number }
  crossSell: ProductCard[]
}) {
  const variant = product.variants[0]
  const hamper = product.hamper
  const containsAlcohol = hamper?.containsAlcohol ?? false

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Hampers', path: '/hampers' },
    { name: product.title, path: `/hampers/${product.handle}` },
  ]

  return (
    <>
      {containsAlcohol ? <AgeGate context="product" /> : null}

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

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <ProductGallery images={product.images} title={product.title} />

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

            {variant ? (
              <p className="mt-2 font-serif text-2xl text-navy">{formatMoney(variant.price)}</p>
            ) : null}

            <div className="mt-3">
              <TrustpilotStars rating={trust.rating} reviewCount={trust.reviewCount} />
            </div>

            <div className="mt-6">
              <DeliveryPromise leadTime={hamper?.leadTime ?? null} />
            </div>

            <div
              className="prose-tpc mt-6 text-ink-muted"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />

            {variant ? (
              <AddToCart product={product} variantId={variant.id} label="Add to cart" confirmation="Added to cart" />
            ) : null}

            {hamper ? <HamperDetails product={product} /> : null}
          </div>
        </div>
      </div>

      {crossSell.length ? (
        <section className="border-t border-rule bg-beige">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <h2 className="font-display text-[length:var(--text-display)] text-navy">
              Finish the gift
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              Small things that go in the same box. We add them before we tie the ribbon.
            </p>
            <div className="mt-8">
              <ProductGrid products={crossSell} />
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
