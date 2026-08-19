/**
 * Shopify Admin GraphQL client.
 *
 * The Admin token is server-side only and lives nowhere near the front end
 * bundle: nothing under src/ reads it.
 *
 * Admin GraphQL is cost-based rather than request-based. Every response
 * carries the query's cost and the state of a leaky bucket, so the honest
 * way to stay inside the limit is to read `throttleStatus` and wait for the
 * bucket to refill, rather than sleeping a fixed amount between calls and
 * hoping. That is what this does.
 */

export type AdminClientOptions = {
  storeDomain: string
  accessToken: string
  apiVersion: string
  /** Called with a one-line note whenever the client waits or retries. */
  onNotice?: (message: string) => void
}

type ThrottleStatus = {
  maximumAvailable: number
  currentlyAvailable: number
  restoreRate: number
}

type AdminResponse<T> = {
  data?: T
  errors?: { message: string; extensions?: Record<string, unknown> }[]
  extensions?: { cost?: { requestedQueryCost: number; throttleStatus: ThrottleStatus } }
}

export class AdminApiError extends Error {
  readonly detail?: unknown

  constructor(message: string, detail?: unknown) {
    super(message)
    this.name = 'AdminApiError'
    this.detail = detail
  }
}

const MAX_ATTEMPTS = 5

export class AdminClient {
  private lastThrottle: ThrottleStatus | null = null
  private readonly options: AdminClientOptions

  constructor(options: AdminClientOptions) {
    this.options = options
  }

  private notice(message: string): void {
    this.options.onNotice?.(message)
  }

  /** Waits until the leaky bucket has at least `cost` points available. */
  private async waitForCapacity(cost: number): Promise<void> {
    const status = this.lastThrottle
    if (!status || status.currentlyAvailable >= cost) return

    const deficit = cost - status.currentlyAvailable
    const seconds = deficit / status.restoreRate
    this.notice(
      `Throttle bucket at ${status.currentlyAvailable}/${status.maximumAvailable}. Waiting ${seconds.toFixed(1)}s for ${cost} points.`,
    )
    await sleep(Math.ceil(seconds * 1000) + 100)
    // Assume the bucket refilled as promised. The next response corrects it.
    this.lastThrottle = { ...status, currentlyAvailable: cost }
  }

  async request<T>(query: string, variables?: Record<string, unknown>, estimatedCost = 50): Promise<T> {
    const url = `https://${this.options.storeDomain}/admin/api/${this.options.apiVersion}/graphql.json`

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      await this.waitForCapacity(estimatedCost)

      let response: Response
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.options.accessToken,
          },
          body: JSON.stringify({ query, variables }),
        })
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) throw new AdminApiError('Network error', error)
        const delay = 2 ** attempt * 500
        this.notice(`Network error, retrying in ${delay}ms.`)
        await sleep(delay)
        continue
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt === MAX_ATTEMPTS) {
          throw new AdminApiError(`Admin API responded ${response.status}`, await response.text())
        }
        const retryAfter = Number(response.headers.get('Retry-After'))
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500
        this.notice(`Admin API responded ${response.status}, retrying in ${delay}ms.`)
        await sleep(delay)
        continue
      }

      if (!response.ok) {
        throw new AdminApiError(`Admin API responded ${response.status}`, await response.text())
      }

      const body = (await response.json()) as AdminResponse<T>

      if (body.extensions?.cost?.throttleStatus) {
        this.lastThrottle = body.extensions.cost.throttleStatus
      }

      if (body.errors?.length) {
        const throttled = body.errors.some((e) => e.extensions?.code === 'THROTTLED')
        if (throttled && attempt < MAX_ATTEMPTS) {
          this.notice('Query throttled, waiting for the bucket to refill.')
          // The response still carries throttleStatus, so waitForCapacity on
          // the next pass knows exactly how long to wait.
          await sleep(1000)
          continue
        }
        throw new AdminApiError(body.errors.map((e) => e.message).join('; '), body.errors)
      }

      if (!body.data) throw new AdminApiError('Admin API returned no data')
      return body.data
    }

    throw new AdminApiError('Admin API request failed after retries')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
