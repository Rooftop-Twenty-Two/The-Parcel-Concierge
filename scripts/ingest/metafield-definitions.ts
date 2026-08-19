import type { AdminClient } from './admin-client.ts'

/**
 * Metafield definitions.
 *
 * Created before any product is written, because a metafield written
 * without a definition is untyped, invisible in the Shopify admin and not
 * exposed to the Storefront API. Every definition below sets
 * `access.storefront: PUBLIC_READ` so the front end can actually query it.
 *
 * These mirror docs/metafields.md and src/lib/commerce/types.ts. Changing
 * one means changing all three.
 */

export type MetafieldDefinition = {
  namespace: string
  key: string
  name: string
  description: string
  type: string
  ownerType: 'PRODUCT'
}

export const METAFIELD_DEFINITIONS: readonly MetafieldDefinition[] = [
  // --- hamper.* ---------------------------------------------------------
  {
    namespace: 'hamper',
    key: 'contents',
    name: 'Contents',
    description:
      'What is in the box. JSON array of { name, producer, size }. Renders as the "What is inside" list.',
    type: 'json',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'producers',
    name: 'Producers',
    description: 'CMS maker-profile slugs for the makers in this hamper.',
    type: 'list.single_line_text_field',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'allergens',
    name: 'Allergens',
    description: 'Mandatory. Ingest refuses to publish a hamper with this empty.',
    type: 'multi_line_text_field',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'contains_alcohol',
    name: 'Contains alcohol',
    description: 'Drives the age gate and the alcohol delivery rules.',
    type: 'boolean',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'packaging',
    name: 'Packaging',
    description: 'What the box looks like when it arrives. This is what shoppers are paying for.',
    type: 'multi_line_text_field',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'personalisation',
    name: 'Personalisation options',
    description: 'JSON array of personalisation options offered on this hamper.',
    type: 'json',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'dimensions_weight',
    name: 'Dimensions and weight',
    description: 'Drives shipping and answers the "will it fit" question.',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'lead_time',
    name: 'Lead time',
    description: 'For hampers packed to order. Shown on the product page and in the cart.',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'occasion_tags',
    name: 'Occasion tags',
    description: 'Mirrors the occasion: product tags. Must be in the locked taxonomy.',
    type: 'list.single_line_text_field',
    ownerType: 'PRODUCT',
  },
  {
    namespace: 'hamper',
    key: 'recipient_tags',
    name: 'Recipient tags',
    description: 'Mirrors the recipient: product tags. Must be in the locked taxonomy.',
    type: 'list.single_line_text_field',
    ownerType: 'PRODUCT',
  },

  // --- wine.* -----------------------------------------------------------
  { namespace: 'wine', key: 'producer', name: 'Producer', description: 'Estate, bodega or distillery.', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'region', name: 'Region', description: 'Wine region. A filter on /wine, not a route.', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'country', name: 'Country', description: 'Country of origin. A filter on /wine.', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'grape', name: 'Grape', description: 'Grape varieties. A filter on /wine, never fifty separate collections.', type: 'list.single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'vintage', name: 'Vintage', description: 'Year, or blank for non-vintage.', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'abv', name: 'ABV', description: 'Alcohol by volume, as a percentage.', type: 'number_decimal', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'volume', name: 'Bottle size', description: 'For example 75cl.', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'style_body', name: 'Style: body', description: 'light, medium or full.', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'style_sweetness', name: 'Style: sweetness', description: 'dry, off-dry or sweet.', type: 'single_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'tasting_note', name: 'Tasting note', description: 'In language a gift buyer understands, not a sommelier.', type: 'multi_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'food_pairing', name: 'Food pairing', description: 'What to drink it with.', type: 'multi_line_text_field', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'awards', name: 'Awards', description: 'Verified awards only.', type: 'list.single_line_text_field', ownerType: 'PRODUCT' },
  {
    namespace: 'wine',
    key: 'is_exclusive_import',
    name: 'Exclusive import',
    description: 'True where we are the only Irish stockist. Drives /wine/exclusive-to-us.',
    type: 'boolean',
    ownerType: 'PRODUCT',
  },
  { namespace: 'wine', key: 'is_alcohol_free', name: 'Alcohol free', description: 'True for the de-alcoholised range. Suppresses the age gate.', type: 'boolean', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'organic', name: 'Organic', description: 'Certified organic.', type: 'boolean', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'biodynamic', name: 'Biodynamic', description: 'Certified biodynamic.', type: 'boolean', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'fine_wine', name: 'Fine wine', description: 'Part of the fine wine list.', type: 'boolean', ownerType: 'PRODUCT' },
  { namespace: 'wine', key: 'gift_set', name: 'Gift set', description: 'Sold as a boxed multi-bottle set.', type: 'boolean', ownerType: 'PRODUCT' },
  {
    namespace: 'wine',
    key: 'rrp_comparison',
    name: 'Price comparison',
    description:
      'Only where we hold dated, verified evidence. Never names a competitor or a competitor price.',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
  },
]

const CREATE_DEFINITION = /* GraphQL */ `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const LIST_DEFINITIONS = /* GraphQL */ `
  query MetafieldDefinitions($namespace: String!, $after: String) {
    metafieldDefinitions(ownerType: PRODUCT, namespace: $namespace, first: 250, after: $after) {
      nodes {
        namespace
        key
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export type DefinitionPlan = {
  definition: MetafieldDefinition
  action: 'create' | 'exists'
}

export async function planDefinitions(client: AdminClient): Promise<DefinitionPlan[]> {
  const existing = new Set<string>()

  for (const namespace of ['hamper', 'wine']) {
    let after: string | null = null
    do {
      const data: {
        metafieldDefinitions: {
          nodes: { namespace: string; key: string }[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      } = await client.request(LIST_DEFINITIONS, { namespace, after }, 20)
      for (const node of data.metafieldDefinitions.nodes) {
        existing.add(`${node.namespace}.${node.key}`)
      }
      after = data.metafieldDefinitions.pageInfo.hasNextPage
        ? data.metafieldDefinitions.pageInfo.endCursor
        : null
    } while (after)
  }

  return METAFIELD_DEFINITIONS.map((definition) => ({
    definition,
    action: existing.has(`${definition.namespace}.${definition.key}`) ? 'exists' : 'create',
  }))
}

export async function applyDefinitions(
  client: AdminClient,
  plans: DefinitionPlan[],
  log: (message: string) => void,
): Promise<void> {
  for (const plan of plans) {
    if (plan.action === 'exists') continue

    const data = await client.request<{
      metafieldDefinitionCreate: {
        createdDefinition: { id: string } | null
        userErrors: { field: string[]; message: string; code: string }[]
      }
    }>(
      CREATE_DEFINITION,
      {
        definition: {
          namespace: plan.definition.namespace,
          key: plan.definition.key,
          name: plan.definition.name,
          description: plan.definition.description,
          type: plan.definition.type,
          ownerType: plan.definition.ownerType,
          // Without this the front end cannot read the metafield at all.
          access: { storefront: 'PUBLIC_READ' },
        },
      },
      20,
    )

    const errors = data.metafieldDefinitionCreate.userErrors
    if (errors.length) {
      // TAKEN means somebody created it in the admin in the meantime, which
      // is fine and not worth failing a run over.
      if (errors.every((e) => e.code === 'TAKEN')) {
        log(`  exists  ${plan.definition.namespace}.${plan.definition.key}`)
        continue
      }
      throw new Error(
        `Could not create ${plan.definition.namespace}.${plan.definition.key}: ${errors.map((e) => e.message).join('; ')}`,
      )
    }

    log(`  created ${plan.definition.namespace}.${plan.definition.key}`)
  }
}
