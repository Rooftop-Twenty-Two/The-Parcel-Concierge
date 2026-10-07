/**
 * The site-wide share image.
 *
 * Next merges metadata shallowly: a route that sets `openGraph` replaces the
 * layout's whole object, images included. So a product with no photograph
 * has to name this fallback itself, or it is shared as a bare grey box.
 */
export const DEFAULT_OG_IMAGE = {
  url: '/og-default.jpg',
  width: 1200,
  height: 630,
  alt: 'A Parcel Concierge hamper in its green gift box, holding Champagne, a Rathbornes candle, an ogham print and boxed Galway Crystal flutes',
}
