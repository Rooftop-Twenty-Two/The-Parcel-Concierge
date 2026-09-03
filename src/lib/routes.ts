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
  {
    label: 'Hampers',
    href: '/hampers',
    // The menu lists only listings the real catalogue can fill: twenty
    // hampers today, so the thin sub-listings stay out of the nav until
    // the range grows (the routes themselves redirect to /hampers).
    columns: [
      {
        title: 'Hampers',
        links: [
          { label: 'All hampers', href: '/hampers' },
          { label: '€75 to €125', href: '/hampers/75-125' },
          { label: '€125 to €200', href: '/hampers/125-200' },
          { label: 'New baby', href: '/hampers/new-baby' },
          { label: 'Build your own hamper', href: '/build-your-own-hamper' },
        ],
      },
    ],
    promo: {
      title: 'Build your own hamper',
      body: 'Pick the box, pick what goes in it, write the card.',
      href: '/build-your-own-hamper',
      imageSrc: '/photography/tpc-03-full.jpg',
      imageAlt: 'A new baby hamper with a teddy bear, a blanket and a bottle of sparkling rosé',
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
    label: 'Corporate',
    href: '/corporate-gifting',
    columns: [
      {
        title: 'Corporate gifting',
        links: [
          { label: 'Bulk orders', href: '/corporate-gifting/bulk-orders' },
          { label: 'Branding and personalisation', href: '/corporate-gifting/branding-personalisation' },
          { label: 'Make an enquiry', href: '/corporate-gifting/enquiry' },
        ],
      },
    ],
    promo: {
      title: 'Client lists, handled',
      body: 'One address or two hundred. Send us the spreadsheet and we do the rest.',
      href: '/corporate-gifting/bulk-orders',
      imageSrc: '/photography/tpc-christmas-11.jpg',
      imageAlt: 'The Parcel Concierge shop in Dunshaughlin dressed for Christmas, with the delivery van outside and corporate gifts listed in the window',
    },
  },
  // Seasonal: the Christmas entry point gets its own top-level item while
  // the season runs. Remove this row in January.
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
      body: 'More Christmas hampers land in November. Everything on the site is ready to send today.',
      href: '/occasions/christmas',
      imageSrc: '/photography/tpc-christmas-11.jpg',
      imageAlt:
        'The Parcel Concierge shop in Dunshaughlin dressed for Christmas, the window full of lights and gifts',
    },
  },
  {
    label: 'Occasions',
    href: '/occasions',
    columns: [
      {
        title: 'Occasions',
        links: [
          { label: 'Christmas', href: '/occasions/christmas' },
          { label: "Mother's Day", href: '/occasions/mothers-day' },
          { label: "Father's Day", href: '/occasions/fathers-day' },
          { label: "Valentine's", href: '/occasions/valentines' },
          { label: 'Get well soon', href: '/occasions/get-well' },
        ],
      },
    ],
    promo: {
      title: 'Shop by budget instead',
      body: 'If the number is set and the person is not, start here.',
      href: '/gifts-by-budget/50-100',
      imageSrc: '/photography/tpc-06-full.jpg',
      imageAlt: 'A bottle of Champagne, a glass and a notebook packed in a green gift box',
    },
  },
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
