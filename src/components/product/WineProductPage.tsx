import Link from 'next/link'
import { AgeGate } from '@/components/commerce/AgeGate'
import { DeliveryPromise } from '@/components/commerce/DeliveryPromise'
import { AddToCart } from '@/components/product/AddToCart'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductGrid } from '@/components/product/ProductCard'
import { ProductCarousel } from '@/components/product/ProductCarousel'
import {
  VariantPrice,
  VariantSelectionProvider,
  VariantSelector,
} from '@/components/product/VariantSelector'
import { JsonLd } from '@/components/seo/JsonLd'
import { TrustpilotStars } from '@/components/trust/TrustpilotStars'
import { PostmarkRoundel } from '@/components/ui/Stamp'
import type { Product, ProductCard } from '@/lib/commerce/types'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/structured-data'
import { demoteHeadings } from '@/lib/seo/demote-headings'

/**
 * Wine product page.
 *
 * The exclusivity line only renders where `is_exclusive_import` is set, and
 * the value line only where a verified comparison exists. Neither is ever
 * generated from a template, and no competitor price appears in customer
 * facing copy: prices move, and a claim that was true last month is a
 * problem this month.
 */
export function WineProductPage({
  product,
  trust,
  crossSell,
  similar,
}: {
  product: Product
  trust: { rating: number; reviewCount: number }
  crossSell: ProductCard[]
  /** More from the same range, for the carousel at the foot of the page. */
  similar: ProductCard[]
}) {
  const wine = product.wine

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'The Wine Vault', path: '/wine' },
    { name: product.title, path: `/wine/${product.handle}` },
  ]

  const specs: [string, string | null][] = wine
    ? [
        ['Producer', wine.producer],
        ['Region', wine.region],
        ['Country', wine.country],
        ['Grape', wine.grape.length ? wine.grape.join(', ') : null],
        ['Vintage', wine.vintage],
        ['Style', [wine.style.body, wine.style.sweetness].filter(Boolean).join(', ') || null],
        ['ABV', wine.abv !== null ? `${wine.abv}%` : null],
        ['Bottle size', wine.volume],
      ]
    : []

  return (
    <>
      {/* Alcohol free wine is not alcohol, so it is not gated. */}
      {wine?.isAlcoholFree ? null : <AgeGate context="product" />}

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
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <ProductGallery images={product.images} title={product.title} />

            <div>
            {wine?.isExclusiveImport ? (
              <div className="mb-4 flex items-center gap-3 border border-green/30 bg-green/5 px-4 py-3">
                <PostmarkRoundel className="h-12 w-12 shrink-0 text-green" />
                <p className="text-sm text-navy">
                  <strong className="font-medium">We are the only Irish stockist.</strong> We import
                  this one ourselves.{' '}
                  <Link href="/wine/exclusive-to-us" className="underline underline-offset-2">
                    See the rest
                  </Link>
                </p>
              </div>
            ) : null}

            <h1 className="font-display text-[length:var(--text-display)] text-navy">
              {product.title}
            </h1>

            <VariantPrice />

            <div className="mt-3">
              <TrustpilotStars rating={trust.rating} reviewCount={trust.reviewCount} />
            </div>

            <div className="mt-6">
              <DeliveryPromise />
            </div>

            <div
              className="prose-tpc mt-6 text-ink-muted"
              dangerouslySetInnerHTML={{ __html: demoteHeadings(product.descriptionHtml) }}
            />

            {/*
              The value line renders only where we hold dated, verified
              evidence, and it never names another retailer or their price.
            */}
            {wine?.rrpComparison ? (
              <p className="mt-4 border-l-2 border-gold pl-4 text-sm text-navy">
                {wine.rrpComparison}
              </p>
            ) : null}

            <VariantSelector />
            <AddToCart product={product} />

            {specs.some(([, value]) => value) ? (
              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-rule pt-6 text-sm">
                {specs
                  .filter((entry): entry is [string, string] => Boolean(entry[1]))
                  .map(([term, value]) => (
                    <div key={term}>
                      <dt className="text-xs uppercase tracking-[0.16em] text-ink-muted">{term}</dt>
                      <dd className="text-navy">{value}</dd>
                    </div>
                  ))}
              </dl>
            ) : null}

            {wine?.foodPairing ? (
              <p className="mt-6 text-sm text-ink-muted">
                <span className="text-navy">Goes with:</span> {wine.foodPairing}
              </p>
            ) : null}

            {wine?.awards.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {wine.awards.map((award) => (
                  <li
                    key={award}
                    className="border border-gold px-2 py-1 text-xs uppercase tracking-[0.12em] text-navy"
                  >
                    {award}
                  </li>
                ))}
              </ul>
            ) : null}

            <p className={`mt-8 text-xs text-ink-muted ${wine?.isAlcoholFree ? 'hidden' : ''}`}>
              You must be over 18 to buy alcohol. We may ask for proof of age on delivery, and there
              are addresses we cannot deliver alcohol to.{' '}
              <Link href="/delivery" className="underline underline-offset-2">
                Delivery details
              </Link>
            </p>
            </div>
          </div>
        </VariantSelectionProvider>
      </div>

      {crossSell.length ? (
        <section className="border-t border-rule bg-beige">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <h2 className="font-display text-[length:var(--text-display)] text-navy">
              Send it as a gift
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              Hampers built around this kind of bottle, with the glassware in the box.
            </p>
            <div className="mt-8">
              <ProductGrid products={crossSell} />
            </div>
          </div>
        </section>
      ) : null}

      {similar.length ? (
        <section className="border-t border-rule">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <h2 className="font-display text-[length:var(--text-display)] text-navy">
              More from the Wine Vault
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">Other bottles we chose, from the same shelves.</p>
            <div className="mt-8">
              <ProductCarousel products={similar} label="More from the Wine Vault" />
            </div>
          </div>
        </section>
      ) : null}

      <JsonLd data={productJsonLd(product, trust)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}
