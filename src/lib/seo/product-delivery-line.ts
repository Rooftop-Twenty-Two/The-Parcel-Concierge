import { DELIVERY } from '@/lib/site-config'

/**
 * The delivery sentence appended to a product's fallback meta description.
 *
 * It reads the rates from site-config so it cannot drift from the delivery
 * page, and it lives here rather than inside meta-description.ts so that
 * module stays importable by the test runner. See the note there.
 */
export const PRODUCT_DELIVERY_LINE = `${DELIVERY.national.label}, free over €100.`
