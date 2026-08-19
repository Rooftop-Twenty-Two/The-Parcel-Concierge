import { COLLECTIONS } from '../../src/lib/commerce/collections.ts'
import { findUnknownTags, PRICE_BANDS } from '../../src/lib/commerce/taxonomy.ts'
import type { Catalogue, CatalogueProduct } from '../../src/lib/catalogue/schema.ts'

/**
 * Validation, run before anything is written to Shopify.
 *
 * The rule the brief is explicit about: do not ingest a product with empty
 * allergen, contents or image data. That is enforced here, and there is no
 * flag to skip it. If we do not know the allergens, the product does not
 * get published, and the copy says nothing about allergens rather than
 * inventing something.
 *
 * Validation reports every problem in a run rather than stopping at the
 * first, so a catalogue export can be fixed in one pass.
 */

export type Severity = 'error' | 'warning'

export type Issue = {
  severity: Severity
  handle: string
  field: string
  message: string
}

const BANNED_WORDS = [
  'robust',
  'tailored',
  'seamless',
  'leverage',
  'elevate',
  'holistic',
  'journey',
  'game-changer',
  'curated',
  'indulge',
  'treat yourself',
  'perfect for',
  'luxurious',
]

/** Collection slugs a product handle must never collide with. */
const RESERVED_HANDLES = new Set(COLLECTIONS.map((c) => c.slug))

export function validateCatalogue(catalogue: Catalogue): Issue[] {
  const issues: Issue[] = []
  const seenHandles = new Map<string, number>()
  const seenSkus = new Map<string, string>()

  for (const product of catalogue.products) {
    issues.push(...validateProduct(product))

    seenHandles.set(product.handle, (seenHandles.get(product.handle) ?? 0) + 1)

    for (const variant of product.variants) {
      const existing = seenSkus.get(variant.sku)
      if (existing && existing !== product.handle) {
        issues.push({
          severity: 'error',
          handle: product.handle,
          field: 'variants.sku',
          message: `SKU ${variant.sku} is also used by ${existing}. SKU is the ingest key, so it has to be unique.`,
        })
      }
      seenSkus.set(variant.sku, product.handle)
    }
  }

  for (const [handle, count] of seenHandles) {
    if (count > 1) {
      issues.push({
        severity: 'error',
        handle,
        field: 'handle',
        message: `Handle appears ${count} times in the input file.`,
      })
    }
  }

  return issues
}

export function validateProduct(product: CatalogueProduct): Issue[] {
  const issues: Issue[] = []
  const error = (field: string, message: string) =>
    issues.push({ severity: 'error', handle: product.handle, field, message })
  const warn = (field: string, message: string) =>
    issues.push({ severity: 'warning', handle: product.handle, field, message })

  // --- Identity -----------------------------------------------------------

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(product.handle)) {
    error('handle', 'Handle must be lowercase words separated by single hyphens.')
  }

  // A product handle that matches a collection slug would be permanently
  // unreachable: the route resolver checks collections first, by design.
  if (RESERVED_HANDLES.has(product.handle)) {
    error(
      'handle',
      `Handle collides with the listing route /${product.handle}. The listing wins, so this product would be unreachable. Rename it.`,
    )
  }

  if (!product.title.trim()) error('title', 'Title is empty.')
  if (!product.productType.trim()) error('productType', 'Product type is empty.')

  // --- Tags ---------------------------------------------------------------

  const unknown = findUnknownTags(product.tags)
  if (unknown.length) {
    error('tags', `Not in the locked taxonomy: ${unknown.join(', ')}. No free tagging.`)
  }

  const typeTags = product.tags.filter((t) => t.startsWith('type:'))
  if (typeTags.length !== 1) {
    error('tags', `Needs exactly one type: tag, found ${typeTags.length}.`)
  }

  const priceTags = product.tags.filter((t) => t.startsWith('price:'))
  if (priceTags.length !== 1) {
    error('tags', `Needs exactly one price: tag, found ${priceTags.length}.`)
  } else {
    const cheapest = Math.min(...product.variants.map((v) => Math.round(Number(v.price) * 100)))
    const band = PRICE_BANDS.find(
      (b) => cheapest >= b.minMinor && (b.maxMinor === null || cheapest <= b.maxMinor),
    )
    if (band && priceTags[0] !== band.tag) {
      error(
        'tags',
        `Price tag ${priceTags[0]} does not match the price. At ${(cheapest / 100).toFixed(2)} it should be ${band.tag}.`,
      )
    }
  }

  // --- Images -------------------------------------------------------------

  if (!product.images.length) {
    error('images', 'No images. A product with no image does not get published.')
  }

  product.images.forEach((image, index) => {
    if (!image.alt.trim()) {
      error(
        `images[${index}].alt`,
        'Empty alt text. Alt text describes what is in the shot, and it is mandatory.',
      )
    } else if (/^(image|photo|picture|img)[\s_-]*\d*$/i.test(image.alt.trim())) {
      error(`images[${index}].alt`, `Alt text "${image.alt}" describes nothing. Say what is in it.`)
    }
    if (!image.src.trim()) error(`images[${index}].src`, 'Empty image source.')
  })

  const isHamper = product.tags.includes('type:hamper')
  // The builder's parent product has no fixed contents to photograph: what
  // goes in the box is chosen by the shopper.
  const isBuilderParent = product.productType === 'Custom hamper'

  if (isHamper && !isBuilderParent && product.images.length < 4) {
    error(
      'images',
      `Hampers need at least four images: styled, contents flat-lay, packaging and something for scale. Found ${product.images.length}.`,
    )
  }

  // --- Variants -----------------------------------------------------------

  if (!product.variants.length) error('variants', 'No variants.')

  product.variants.forEach((variant, index) => {
    if (!variant.sku.trim()) {
      error(`variants[${index}].sku`, 'Empty SKU. SKU is the ingest key, so it cannot be blank.')
    }
    const price = Number(variant.price)
    if (!Number.isFinite(price) || price <= 0) {
      error(`variants[${index}].price`, `Price "${variant.price}" is not a positive number.`)
    }
    if (variant.compareAtPrice !== undefined) {
      const compare = Number(variant.compareAtPrice)
      if (!Number.isFinite(compare) || compare <= price) {
        error(
          `variants[${index}].compareAtPrice`,
          'Compare-at price must be above the selling price, or absent.',
        )
      }
    }
  })

  // --- Hamper fields ------------------------------------------------------

  if (isHamper) {
    const hamper = product.hamper
    if (!hamper) {
      error('hamper', 'Tagged type:hamper but has no hamper metafields.')
    } else {
      if (!hamper.allergens.trim()) {
        error(
          'hamper.allergens',
          'Allergens are empty. A food gift with unknown allergens does not get published.',
        )
      }
      if (!hamper.contents.length && !isBuilderParent) {
        error('hamper.contents', 'Contents are empty. "What is inside" renders from this.')
      }
      hamper.contents.forEach((line, index) => {
        if (!line.name.trim()) {
          error(`hamper.contents[${index}].name`, 'Content line has no name.')
        }
      })
      if (!hamper.packaging?.trim()) {
        warn(
          'hamper.packaging',
          'No packaging description. This is what shoppers are paying for and it is currently unsaid on the old site.',
        )
      }
      for (const tag of hamper.occasionTags ?? []) {
        if (!product.tags.includes(tag)) {
          warn(
            'hamper.occasion_tags',
            `${tag} is in the metafield but not in the product tags, so the occasion route will not find it.`,
          )
        }
      }
    }
  }

  // --- Wine fields --------------------------------------------------------

  const isDrink = product.tags.includes('type:wine') || product.tags.includes('type:spirit')
  if (isDrink) {
    if (!product.wine) {
      error('wine', 'Tagged as wine or spirit but has no wine metafields.')
    } else {
      if (product.wine.abv === undefined) {
        warn('wine.abv', 'No ABV. It belongs on the page and it may be a labelling requirement.')
      }
      if (product.wine.isExclusiveImport && !product.tags.includes('badge:exclusive')) {
        error(
          'tags',
          'is_exclusive_import is set but badge:exclusive is missing, so it will not appear on /wine/exclusive-to-us.',
        )
      }
      if (product.tags.includes('badge:exclusive') && !product.wine.isExclusiveImport) {
        error('wine.is_exclusive_import', 'badge:exclusive is set but is_exclusive_import is not.')
      }
      if (product.wine.rrpComparison && /€\s*\d/.test(product.wine.rrpComparison)) {
        // Do not quote competitor prices in customer-facing copy: prices
        // move, and a claim that was true last month is a problem now.
        warn(
          'wine.rrp_comparison',
          'Contains a price. Comparative price claims must not name a figure in customer-facing copy.',
        )
      }
    }
  }

  // --- Copy ---------------------------------------------------------------

  issues.push(...validateCopy(product))

  // --- Explicit hold ------------------------------------------------------

  if (product.needsReview) {
    error('needsReview', `Held for review: ${product.needsReview}`)
  }

  return issues
}

export function validateCopy(product: CatalogueProduct): Issue[] {
  const issues: Issue[] = []
  const text = product.descriptionHtml
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  if (!plain) {
    issues.push({
      severity: 'error',
      handle: product.handle,
      field: 'descriptionHtml',
      message: 'No description.',
    })
    return issues
  }

  if (text.includes('—') || text.includes('–')) {
    issues.push({
      severity: 'error',
      handle: product.handle,
      field: 'descriptionHtml',
      message: 'Contains an em dash or en dash. House style uses commas, colons or full stops.',
    })
  }

  const lower = plain.toLowerCase()
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      issues.push({
        severity: 'error',
        handle: product.handle,
        field: 'descriptionHtml',
        message: `Banned word: "${word}".`,
      })
    }
  }

  // Brief section 12: do not write "bestseller" or "most popular" without
  // data behind it, and there is no sales data.
  if (/\b(bestsell\w*|best.sell\w*|most popular|our most loved)\b/i.test(plain)) {
    issues.push({
      severity: 'error',
      handle: product.handle,
      field: 'descriptionHtml',
      message: 'Popularity claim with no sales data behind it.',
    })
  }

  const words = plain.split(/\s+/).length
  const range = wordRange(product)
  if (words < range.min || words > range.max) {
    issues.push({
      severity: 'warning',
      handle: product.handle,
      field: 'descriptionHtml',
      message: `${words} words, outside the ${range.min} to ${range.max} range for this type.`,
    })
  }

  return issues
}

/**
 * Word count ranges for the description body only.
 *
 * The brief's hamper target is 150 to 220 words for the whole rendered
 * description. Most of that is not prose: "What's inside" renders from the
 * contents metafield, and allergens, personalisation and delivery render
 * from their own fields. What is left for the body is the opening line, the
 * story and the presentation paragraph, which lands around 50 to 140 words.
 *
 * Measuring the body against the whole-page target would flag every
 * correctly written description, so these ranges cover the body and the
 * page hits the brief's target once the metafield blocks render.
 */
function wordRange(product: CatalogueProduct): { min: number; max: number } {
  if (product.productType === 'Custom hamper') return { min: 20, max: 140 }
  if (product.tags.includes('type:hamper')) return { min: 50, max: 140 }
  if (product.tags.includes('type:addon')) return { min: 30, max: 70 }
  return { min: 45, max: 160 }
}

export function summarise(issues: Issue[]): { errors: number; warnings: number } {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
  }
}
