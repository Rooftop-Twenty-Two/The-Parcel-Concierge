/**
 * The front end's product model.
 *
 * Everything here is derived from Shopify at request time. Shopify owns
 * price, inventory, variants and order state; nothing in this shape is ever
 * written back from the CMS. If a field could go stale against Shopify, it
 * does not belong here.
 */

export type Money = {
  /** Minor units. Integer cents, so no float arithmetic on money anywhere. */
  amountMinor: number
  currencyCode: string
}

export type ProductImage = {
  url: string
  /**
   * Real alt text. For hampers this describes the contents, not "hamper
   * image 2". Sourced from Shopify's image altText and validated by the
   * ingest tool.
   */
  alt: string
  width: number
  height: number
}

export type ProductVariant = {
  id: string
  sku: string | null
  title: string
  price: Money
  compareAtPrice: Money | null
  availableForSale: boolean
  /** null when Shopify is not tracking inventory for this variant. */
  quantityAvailable: number | null
  selectedOptions: { name: string; value: string }[]
}

export type HamperContentLine = {
  name: string
  producer: string | null
  size: string | null
}

/** hamper.* metafields. See docs/metafields.md. */
export type HamperMetafields = {
  contents: HamperContentLine[]
  /** CMS maker-profile slugs, referenced by handle. Never duplicated copy. */
  producers: string[]
  allergens: string | null
  containsAlcohol: boolean
  packaging: string | null
  personalisation: PersonalisationOption[]
  dimensionsWeight: string | null
  leadTime: string | null
  occasionTags: string[]
  recipientTags: string[]
}

export type PersonalisationOption =
  | { kind: 'gift-message'; label: string; maxLength: number; required: false }
  | { kind: 'ribbon-colour'; label: string; choices: string[]; required: false }
  | { kind: 'branded-card'; label: string; required: false }

/** wine.* metafields. See docs/metafields.md. */
export type WineMetafields = {
  producer: string | null
  region: string | null
  country: string | null
  grape: string[]
  vintage: string | null
  abv: number | null
  volume: string | null
  style: { body: string | null; sweetness: string | null }
  tastingNote: string | null
  foodPairing: string | null
  awards: string[]
  isExclusiveImport: boolean
  /**
   * Only populated where we hold verified evidence. Never rendered as a
   * competitor price: see docs/copy-style-guide.md.
   */
  rrpComparison: string | null
  /**
   * Flags carried by the real catalogue's own tagging. They drive
   * collections and the age gate, so they are part of the model rather
   * than something a component infers from a tag string.
   */
  isAlcoholFree: boolean
  organic: boolean
  biodynamic: boolean
  fineWine: boolean
  giftSet: boolean
}

/**
 * `builder-item` is the quarantined kind: the full shop catalogue, sold
 * only as things you put in a built hamper. The main site sells hampers
 * and wine; a builder item never appears in a listing, the sitemap or at
 * a product URL, and the query layer enforces that rather than trusting
 * each caller to remember. See scripts/catalogue/import-builder-items.mjs.
 */
export type ProductKind = 'hamper' | 'wine' | 'spirit' | 'addon' | 'builder-item'

export type Product = {
  id: string
  handle: string
  title: string
  /** Shopify product body. Descriptions live in Shopify, not the CMS. */
  descriptionHtml: string
  kind: ProductKind
  images: ProductImage[]
  variants: ProductVariant[]
  priceRange: { min: Money; max: Money }
  availableForSale: boolean
  tags: string[]
  hamper: HamperMetafields | null
  wine: WineMetafields | null
  updatedAt: string
}

export type ProductCard = Pick<
  Product,
  'id' | 'handle' | 'title' | 'kind' | 'priceRange' | 'availableForSale' | 'tags'
> & {
  image: ProductImage | null
  /** Set when the product carries badge:exclusive. Drives the card flag. */
  badges: string[]
  /**
   * The first AVAILABLE variant's id, not merely the first.
   *
   * Present so components that add straight to the cart (the hamper builder
   * and the cart cross-sell) do not have to fetch the full product first.
   * Shopify product and variant ids are unrelated, so this can never be
   * derived from the product id, and null means the caller must load the
   * product before it can add anything.
   *
   * Availability matters: a product whose first variant is sold out but
   * whose second is in stock is a buyable product, and handing out the
   * sold-out variant id made the builder reject boxes at add-to-cart.
   */
  defaultVariantId: string | null
  /**
   * What that variant costs. The price range's minimum can belong to a
   * variant that is sold out, and a card that quotes one price and adds
   * another is lying.
   */
  defaultVariantPriceMinor: number | null
}

export type CartLineAttribute = { key: string; value: string }

export type CartLine = {
  id: string
  quantity: number
  merchandiseId: string
  productHandle: string
  productTitle: string
  variantTitle: string | null
  image: ProductImage | null
  unitPrice: Money
  lineTotal: Money
  attributes: CartLineAttribute[]
  /** Set on subscription lines. Shopify's name for the plan, e.g. "Every 3 months". */
  sellingPlanName: string | null
}

export type Cart = {
  id: string
  /** Handoff to Shopify hosted checkout. We never build our own. */
  checkoutUrl: string
  totalQuantity: number
  subtotal: Money
  lines: CartLine[]
  containsAlcohol: boolean
}

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'newest'

export type ProductQuery = {
  /** Shopify tags, ANDed. */
  tags?: string[]
  kinds?: ProductKind[]
  /** Shopify product_type values, ORed. Used by the add-on band. */
  productTypes?: string[]
  /**
   * wine.* boolean flags, ANDed. Drives the fine wine, organic and alcohol
   * free listings, which are real distinctions in the catalogue rather than
   * anything derivable from product type.
   */
  wineFlags?: ('fineWine' | 'organic' | 'biodynamic' | 'isAlcoholFree' | 'giftSet')[]
  /** Any one of these flags is enough. Organic OR biodynamic, for instance. */
  anyWineFlag?: ('fineWine' | 'organic' | 'biodynamic' | 'isAlcoholFree' | 'giftSet')[]
  /**
   * A native Shopify collection handle. When set, the listing reads
   * collection(handle){products} instead of a tag/product_type search — this
   * is the live store's real taxonomy. Price bounds below ride as Storefront
   * collection filters; `sort` maps to ProductCollectionSortKeys.
   */
  collection?: string
  /**
   * Explicit handles, in order. Set by CMS-curated listings, which are the
   * only listings where editorial ordering beats a query.
   */
  handles?: string[]
  minPriceMinor?: number
  maxPriceMinor?: number
  /**
   * Free-text search over titles. Exists for the hamper builder's picker,
   * where two thousand items need a search box, not another facet.
   */
  text?: string
  /** Filter facets from the URL, e.g. grape=malbec. */
  facets?: Record<string, string[]>
  sort?: ProductSort
  first?: number
  after?: string | null
  /**
   * Out-of-stock products are excluded by default. Success criterion 7:
   * never render an out-of-stock product as an indexable, buyable-looking
   * page.
   */
  includeOutOfStock?: boolean
}

export type ProductQueryResult = {
  items: ProductCard[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
  totalKnown: number
}
