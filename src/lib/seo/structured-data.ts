import type { Product } from '../commerce/types'
import { productPathFor } from '../routes'
import { SITE } from '../site-config'

/**
 * Structured data.
 *
 * Product, Offer, AggregateRating, BreadcrumbList, FAQPage and LocalBusiness,
 * all built from the same data the page renders. Nothing is asserted in JSON-LD
 * that a shopper cannot see on the page: a rating in the markup and no stars on
 * the page is a manual action waiting to happen.
 */

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString()
}

export function localBusinessJsonLd(trust: { rating: number; reviewCount: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': absoluteUrl('/#business'),
    name: SITE.name,
    url: SITE.url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.town,
      addressRegion: SITE.county,
      addressCountry: SITE.country,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: trust.rating,
      reviewCount: trust.reviewCount,
      bestRating: 5,
    },
    founder: SITE.owners.split(' and ').map((name) => ({ '@type': 'Person', name })),
    memberOf: SITE.memberships.map((name) => ({ '@type': 'Organization', name })),
  }
}

export function productJsonLd(
  product: Product,
  trust: { rating: number; reviewCount: number } | null,
) {
  const url = absoluteUrl(productPathFor(product.kind, product.handle))
  const offers = product.variants.map((variant) => ({
    '@type': 'Offer',
    url,
    priceCurrency: variant.price.currencyCode,
    price: (variant.price.amountMinor / 100).toFixed(2),
    availability: variant.availableForSale
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    ...(variant.sku ? { sku: variant.sku } : {}),
    seller: { '@type': 'Organization', name: SITE.name },
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    url,
    image: product.images.map((i) => i.url),
    description: stripHtml(product.descriptionHtml).slice(0, 500),
    brand: { '@type': 'Brand', name: product.wine?.producer ?? SITE.name },
    ...(product.variants[0]?.sku ? { sku: product.variants[0].sku } : {}),
    offers: offers.length === 1 ? offers[0] : offers,
    // The rating is the business rating, so it is attached only where the
    // page shows it. It is never invented per product.
    ...(trust
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: trust.rating,
            reviewCount: trust.reviewCount,
            bestRating: 5,
          },
        }
      : {}),
  }
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: stripHtml(faq.answer) },
    })),
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
