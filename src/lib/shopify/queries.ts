/**
 * Storefront GraphQL documents.
 *
 * Rule: query only the fields a component renders. There is no "fetch the
 * whole product" fragment in here, because the moment one exists every
 * listing page starts paying for metafields it never shows.
 *
 * Metafield identifiers are listed explicitly so an unexpected metafield
 * cannot silently change a page.
 */

const IMAGE_FIELDS = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`

/** The minimum a product card needs. Nothing more. */
export const PRODUCT_CARD_FRAGMENT = /* GraphQL */ `
  ${IMAGE_FIELDS}
  fragment ProductCard on Product {
    id
    handle
    title
    productType
    tags
    # The live store carries no type:* tags; native collection membership is
    # what the front end reads instead. See kindFromMembership in normalise.ts.
    collections(first: 20) {
      nodes {
        handle
      }
    }
    availableForSale
    featuredImage {
      ...ImageFields
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    # Enough variants to find the first buyable one, so a card can add
    # straight to the cart. Shopify product and variant ids are unrelated,
    # so this cannot be derived client side.
    variants(first: 10) {
      nodes {
        id
        availableForSale
        price {
          amount
          currencyCode
        }
      }
    }
  }
`

const HAMPER_METAFIELDS = /* GraphQL */ `
  hamperContents: metafield(namespace: "hamper", key: "contents") {
    value
  }
  hamperProducers: metafield(namespace: "hamper", key: "producers") {
    value
  }
  hamperAllergens: metafield(namespace: "hamper", key: "allergens") {
    value
  }
  hamperContainsAlcohol: metafield(namespace: "hamper", key: "contains_alcohol") {
    value
  }
  hamperPackaging: metafield(namespace: "hamper", key: "packaging") {
    value
  }
  hamperPersonalisation: metafield(namespace: "hamper", key: "personalisation") {
    value
  }
  hamperDimensionsWeight: metafield(namespace: "hamper", key: "dimensions_weight") {
    value
  }
  hamperLeadTime: metafield(namespace: "hamper", key: "lead_time") {
    value
  }
  hamperOccasionTags: metafield(namespace: "hamper", key: "occasion_tags") {
    value
  }
  hamperRecipientTags: metafield(namespace: "hamper", key: "recipient_tags") {
    value
  }
`

const WINE_METAFIELDS = /* GraphQL */ `
  wineProducer: metafield(namespace: "wine", key: "producer") {
    value
  }
  wineRegion: metafield(namespace: "wine", key: "region") {
    value
  }
  wineCountry: metafield(namespace: "wine", key: "country") {
    value
  }
  wineGrape: metafield(namespace: "wine", key: "grape") {
    value
  }
  wineVintage: metafield(namespace: "wine", key: "vintage") {
    value
  }
  wineAbv: metafield(namespace: "wine", key: "abv") {
    value
  }
  wineVolume: metafield(namespace: "wine", key: "volume") {
    value
  }
  wineStyleBody: metafield(namespace: "wine", key: "style_body") {
    value
  }
  wineStyleSweetness: metafield(namespace: "wine", key: "style_sweetness") {
    value
  }
  wineTastingNote: metafield(namespace: "wine", key: "tasting_note") {
    value
  }
  wineFoodPairing: metafield(namespace: "wine", key: "food_pairing") {
    value
  }
  wineAwards: metafield(namespace: "wine", key: "awards") {
    value
  }
  wineIsExclusiveImport: metafield(namespace: "wine", key: "is_exclusive_import") {
    value
  }
  wineRrpComparison: metafield(namespace: "wine", key: "rrp_comparison") {
    value
  }
  wineIsAlcoholFree: metafield(namespace: "wine", key: "is_alcohol_free") {
    value
  }
  wineOrganic: metafield(namespace: "wine", key: "organic") {
    value
  }
  wineBiodynamic: metafield(namespace: "wine", key: "biodynamic") {
    value
  }
  wineFineWine: metafield(namespace: "wine", key: "fine_wine") {
    value
  }
  wineGiftSet: metafield(namespace: "wine", key: "gift_set") {
    value
  }
`

export const PRODUCT_BY_HANDLE = /* GraphQL */ `
  ${IMAGE_FIELDS}
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      descriptionHtml
      productType
      tags
      collections(first: 20) {
        nodes {
          handle
        }
      }
      availableForSale
      updatedAt
      images(first: 10) {
        nodes {
          ...ImageFields
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 25) {
        nodes {
          id
          sku
          title
          availableForSale
          quantityAvailable
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
        }
      }
      ${HAMPER_METAFIELDS}
      ${WINE_METAFIELDS}
    }
  }
`

export const PRODUCTS_BY_QUERY = /* GraphQL */ `
  ${PRODUCT_CARD_FRAGMENT}
  query Products($query: String!, $first: Int!, $after: String, $sortKey: ProductSortKeys!, $reverse: Boolean!) {
    products(query: $query, first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

/**
 * Curated listings fetch by handle. The Storefront API has no
 * products-by-handles field, so this is a handle: OR query and the caller
 * restores the CMS ordering afterwards. Shopify's relevance order is not the
 * editorial order and must not be allowed to win.
 */
export const PRODUCTS_BY_HANDLES = /* GraphQL */ `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductsByHandles($query: String!, $first: Int!) {
    products(query: $query, first: $first) {
      nodes {
        ...ProductCard
      }
    }
  }
`

/**
 * One product card by handle. Used to fetch curated-by-handle lists one
 * product at a time, because on this store products(query:"handle:'x'") is
 * unindexed and returns a relevance fallback rather than the named product.
 */
export const PRODUCT_CARD_BY_HANDLE = /* GraphQL */ `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductCardByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductCard
    }
  }
`

/**
 * Products in a native Shopify collection. This is how the live store's real
 * taxonomy is read: every listing points at a collection handle rather than
 * at the type: and occasion: tags the store does not carry.
 *
 * collection.products has no free-text query arg, so price and stock are
 * expressed as Storefront `filters` and hidden handles are removed in code.
 */
export const PRODUCTS_BY_COLLECTION = /* GraphQL */ `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductsInCollection(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean!
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      products(
        first: $first
        after: $after
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`

/**
 * Live availability and price for the exact variants in play.
 *
 * Called uncached at add-to-cart and again at checkout handoff. A cached
 * listing page must never be the thing that sells something that is gone,
 * and hampers make that a real risk because their components sell out.
 */
export const VARIANT_AVAILABILITY = /* GraphQL */ `
  query VariantAvailability($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        quantityAvailable
        price {
          amount
          currencyCode
        }
        product {
          handle
          title
        }
      }
    }
  }
`

const CART_FIELDS = /* GraphQL */ `
  ${IMAGE_FIELDS}
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        attributes {
          key
          value
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          amountPerQuantity {
            amount
            currencyCode
          }
        }
        sellingPlanAllocation {
          sellingPlan {
            id
            name
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            image {
              ...ImageFields
            }
            product {
              handle
              title
              tags
              collections(first: 10) {
                nodes {
                  handle
                }
              }
            }
          }
        }
      }
    }
  }
`

export const CART_CREATE = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartCreate($lines: [CartLineInput!], $attributes: [AttributeInput!]) {
    cartCreate(input: { lines: $lines, attributes: $attributes }) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`

export const CART_QUERY = /* GraphQL */ `
  ${CART_FIELDS}
  query Cart($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }
`

export const CART_LINES_ADD = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`

export const CART_LINES_UPDATE = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`

export const CART_LINES_REMOVE = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`

export const CART_ATTRIBUTES_UPDATE = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`
