import type { Product, ProductKind } from '@/lib/commerce/types'

/**
 * The meta description for a product page.
 *
 * Normally this is the product's own description, trimmed. Around thirty
 * wines on the live store have no description at all, and those pages were
 * going out with no meta description whatsoever, which leaves Google to
 * write one from whatever text it can find on the page.
 *
 * The fallback states only what we can check without opening the bottle:
 * what the thing is, where it is sold from, and the delivery terms. It says
 * nothing about how anything tastes. An invented tasting note reads well
 * and is a lie, and we have been caught doing the equivalent once already
 * on the makers page.
 *
 * A real description always wins. This is the floor, not a replacement.
 *
 * No runtime imports, for the same reason as commerce/bottle-limit.ts: the
 * rule is worth a test, and a module the test runner can load without
 * booting Next is a module that gets tested. That is why the delivery line
 * arrives as an argument rather than being read from site-config here, and
 * why the tag stripping below is not shared with structured-data.ts.
 */
const PLACE_BY_KIND: Record<ProductKind, string> = {
  wine: 'From the Wine Vault at The Parcel Concierge in Dunshaughlin, Co. Meath.',
  spirit: 'From the Wine Vault at The Parcel Concierge in Dunshaughlin, Co. Meath.',
  hamper: 'Packed by hand at The Parcel Concierge in Dunshaughlin, Co. Meath.',
  addon: 'From The Parcel Concierge in Dunshaughlin, Co. Meath.',
  'builder-item': 'From The Parcel Concierge in Dunshaughlin, Co. Meath.',
}

/** Kept under the ~160 characters Google will render before truncating. */
const MAX_LENGTH = 155

export function productMetaDescription(
  product: Pick<Product, 'title' | 'descriptionHtml' | 'kind'>,
  deliveryLine: string,
): string {
  const own = plainText(product.descriptionHtml ?? '')
  if (own) return truncate(own, MAX_LENGTH)

  return truncate(`${product.title}. ${PLACE_BY_KIND[product.kind]} ${deliveryLine}`, MAX_LENGTH)
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cuts on a word boundary, so a description never ends mid-word. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()
}
