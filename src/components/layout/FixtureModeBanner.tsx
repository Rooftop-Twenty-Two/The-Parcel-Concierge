/**
 * Fixture mode banner.
 *
 * Shown whenever the site is running on the fixture catalogue rather than a
 * real Shopify store. A site serving invented products must never look like
 * a shop that is open, so this is deliberately loud, and the layout also
 * sets noindex while it is showing.
 */
export function FixtureModeBanner() {
  return (
    <div className="bg-red px-4 py-2 text-center text-sm text-cream">
      <strong className="font-semibold">Preview build.</strong> No Shopify store is connected, so
      the products, prices and stock on this site are sample data and nothing can be bought. Set{' '}
      <code className="font-mono text-[13px]">SHOPIFY_STORE_DOMAIN</code> and{' '}
      <code className="font-mono text-[13px]">SHOPIFY_STOREFRONT_TOKEN</code> to connect the real
      catalogue.
    </div>
  )
}
