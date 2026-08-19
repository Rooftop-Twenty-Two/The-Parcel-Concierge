/**
 * Shopify credentials and the fixture switch.
 *
 * The Storefront token is public-scoped and read-only, so it may reach the
 * client. The Admin token is server-only and is deliberately not read
 * anywhere under src/: it belongs to the ingest tool in scripts/ingest.
 *
 * When no Storefront credentials are present the front end falls back to the
 * fixture catalogue in data/catalogue. That keeps the whole site runnable
 * before the client supplies API access (outstanding item 8), and keeps the
 * commerce layer honest, because every component goes through the same
 * interface either way.
 */

export const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? ''
export const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN ?? ''
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07'

export const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? ''

export function hasStorefrontCredentials(): boolean {
  return Boolean(SHOPIFY_STORE_DOMAIN && SHOPIFY_STOREFRONT_TOKEN)
}

export function storefrontEndpoint(): string {
  return `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`
}

/**
 * Metafield namespaces, matching docs/metafields.md and the definitions the
 * ingest tool creates.
 */
export const METAFIELD_NAMESPACES = { hamper: 'hamper', wine: 'wine' } as const
