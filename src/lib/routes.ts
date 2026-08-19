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
  }
}

/** Hubs that carry both listing routes and product routes on one segment. */
export const PRODUCT_HUBS = ['hampers', 'wine', 'gifts'] as const
export type ProductHub = (typeof PRODUCT_HUBS)[number]

export const NAV = [
  {
    label: 'Hampers',
    href: '/hampers',
    columns: [
      {
        title: 'By budget',
        links: [
          { label: 'Under €75', href: '/hampers/under-75' },
          { label: '€75 to €125', href: '/hampers/75-125' },
          { label: '€125 to €200', href: '/hampers/125-200' },
          { label: 'Luxury, €200 and over', href: '/hampers/luxury-200-plus' },
        ],
      },
      {
        title: 'By contents',
        links: [
          { label: 'Wine hampers', href: '/hampers/wine' },
          { label: 'Food hampers', href: '/hampers/food' },
          { label: 'Whiskey hampers', href: '/hampers/whiskey' },
          { label: 'Pamper hampers', href: '/hampers/pamper' },
        ],
      },
      {
        title: 'By occasion',
        links: [
          { label: 'New baby', href: '/hampers/new-baby' },
          { label: 'Sympathy', href: '/hampers/sympathy' },
          { label: 'Anniversary', href: '/hampers/anniversary' },
          { label: 'Thank you', href: '/hampers/thank-you' },
          { label: 'Corporate', href: '/hampers/corporate' },
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
    label: 'Wine & Spirits',
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
        title: 'Spirits',
        links: [
          { label: 'Irish whiskey', href: '/wine/irish-whiskey' },
          { label: 'Gin and spirits', href: '/wine/gin-and-spirits' },
          { label: 'Wine gift sets', href: '/wine/gift-sets' },
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
      title: 'Exclusive to us',
      body: 'Eight wines no other Irish retailer stocks, because we import them ourselves.',
      href: '/wine/exclusive-to-us',
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
          { label: 'Corporate hampers', href: '/hampers/corporate' },
        ],
      },
    ],
    promo: {
      title: 'Client lists, handled',
      body: 'One address or two hundred. Send us the spreadsheet and we do the rest.',
      href: '/corporate-gifting/bulk-orders',
      imageSrc: '/photography/tpc-08-full.jpg',
      imageAlt: 'A wooden herb growing box, a bottle of red wine and a hand lettered card in a gift box',
    },
  },
  {
    label: 'Occasions',
    href: '/occasions',
    columns: [
      {
        title: 'Seasonal',
        links: [
          { label: 'Christmas', href: '/occasions/christmas' },
          { label: "Mother's Day", href: '/occasions/mothers-day' },
          { label: "Father's Day", href: '/occasions/fathers-day' },
          { label: "Valentine's", href: '/occasions/valentines' },
          { label: 'Easter', href: '/occasions/easter' },
        ],
      },
      {
        title: 'Life events',
        links: [
          { label: 'New baby', href: '/occasions/new-baby' },
          { label: 'Sympathy', href: '/occasions/sympathy' },
          { label: 'Wedding and engagement', href: '/occasions/wedding-engagement' },
          { label: 'Get well', href: '/occasions/get-well' },
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
    label: 'Gifts',
    href: '/gifts',
    columns: [
      {
        title: 'By recipient',
        links: [
          { label: 'For her', href: '/gifts-for/her' },
          { label: 'For him', href: '/gifts-for/him' },
          { label: 'For couples', href: '/gifts-for/couples' },
          { label: 'For clients', href: '/gifts-for/clients' },
        ],
      },
      {
        title: 'By budget',
        links: [
          { label: 'Under €50', href: '/gifts-by-budget/under-50' },
          { label: '€50 to €100', href: '/gifts-by-budget/50-100' },
          { label: '€100 to €150', href: '/gifts-by-budget/100-150' },
          { label: '€150 and over', href: '/gifts-by-budget/150-plus' },
        ],
      },
      {
        title: 'Add to a hamper',
        links: [
          { label: 'Candles and diffusers', href: '/gifts/candles-diffusers' },
          { label: 'Chocolate and treats', href: '/gifts/chocolate-treats' },
          { label: 'Crystal and glassware', href: '/gifts/crystal-glassware' },
          { label: 'Gift card', href: '/gift-card' },
        ],
      },
    ],
    promo: null,
  },
  { label: 'Guides', href: '/guides', columns: [], promo: null },
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
      { label: 'Exclusive to us', href: '/wine/exclusive-to-us' },
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
      { label: 'Guides', href: '/guides' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Returns and refunds', href: '/legal/returns' },
      { label: 'Cookies', href: '/legal/cookies' },
    ],
  },
] as const
