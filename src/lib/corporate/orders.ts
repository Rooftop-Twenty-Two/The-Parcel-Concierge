import 'server-only'

import type { Campaign, RedemptionRecord } from './types'

/**
 * Turning a redemption into a real order.
 *
 * Every redemption must end up in the normal fulfilment workflow, which
 * means a Shopify order. When the Admin API is connected this creates a
 * draft order carrying the recipient's address, the chosen hamper, the
 * gift message and the campaign reference, tagged so the warehouse can
 * filter corporate work.
 *
 * Until the store is connected it returns null, and the redemption is
 * still complete and durable in the campaign store with its own
 * CORP-XXXX-NNNN reference: the admin dashboard exports redemptions as a
 * picking CSV, so fulfilment works on day one either way. Nothing about a
 * recipient's gift waits on Shopify.
 */
export async function createRecipientOrder(
  campaign: Campaign,
  redemption: RedemptionRecord,
): Promise<string | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN
  if (!domain || !token) return null

  try {
    const response = await fetch(`https://${domain}/admin/api/2025-07/draft_orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        draft_order: {
          note: `Corporate gifting: ${campaign.company.companyName}, campaign ${campaign.slug}, reference ${redemption.orderReference}`,
          tags: `corporate,${campaign.slug}`,
          line_items: [
            {
              title: redemption.giftTitle,
              quantity: 1,
              // Priced at zero on the recipient order: the company pays on
              // one invoice, and the recipient order exists for fulfilment.
              price: '0.00',
              properties: [
                { name: '_corporateCampaign', value: campaign.slug },
                { name: '_orderReference', value: redemption.orderReference },
                ...(redemption.giftMessage
                  ? [{ name: 'Gift message', value: redemption.giftMessage }]
                  : []),
              ],
            },
          ],
          shipping_address: {
            first_name: redemption.address.firstName,
            last_name: redemption.address.lastName,
            address1: redemption.address.line1,
            address2: redemption.address.line2 ?? '',
            city: redemption.address.town,
            province: redemption.address.county,
            zip: redemption.address.eircode,
            country_code: 'IE',
            phone: redemption.address.phone,
          },
        },
      }),
    })
    if (!response.ok) {
      console.error('[corporate] draft order failed:', response.status, await response.text())
      return null
    }
    const body = (await response.json()) as { draft_order?: { id?: number } }
    return body.draft_order?.id ? String(body.draft_order.id) : null
  } catch (error) {
    console.error('[corporate] draft order errored:', error)
    return null
  }
}
