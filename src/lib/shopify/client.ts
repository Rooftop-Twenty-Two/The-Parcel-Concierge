import 'server-only'

import {
  SHOPIFY_STOREFRONT_TOKEN,
  hasStorefrontCredentials,
  storefrontEndpoint,
} from './env'

export class ShopifyError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message)
    this.name = 'ShopifyError'
  }
}

type StorefrontOptions = {
  query: string
  variables?: Record<string, unknown>
  /** Cache tags. Omit for uncached requests, e.g. live stock checks. */
  tags?: string[]
  /** Seconds. Pass 0 to opt out of the data cache entirely. */
  revalidate?: number | false
  /** Forwarded buyer IP improves Shopify's rate limiting and fraud signals. */
  buyerIp?: string
}

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string; extensions?: Record<string, unknown> }[]
}

const MAX_ATTEMPTS = 3

/**
 * Storefront API fetch.
 *
 * Read-only, cached by default with explicit tags. Throttled responses are
 * retried with backoff, because the Storefront API is cost-based and a burst
 * of listing queries at build time will hit it.
 */
export async function storefront<T>(options: StorefrontOptions): Promise<T> {
  if (!hasStorefrontCredentials()) {
    throw new ShopifyError('Storefront credentials are not configured')
  }

  const { query, variables, tags, revalidate, buyerIp } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response
    try {
      response = await fetch(storefrontEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
          ...(buyerIp ? { 'Shopify-Storefront-Buyer-IP': buyerIp } : {}),
        },
        body: JSON.stringify({ query, variables }),
        next:
          revalidate === false
            ? undefined
            : { revalidate: revalidate ?? 3600, tags: tags ?? [] },
        ...(revalidate === false ? { cache: 'no-store' as const } : {}),
      })
    } catch (error) {
      lastError = error
      if (attempt === MAX_ATTEMPTS) break
      await backoff(attempt)
      continue
    }

    // 430 is Shopify's "shop is throttled" signal, 429 the standard one.
    if (response.status === 429 || response.status === 430 || response.status >= 500) {
      lastError = new ShopifyError(`Storefront API responded ${response.status}`)
      if (attempt === MAX_ATTEMPTS) break
      await backoff(attempt, response.headers.get('Retry-After'))
      continue
    }

    if (!response.ok) {
      throw new ShopifyError(`Storefront API responded ${response.status}`, await response.text())
    }

    const body = (await response.json()) as GraphQLResponse<T>

    if (body.errors?.length) {
      const throttled = body.errors.some((e) => e.extensions?.code === 'THROTTLED')
      if (throttled && attempt < MAX_ATTEMPTS) {
        await backoff(attempt)
        continue
      }
      throw new ShopifyError(body.errors.map((e) => e.message).join('; '), body.errors)
    }

    if (!body.data) throw new ShopifyError('Storefront API returned no data')
    return body.data
  }

  throw new ShopifyError('Storefront API request failed after retries', lastError)
}

function backoff(attempt: number, retryAfter?: string | null): Promise<void> {
  const headerDelay = retryAfter ? Number(retryAfter) * 1000 : NaN
  const delay = Number.isFinite(headerDelay) ? headerDelay : 2 ** attempt * 250
  return new Promise((resolve) => setTimeout(resolve, delay))
}
