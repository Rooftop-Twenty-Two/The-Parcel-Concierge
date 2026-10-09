import type { ProductCard, ProductKind } from './commerce/types'

/**
 * Canonical URLs.
 *
 * One product, one URL, regardless of which listing the shopper arrived
 * from. We do not create a copy of a product under every collection path:
 * that is how the old site ended up with duplicate URLs competing with each
 * other.
 */

export function productPath(product: Pick<ProductCard, 'handle' | 'kind'>): string {
  return productPathFor(product.kind, product.handle)
}

export function productPathFor(kind: ProductKind, handle: string): string {
  switch (kind) {
    case 'hamper':
      return `/hampers/${handle}`
    case 'wine':
    case 'spirit':
      return `/wine/${handle}`
    case 'addon':
      return `/gifts/${handle}`
    case 'builder-item':
      // A builder item has no page of its own. Anywhere that would link to
      // one links to the only place it can be bought.
      return '/build-your-own-hamper'
  }
}

/** Hubs that carry both listing routes and product routes on one segment. */
export const PRODUCT_HUBS = ['hampers', 'wine', 'gifts'] as const
export type ProductHub = (typeof PRODUCT_HUBS)[number]

export const NAV = [
  // Seasonal: the Christmas entry point gets its own top-level item while
  // the season runs, first in the bar ahead of Wine and Hampers (client,
  // October 2026). Remove this row in January.
  //
  // It carries a real menu rather than being a bare link. When it was bare
  // it was one of two items in the bar that dropped nothing on hover, and
  // the client read the pair as duplicates of each other.
  {
    label: 'Christmas',
    href: '/occasions/christmas',
    columns: [
      {
        title: 'Christmas',
        links: [
          { label: 'Christmas gifts and hampers', href: '/occasions/christmas' },
          { label: 'Build your own hamper', href: '/build-your-own-hamper' },
          { label: 'The Wine Vault', href: '/wine' },
          { label: 'Corporate Christmas gifting', href: '/corporate-gifting' },
          { label: 'Delivery and last posting dates', href: '/delivery' },
        ],
      },
    ],
    promo: {
      title: 'Christmas gifts and hampers',
      body: 'Christmas has arrived. Everything on the site is ready to send today.',
      href: '/occasions/christmas',
      imageSrc: '/photography/tpc-christmas-11.jpg',
      imageAlt:
        'The Parcel Concierge shop in Dunshaughlin dressed for Christmas, the window full of lights and gifts',
    },
  },
  {
    label: 'Wine',
    href: '/wine',
    columns: [
      {
        title: 'Wine',
        links: [
          { label: 'Red', href: '/wine/red' },
          { label: 'White', href: '/wine/white' },
          { label: 'Rosé', href: '/wine/rose' },
          { label: 'Champagne and sparkling', href: '/wine/champagne-sparkling' },
          { label: 'Port and dessert', href: '/wine/port-dessert' },
        ],
      },
      {
        title: 'More from the vault',
        links: [
          { label: 'Fine wines', href: '/wine/fine-wines' },
          { label: 'Organic and biodynamic', href: '/wine/organic-biodynamic' },
          { label: 'Wine gift sets', href: '/wine/gift-sets' },
          { label: 'Non alcoholic', href: '/wine/alcohol-free' },
          { label: 'Liqueurs and cider', href: '/wine/liqueurs-cider' },
          { label: 'The Wine Vault Club', href: '/wine-club' },
        ],
      },
      {
        title: 'By budget',
        links: [
          { label: 'Under €25', href: '/wine/under-25' },
          { label: '€25 to €50', href: '/wine/25-50' },
          { label: '€50 and over', href: '/wine/50-plus' },
        ],
      },
    ],
    promo: {
      title: 'The Wine Vault Club',
      body: 'A case of wine, chosen by us, as often as you want it.',
      href: '/wine-club',
      imageSrc: '/photography/tpc-may-13.jpg',
      imageAlt: 'The wine room in the shop in Dunshaughlin',
    },
  },
  {
    label: 'Hampers',
    href: '/hampers',
    // Seasonal: the hamper range is one merchant collection only
    // (SEASONAL_HAMPERS_ONLY in commerce/collections.ts), so the theme
    // sub-listings are out of the nav. The price bands are live again and
    // reachable from the homepage and the hub, which drop any band too thin
    // to open; the nav is static, so it does not list them until the range
    // is big enough for all four to fill. Restore the theme links when the
    // full range reopens.
    columns: [
      {
        title: 'Hampers',
        links: [
          { label: 'All hampers', href: '/hampers' },
          { label: 'Build your own hamper', href: '/build-your-own-hamper' },
        ],
      },
    ],
    promo: {
      title: 'Build your own hamper',
      body: 'Pick a hamper box or wicker basket, fill it, write the card.',
      href: '/build-your-own-hamper',
      imageSrc: '/photography/tpc-03-full.jpg',
      imageAlt: 'A new baby hamper with a teddy bear, a blanket and a bottle of sparkling rosé',
    },
  },
  // No dropdown, per the client, September 2026. The bulk orders and
  // branding pages came off and the menu was down to a single link, which
  // is a panel that costs a hover and says nothing. Straight to the hub.
  { label: 'Corporate', href: '/corporate-gifting', columns: [], promo: null },
  // Occasions came out of the bar at the client's request, September 2026,
  // and the menu was the reason: of its five links, four pointed at
  // listings whose collections were removed in the collection clear-out,
  // so they redirected straight back to the hub. The fifth was Christmas,
  // which already has a top-level item of its own. A panel of dead ends
  // next to the live one it duplicates.
  //
  // The hub itself is untouched and still at /occasions. It is reachable
  // from the Christmas breadcrumb, from the homepage occasions band and
  // from the sitemap, and it only ever offers listings that will open
  // (see populatedListings in the page). So restoring this row is putting
  // it back — nothing else has to be rebuilt — and it is worth doing once
  // more than one occasion has a collection behind it again.
  {
    label: 'About',
    href: '/about',
    columns: [
      {
        title: 'About us',
        links: [
          { label: 'Our story', href: '/about' },
          { label: 'Our makers', href: '/about/our-makers' },
          { label: 'Guaranteed Irish', href: '/about/guaranteed-irish' },
          { label: 'Delivery', href: '/delivery' },
          { label: 'Contact', href: '/contact' },
        ],
      },
    ],
    promo: null,
  },
] as const

export const FOOTER_LINKS = [
  {
    title: 'Shop',
    links: [
      { label: 'Hampers', href: '/hampers' },
      { label: 'Build your own hamper', href: '/build-your-own-hamper' },
      { label: 'The Wine Vault', href: '/wine' },
      { label: 'Fine wines', href: '/wine/fine-wines' },
      { label: 'The Wine Vault Club', href: '/wine-club' },
      { label: 'Gift card', href: '/gift-card' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Delivery', href: '/delivery' },
      { label: 'Frequently asked questions', href: '/faq' },
      { label: 'Contact us', href: '/contact' },
      { label: 'Corporate gifting', href: '/corporate-gifting' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our story', href: '/about' },
      { label: 'Our makers', href: '/about/our-makers' },
      { label: 'Guaranteed Irish', href: '/about/guaranteed-irish' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Refund policy', href: '/legal/returns' },
      { label: 'Cookies', href: '/legal/cookies' },
    ],
  },
] as const
