/**
 * The catalogue interchange format.
 *
 * One shape, two consumers:
 *   - scripts/ingest reads it and writes products into Shopify via the
 *     Admin API.
 *   - the front end reads it as a fixture catalogue when no Storefront
 *     credentials are configured, so the whole site is runnable before
 *     Shopify access lands.
 *
 * Keeping both on one schema means the fixture data is the same data the
 * ingest tool will publish, so a page that renders in fixture mode renders
 * against the real store too.
 *
 * SKU is the idempotency key. Re-running ingest with the same SKU updates,
 * it never creates a second product.
 */

export type CatalogueImage = {
  /** Absolute URL, or a path under /public for fixture data. */
  src: string
  /**
   * Real alt text describing what is in the shot. Mandatory: the ingest
   * tool refuses an image without it, and a hamper image that says
   * "hamper 2" fails review.
   */
  alt: string
  width: number
  height: number
}

export type CatalogueVariant = {
  sku: string
  title: string
  /** Decimal string, e.g. "158.00". Parsed to minor units at the boundary. */
  price: string
  compareAtPrice?: string
  /** null means Shopify is not tracking inventory for this variant. */
  inventoryQuantity: number | null
  options?: { name: string; value: string }[]
}

export type CatalogueHamperFields = {
  contents: { name: string; producer?: string; size?: string }[]
  producers?: string[]
  /** Mandatory for hampers. Ingest blocks an empty value. */
  allergens: string
  containsAlcohol: boolean
  packaging?: string
  personalisation?: (
    | { kind: 'gift-message'; label: string; maxLength?: number }
    | { kind: 'ribbon-colour'; label: string; choices: string[] }
    | { kind: 'branded-card'; label: string }
  )[]
  dimensionsWeight?: string
  leadTime?: string
  occasionTags?: string[]
  recipientTags?: string[]
}

export type CatalogueWineFields = {
  producer?: string
  region?: string
  country?: string
  grape?: string[]
  vintage?: string
  abv?: number
  volume?: string
  styleBody?: 'light' | 'medium' | 'full'
  styleSweetness?: 'dry' | 'off-dry' | 'sweet'
  tastingNote?: string
  foodPairing?: string
  awards?: string[]
  isExclusiveImport?: boolean
  /**
   * Only populated where we hold verified evidence, and never phrased as a
   * competitor's price. See docs/copy-style-guide.md.
   */
  rrpComparison?: string
  /** Flags from the shop's own tagging. See the importer. */
  isAlcoholFree?: boolean
  organic?: boolean
  biodynamic?: boolean
  fineWine?: boolean
  giftSet?: boolean
}

export type CatalogueProduct = {
  handle: string
  title: string
  /**
   * Product body copy, HTML. Descriptions live in Shopify so they stay
   * attached to the product wherever it appears. The CMS does not own them.
   */
  descriptionHtml: string
  /** Shopify product_type. Drives the listing routes that query by type. */
  productType: string
  vendor: string
  /** Must all be in the locked taxonomy. Ingest rejects anything else. */
  tags: string[]
  images: CatalogueImage[]
  variants: CatalogueVariant[]
  hamper?: CatalogueHamperFields
  wine?: CatalogueWineFields
  /**
   * Set by the copy process when the metafield data is too thin to write a
   * description honestly. Ingest refuses to publish these, so a gap in the
   * data can never become invented copy on the site.
   */
  needsReview?: string
}

export type Catalogue = {
  /** Free text, so a run report can say which export it came from. */
  source: string
  currencyCode: string
  products: CatalogueProduct[]
}
