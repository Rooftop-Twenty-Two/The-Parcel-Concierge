import type { AdminClient } from './admin-client.ts'
import type { IngestPlan, ProductPlan } from './plan.ts'
import type { Catalogue, CatalogueProduct } from '../../src/lib/catalogue/schema.ts'

/**
 * Writing.
 *
 * Takes a plan rather than a catalogue, so what was approved in the dry run
 * is exactly what runs. Every write is recorded for the run report, whether
 * it succeeded or not, because a partial run needs to be auditable and
 * reversible.
 */

export type WriteRecord = {
  handle: string
  sku: string
  action: ProductPlan['action']
  status: 'ok' | 'failed'
  productId: string | null
  message: string
  /**
   * Enough to undo the write by hand: for an update, the fields that
   * changed; for a create, the id that now needs deleting.
   */
  rollbackHint: string
}

const PRODUCT_SET = /* GraphQL */ `
  mutation ProductSet($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`

export async function applyPlan(
  client: AdminClient,
  plan: IngestPlan,
  catalogue: Catalogue,
  log: (message: string) => void,
): Promise<WriteRecord[]> {
  const byHandle = new Map(catalogue.products.map((p) => [p.handle, p]))
  const records: WriteRecord[] = []

  for (const item of plan.products) {
    if (item.action === 'skip') {
      records.push({
        handle: item.handle,
        sku: item.sku,
        action: 'skip',
        status: 'ok',
        productId: item.existingProductId,
        message: item.reason ?? 'Skipped.',
        rollbackHint: 'nothing written',
      })
      continue
    }

    const product = byHandle.get(item.handle)
    if (!product) {
      records.push({
        handle: item.handle,
        sku: item.sku,
        action: item.action,
        status: 'failed',
        productId: null,
        message: 'Product is in the plan but not in the catalogue file. Rebuild the plan.',
        rollbackHint: 'nothing written',
      })
      continue
    }

    try {
      const input = toProductSetInput(product, item.existingProductId)
      const data = await client.request<{
        productSet: {
          product: { id: string; handle: string } | null
          userErrors: { field: string[]; message: string }[]
        }
      }>(PRODUCT_SET, { input }, 100)

      const errors = data.productSet.userErrors
      if (errors.length) {
        records.push({
          handle: item.handle,
          sku: item.sku,
          action: item.action,
          status: 'failed',
          productId: item.existingProductId,
          message: errors.map((e) => `${e.field?.join('.') ?? ''} ${e.message}`.trim()).join('; '),
          rollbackHint: 'nothing written',
        })
        log(`  FAILED  ${item.handle}`)
        continue
      }

      const id = data.productSet.product?.id ?? null
      records.push({
        handle: item.handle,
        sku: item.sku,
        action: item.action,
        status: 'ok',
        productId: id,
        message: item.changes.map((c) => c.field).join(', '),
        rollbackHint:
          item.action === 'create'
            ? `delete product ${id}`
            : `previous values: ${item.changes.map((c) => `${c.field}="${c.from}"`).join('; ')}`,
      })
      log(`  ${item.action === 'create' ? 'created' : 'updated'} ${item.handle}`)
    } catch (error) {
      records.push({
        handle: item.handle,
        sku: item.sku,
        action: item.action,
        status: 'failed',
        productId: item.existingProductId,
        message: error instanceof Error ? error.message : String(error),
        rollbackHint: 'nothing written',
      })
      log(`  FAILED  ${item.handle}`)
    }
  }

  return records
}

/**
 * Maps the interchange format onto Shopify's ProductSetInput.
 *
 * Products are created as DRAFT. Nothing goes live automatically: brief
 * section 9 says nothing is unpublished until its redirect row exists and
 * is tested, and the same caution applies in the other direction. Publishing
 * is a deliberate step in the Shopify admin.
 */
function toProductSetInput(product: CatalogueProduct, existingId: string | null) {
  const metafields: { namespace: string; key: string; type: string; value: string }[] = []

  if (product.hamper) {
    const h = product.hamper
    metafields.push(
      { namespace: 'hamper', key: 'contents', type: 'json', value: JSON.stringify(h.contents) },
      { namespace: 'hamper', key: 'allergens', type: 'multi_line_text_field', value: h.allergens },
      { namespace: 'hamper', key: 'contains_alcohol', type: 'boolean', value: String(h.containsAlcohol) },
    )
    if (h.producers?.length) {
      metafields.push({
        namespace: 'hamper',
        key: 'producers',
        type: 'list.single_line_text_field',
        value: JSON.stringify(h.producers),
      })
    }
    if (h.packaging) {
      metafields.push({ namespace: 'hamper', key: 'packaging', type: 'multi_line_text_field', value: h.packaging })
    }
    if (h.personalisation?.length) {
      metafields.push({ namespace: 'hamper', key: 'personalisation', type: 'json', value: JSON.stringify(h.personalisation) })
    }
    if (h.dimensionsWeight) {
      metafields.push({ namespace: 'hamper', key: 'dimensions_weight', type: 'single_line_text_field', value: h.dimensionsWeight })
    }
    if (h.leadTime) {
      metafields.push({ namespace: 'hamper', key: 'lead_time', type: 'single_line_text_field', value: h.leadTime })
    }
    if (h.occasionTags?.length) {
      metafields.push({ namespace: 'hamper', key: 'occasion_tags', type: 'list.single_line_text_field', value: JSON.stringify(h.occasionTags) })
    }
    if (h.recipientTags?.length) {
      metafields.push({ namespace: 'hamper', key: 'recipient_tags', type: 'list.single_line_text_field', value: JSON.stringify(h.recipientTags) })
    }
  }

  if (product.wine) {
    const w = product.wine
    const text = (key: string, value: string | undefined) => {
      if (value) metafields.push({ namespace: 'wine', key, type: 'single_line_text_field', value })
    }
    text('producer', w.producer)
    text('region', w.region)
    text('country', w.country)
    text('vintage', w.vintage)
    text('volume', w.volume)
    text('style_body', w.styleBody)
    text('style_sweetness', w.styleSweetness)
    text('rrp_comparison', w.rrpComparison)

    if (w.grape?.length) {
      metafields.push({ namespace: 'wine', key: 'grape', type: 'list.single_line_text_field', value: JSON.stringify(w.grape) })
    }
    if (w.awards?.length) {
      metafields.push({ namespace: 'wine', key: 'awards', type: 'list.single_line_text_field', value: JSON.stringify(w.awards) })
    }
    if (w.abv !== undefined) {
      metafields.push({ namespace: 'wine', key: 'abv', type: 'number_decimal', value: String(w.abv) })
    }
    if (w.tastingNote) {
      metafields.push({ namespace: 'wine', key: 'tasting_note', type: 'multi_line_text_field', value: w.tastingNote })
    }
    if (w.foodPairing) {
      metafields.push({ namespace: 'wine', key: 'food_pairing', type: 'multi_line_text_field', value: w.foodPairing })
    }
    metafields.push({
      namespace: 'wine',
      key: 'is_exclusive_import',
      type: 'boolean',
      value: String(w.isExclusiveImport ?? false),
    })
    for (const [key, value] of [
      ['is_alcohol_free', w.isAlcoholFree],
      ['organic', w.organic],
      ['biodynamic', w.biodynamic],
      ['fine_wine', w.fineWine],
      ['gift_set', w.giftSet],
    ] as const) {
      if (value !== undefined) {
        metafields.push({ namespace: 'wine', key, type: 'boolean', value: String(value) })
      }
    }
  }

  return {
    ...(existingId ? { id: existingId } : {}),
    handle: product.handle,
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags,
    status: 'DRAFT',
    files: product.images.map((image) => ({
      originalSource: image.src,
      alt: image.alt,
      contentType: 'IMAGE',
    })),
    productOptions: buildOptions(product),
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      price: variant.price,
      ...(variant.compareAtPrice ? { compareAtPrice: variant.compareAtPrice } : {}),
      optionValues: (variant.options ?? [{ name: 'Title', value: variant.title }]).map((o) => ({
        optionName: o.name,
        name: o.value,
      })),
      inventoryItem: { tracked: variant.inventoryQuantity !== null },
    })),
    metafields,
  }
}

function buildOptions(product: CatalogueProduct) {
  const first = product.variants[0]
  if (!first?.options?.length) {
    return [{ name: 'Title', values: product.variants.map((v) => ({ name: v.title })) }]
  }
  return first.options.map((option, index) => ({
    name: option.name,
    values: product.variants.map((v) => ({ name: v.options?.[index]?.value ?? v.title })),
  }))
}
