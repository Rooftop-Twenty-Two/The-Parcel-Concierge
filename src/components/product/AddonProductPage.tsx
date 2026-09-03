import Link from 'next/link'
import { DeliveryPromise } from '@/components/commerce/DeliveryPromise'
import { AddToCart } from '@/components/product/AddToCart'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductGrid } from '@/components/product/ProductCard'
import {
  VariantPrice,
  VariantSelectionProvider,
  VariantSelector,
} from '@/components/product/VariantSelector'
import { JsonLd } from '@/components/seo/JsonLd'
import { TrustpilotStars } from '@/components/trust/TrustpilotStars'
import type { Product, ProductCard } from '@/lib/commerce/types'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/structured-data'

/**
 * Add-on product page.
 *
 * Deliberately the plainest template on the site. These products exist to be
 * added to a hamper, not to be discovered on their own, so the page spends
 * its space pushing back towards hampers.
 */
export function AddonProductPage({
  product,
  trust,
  hampers,
}: {
  product: Product
  trust: { rating: number; reviewCount: number }
  hampers: ProductCard[]
}) {
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Gifts', path: '/gifts' },
    { name: product.title, path: `/gifts/${product.handle}` },
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
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <ProductGallery images={product.images} title={product.title} />

            <div>
              <h1 className="font-display text-[length:var(--text-display)] text-navy">
                {product.title}
              </h1>
              <VariantPrice />

              <div className="mt-3">
                <TrustpilotStars rating={trust.rating} reviewCount={trust.reviewCount} />
              </div>

              <div
                className="prose-tpc mt-6 text-ink-muted"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />

              <VariantSelector />
              <AddToCart product={product} label="Add to hamper" confirmation="Added to hamper" />

              <div className="mt-8">
                <DeliveryPromise compact />
              </div>
            </div>
          </div>
        </VariantSelectionProvider>
      </div>

      {hampers.length ? (
        <section className="border-t border-rule bg-beige">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <h2 className="font-display text-[length:var(--text-display)] text-navy">
              Put it in a hamper
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              On its own this is a small gift. In a box with four other things, it is a real one.
            </p>
            <div className="mt-8">
              <ProductGrid products={hampers} />
            </div>
            <Link
              href="/build-your-own-hamper"
              className="mt-6 inline-block text-navy underline underline-offset-4"
            >
              Or build a box around it
            </Link>
          </div>
        </section>
      ) : null}

      <JsonLd data={productJsonLd(product, trust)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}
