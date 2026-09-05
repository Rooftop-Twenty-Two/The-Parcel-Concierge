/**
 * Pushes headings inside merchant-authored HTML down the outline.
 *
 * Product descriptions come from Shopify, where they are written in a rich
 * text editor by whoever added the product. Some of them contain an `<h1>`
 * of their own, usually the wine's name pasted in from a supplier sheet.
 * Rendered inside a product page that already has an `<h1>`, that gives the
 * page two competing top-level headings, and on
 * /wine/santa-margherita-chianti-classico the second one disagreed with the
 * first about what the product is even called.
 *
 * We cannot fix this in Shopify without editing hundreds of descriptions by
 * hand, and the next import would undo it anyway. So we fix it where it is
 * rendered: h1 and h2 become h3, which sits correctly under the page
 * heading and the "Description" heading above it, and h3 down is left alone.
 *
 * Attributes are preserved, so the merchant's own styling survives. This is
 * not a sanitiser and does not pretend to be: the HTML is already trusted
 * enough to be passed to dangerouslySetInnerHTML by every caller.
 */
export function demoteHeadings(html: string): string {
  return html.replace(/<(\/?)h[12]\b([^>]*)>/gi, '<$1h3$2>')
}
