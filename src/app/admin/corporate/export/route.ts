import { NextRequest, NextResponse } from 'next/server'
import { campaignStore } from '@/lib/corporate/store'
import { secretsMatch } from '@/lib/secure-compare'

export const dynamic = 'force-dynamic'

/**
 * The picking CSV: one row per redemption, addresses included.
 *
 * This is the fulfilment side of the privacy split. The corporate
 * dashboard never sees an address; the bench gets them all in one file it
 * can work through, whether or not Shopify is connected yet. Same admin
 * key as the dashboard.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  const id = request.nextUrl.searchParams.get('id')
  const expected = process.env.CORPORATE_ADMIN_KEY

  if (!secretsMatch(key, expected)) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
  }
  if (!id) return NextResponse.json({ error: 'Which campaign?' }, { status: 400 })

  const store = await campaignStore()
  const campaign = await store.get(id)
  if (!campaign) return NextResponse.json({ error: 'No such campaign.' }, { status: 404 })

  const header = [
    'reference', 'gift', 'first_name', 'last_name', 'address_1', 'address_2',
    'town', 'county', 'eircode', 'phone', 'email', 'business_address',
    'gift_message', 'shopify_order', 'redeemed_at',
  ]
  const rows = campaign.redemptions.map((r) => [
    r.orderReference, r.giftTitle, r.address.firstName, r.address.lastName,
    r.address.line1, r.address.line2 ?? '', r.address.town, r.address.county,
    r.address.eircode, r.address.phone, r.address.email,
    r.address.isBusinessAddress ? 'yes' : 'no', r.giftMessage ?? '',
    r.shopifyOrderId ?? '', r.redeemedAt,
  ])

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${neutraliseFormula(String(cell)).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${campaign.slug}-picking.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Recipients type the names, addresses and gift messages in this file, and
 * the bench opens it in Excel or Sheets. A cell starting with = + - @ (or a
 * tab or carriage return) is run as a formula there, so `=HYPERLINK(...)` in
 * a gift message would become a live link or worse. A leading apostrophe
 * makes the spreadsheet treat it as text. Phone numbers such as +353 87 ...
 * are left alone: they are digits, not formulas, and are read back as typed.
 */
function neutraliseFormula(value: string): string {
  if (/^\+?[\d\s()-]+$/.test(value)) return value
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}
