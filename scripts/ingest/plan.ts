import type { AdminClient } from './admin-client.ts'
import type { Catalogue, CatalogueProduct } from '../../src/lib/catalogue/schema.ts'

/**
 * Building the plan.
 *
 * Idempotency is keyed on SKU, not on handle or title. Re-running a plan
 * against the same catalogue produces the same result and never creates a
 * duplicate: a product whose first variant's SKU already exists in the store
 * is an update, everything else is a create.
 *
 * Nothing in this file writes. It produces a diff, which is what the dry run
 * prints. Writing is apply.ts, and it takes a plan rather than a catalogue,
 * so what you approved is exactly what runs.
 */

export type ProductAction = 'create' | 'update' | 'skip'

export type FieldChange = { field: string; from: string; to: string }

export type ProductPlan = {
  handle: string
  sku: string
  title: string
  action: ProductAction
  /** Shopify product GID, set when the SKU already exists. */
  existingProductId: string | null
  changes: FieldChange[]
  reason?: string
}

export type IngestPlan = {
  source: string
  products: ProductPlan[]
  counts: Record<ProductAction, number>
}

const FIND_BY_SKU = /* GraphQL */ `
  query FindBySku($query: String!) {
    productVariants(first: 5, query: $query) {
      nodes {
        id
        sku
        price
        product {
          id
          handle
          title
          productType
          vendor
          status
          tags
          descriptionHtml
        }
      }
    }
  }
`

type ExistingVariant = {
  id: string
  sku: string
  price: string
  product: {
    id: string
    handle: string
    title: string
    productType: string
    vendor: string
    status: string
    tags: string[]
    descriptionHtml: string
  }
}

export async function buildPlan(
  client: AdminClient | null,
  catalogue: Catalogue,
): Promise<IngestPlan> {
  const products: ProductPlan[] = []

  for (const product of catalogue.products) {
    const sku = product.variants[0]?.sku ?? ''
    if (!sku) {
      products.push({
        handle: product.handle,
        sku: '',
        title: product.title,
        action: 'skip',
        existingProductId: null,
        changes: [],
        reason: 'No SKU on the first variant, so there is no idempotency key.',
      })
      continue
    }

    // With no client we are planning offline, which is what the dry run does
    // when it is only checking the input file. Everything reads as a create.
    if (!client) {
      products.push({
        handle: product.handle,
        sku,
        title: product.title,
        action: 'create',
        existingProductId: null,
        changes: [{ field: '*', from: '(not in store)', to: 'new product' }],
      })
      continue
    }

    const existing = await findBySku(client, sku)

    if (!existing) {
      products.push({
        handle: product.handle,
        sku,
        title: product.title,
        action: 'create',
        existingProductId: null,
        changes: [{ field: '*', from: '(not in store)', to: 'new product' }],
      })
      continue
    }

    const changes = diff(product, existing)
    products.push({
      handle: product.handle,
      sku,
      title: product.title,
      action: changes.length ? 'update' : 'skip',
      existingProductId: existing.product.id,
      changes,
      reason: changes.length ? undefined : 'Already matches the store.',
    })
  }

  const counts: Record<ProductAction, number> = { create: 0, update: 0, skip: 0 }
  for (const plan of products) counts[plan.action] += 1

  return { source: catalogue.source, products, counts }
}

async function findBySku(client: AdminClient, sku: string): Promise<ExistingVariant | null> {
  const data = await client.request<{ productVariants: { nodes: ExistingVariant[] } }>(
    FIND_BY_SKU,
    { query: `sku:'${sku}'` },
    20,
  )
  // Shopify's variant search is a prefix match on some fields, so the exact
  // SKU is confirmed here rather than trusted from the query.
  return data.productVariants.nodes.find((node) => node.sku === sku) ?? null
}

function diff(product: CatalogueProduct, existing: ExistingVariant): FieldChange[] {
  const changes: FieldChange[] = []
  const push = (field: string, from: string, to: string) => {
    if (from !== to) changes.push({ field, from, to })
  }

  push('handle', existing.product.handle, product.handle)
  push('title', existing.product.title, product.title)
  push('productType', existing.product.productType, product.productType)
  push('vendor', existing.product.vendor, product.vendor)
  push('price', Number(existing.price).toFixed(2), Number(product.variants[0]?.price ?? 0).toFixed(2))

  const existingTags = [...existing.product.tags].sort().join(', ')
  const newTags = [...product.tags].sort().join(', ')
  push('tags', existingTags, newTags)

  // Description comparison is on the rendered text, so whitespace and
  // attribute reordering by Shopify do not read as a change on every run.
  push('descriptionHtml', normalise(existing.product.descriptionHtml), normalise(product.descriptionHtml))

  // Metafields always count as a change: reading every metafield back to
  // compare would triple the cost of a plan, and writing them is idempotent
  // anyway.
  if (product.hamper) changes.push({ field: 'hamper.*', from: '(not compared)', to: 'rewritten' })
  if (product.wine) changes.push({ field: 'wine.*', from: '(not compared)', to: 'rewritten' })

  return changes
}

function normalise(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
