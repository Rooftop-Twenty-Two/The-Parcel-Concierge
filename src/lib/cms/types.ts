/**
 * What the CMS owns.
 *
 * Words and curation. Never price, never stock, never variants. Products are
 * referenced by handle, never by copied title or price, so a CMS document
 * cannot go stale against Shopify.
 */

export type ListingCopy = {
  /** The listing route this copy belongs to, e.g. /hampers/under-75. */
  path: string
  /** 60 to 100 words, rendered above the grid. */
  intro: string
  /** 150 to 250 words, rendered below the grid. HTML. */
  seoBlock: string
  /** Overrides the registry title in <title> when the CMS wants a longer one. */
  metaTitle?: string
  metaDescription?: string
}

/** Curated listings: the CMS owns which products appear and in what order. */
export type CuratedListing = {
  path: string
  /** Shopify handles, in the order they should render. */
  handles: string[]
}

export type HomepageSlot =
  | { kind: 'hero'; headline: string; subhead: string; ctaLabel: string; ctaHref: string; imageHandle: string | null }
  /**
   * The seasonal band. Understated by design: type, one photograph and a
   * CTA, no seasonal clip art. Remove the slot from the list when the
   * season ends.
   *
   * `image` is a photograph from /public; `imageHandle` puts a product
   * shot in the frame and links it to that product. Set one or the
   * other. `image` wins where both are set.
   */
  | {
      kind: 'christmas'
      title: string
      body: string
      ctaLabel: string
      ctaHref: string
      imageHandle: string | null
      image?: { src: string; alt: string }
    }
  | { kind: 'budget-bands' }
  | { kind: 'featured-hampers'; title: string; handles: string[] }
  | { kind: 'hamper-builder'; title: string; body: string }
  | { kind: 'occasions'; title: string; paths: string[] }
  | { kind: 'wine-vault'; title: string; body: string; handles: string[] }
  | { kind: 'trustpilot' }
  | { kind: 'corporate'; title: string; body: string }
  | { kind: 'makers'; title: string; body: string; makerSlugs: string[] }
  | { kind: 'visit-shop'; title: string; body: string }
  | { kind: 'newsletter' }

export type Homepage = {
  /**
   * Ordered. The client reorders the page here without a deploy, which is
   * the point of putting seasonal weighting in the CMS.
   */
  slots: HomepageSlot[]
}

export type Maker = {
  slug: string
  name: string
  /**
   * Omitted where the county has not been confirmed by the client. The
   * pages render the line only when it is set rather than guessing a
   * county for a maker: see docs/build-status.md.
   */
  county?: string
  /** HTML. */
  body: string
  /**
   * The short "Irish made | Beautifully scented" line the client writes
   * under a maker. Rendered as its own row, separated by the component
   * rather than by punctuation in the copy.
   */
  flags?: readonly string[]
  /** Products from this maker, by handle. */
  productHandles: string[]
}

export type Guide = {
  slug: string
  title: string
  summary: string
  /** HTML. */
  body: string
  publishedAt: string
  updatedAt: string
  /** Products referenced in the guide, by handle. */
  productHandles: string[]
  /** Listing routes this guide links out to. */
  relatedPaths: string[]
}

export type FaqEntry = { question: string; answer: string }

export type ContentPage = {
  slug: string
  title: string
  intro?: string
  /** HTML. */
  body: string
  faqs?: FaqEntry[]
  updatedAt: string
}

export type CmsData = {
  homepage: Homepage
  listingCopy: ListingCopy[]
  curated: CuratedListing[]
  makers: Maker[]
  guides: Guide[]
  pages: ContentPage[]
}
