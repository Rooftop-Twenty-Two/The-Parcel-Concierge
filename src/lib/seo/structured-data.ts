import type { Product } from '../commerce/types'
import { productPathFor } from '../routes'
import { CONTACT, SITE } from '../site-config'

/**
 * Structured data.
 *
 * Product, Offer, AggregateRating, BreadcrumbList, FAQPage, WebSite and
 * LocalBusiness, all built from the same data the page renders. Nothing is
 * asserted in JSON-LD that a shopper cannot see on the page: a rating in the
 * markup and no stars on the page is a manual action waiting to happen.
 */

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString()
}

/**
 * The shop, for local search.
 *
 * The address used to be locality and county only, which is the level of
 * detail that identifies a town rather than a business. Street, Eircode,
 * phone and email all come from CONTACT, which is already the verified
 * record the legal pages render, so this states nothing new about the
 * business — it just stops throwing the detail away.
 *
 * Anything CONTACT holds as null stays out entirely rather than being
 * emitted empty: a blank telephone is worse than no telephone.
 */
export function localBusinessJsonLd(trust: { rating: number; reviewCount: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': absoluteUrl('/#business'),
    name: SITE.name,
    url: SITE.url,
    telephone: CONTACT.phone,
    email: CONTACT.email,
    image: absoluteUrl('/og-default.jpg'),
    logo: absoluteUrl('/brand/logo.svg'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.address.line1,
      addressLocality: SITE.town,
      addressRegion: SITE.county,
      postalCode: CONTACT.address.eircode,
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

/**
 * The site itself, with its search.
 *
 * The SearchAction is what lets Google offer a search box for the site in a
 * branded result. It is only honest to declare it now that /search exists
 * and reads the whole store — it did not until September 2026, which is why
 * this was not here before.
 *
 * The target has to be a real URL template with one {search_term_string},
 * and it has to match what the header's form actually submits: a GET to
 * /search with the term in `q`.
 */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: SITE.name,
    url: SITE.url,
    inLanguage: SITE.locale,
    publisher: { '@id': absoluteUrl('/#business') },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
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
