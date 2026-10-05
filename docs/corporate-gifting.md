# Corporate Gifting Made Easy

You choose the budget. They choose the gift. We take care of everything
else. One payment, one link, zero address spreadsheets.

## The pieces

| Surface | Route | Who |
|---|---|---|
| Landing page | `/corporate-gifting` | The corporate buyer, arriving |
| Campaign wizard | `/corporate-gifting/new` | Buyer: company → recipients → budget → gifts → branding → review |
| Recipient gifting page | `/gift/{slug}` | Recipients, mostly on phones, no shop chrome, no prices |
| Corporate dashboard | `/corporate-gifting/dashboard/{slug}?token=…` | Buyer: progress, reminders, add recipients |
| Fulfilment admin | `/admin/corporate?key=…` | Us: activate, progress statuses, picking CSV |

## The privacy split, which is the product

Recipients give their delivery address to us, never to their employer.
The corporate dashboard shows who has selected and what, and cannot
render an address because addresses are never sent to it. The fulfilment
side (the admin page, the picking CSV, the Shopify draft order) is the
only place an address exists. The recipient page says this out loud, the
data model enforces it (`RedemptionRecord.address` is only read by
fulfilment surfaces), and the footer of the gifting page carries the
GDPR-appropriate notice: delivery use only, no marketing, retention
bounded by fulfilment.

One gift per person is `campaign + lowercased email`, checked when the
recipient identifies and again inside the redemption write.

## How a campaign lives

Statuses: `DRAFT → AWAITING_PAYMENT → ACTIVE → CLOSED → FULFILLING →
COMPLETE`, with `CANCELLED` available throughout. The wizard creates at
`AWAITING_PAYMENT`: nothing goes live until we have confirmed the invoice
or quotation and pressed Activate in the admin. The gifting page reads
`AWAITING_PAYMENT` as "nearly ready" rather than a dead link, closes
itself after the deadline, and the recipient statuses
(`NOT_STARTED → STARTED → SELECTED → ORDER_CREATED → FULFILLED →
DELIVERED`) drive the dashboard counts.

Payment is invoice or quotation request by design. Card payment for
campaigns, and card-paid recipient upgrades, both arrive with the Shopify
connection; the upgrade toggle already exists and is recorded on the
campaign.

## Where the data lives

`src/lib/corporate/store.ts` is one interface with three backends. In
production, on Vercel, it is Redis via Upstash (`redis-store.ts`), which
Vercel provides under the project's Storage tab. On Netlify it is Netlify
Blobs, and locally a gitignored JSON file. Vercel functions have no
writable disk, so on Vercel without Redis a campaign save fails with a
message saying so, rather than appearing to work and losing it. Each campaign is one
self-contained document. The interface is the seam for PostgreSQL when
the platform grows into recurring gifting, HR integrations and corporate
wallets, none of which V1 pretends to have.

Known trade-off: writes are read-modify-write on one document, so two
redemptions in the same instant could race. The redemption check runs
inside the write path, and row-level safety arrives with the database.

## Orders and fulfilment

Every redemption gets a `CORP-{COMPANY}-{NNNN}` reference and is durable
in the store. Where `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_TOKEN`
exist, `src/lib/corporate/orders.ts` also creates a Shopify draft order
per redemption (recipient address, hamper, gift message, campaign tag,
zero-priced because the company pays on one invoice), which puts
redemptions into the normal fulfilment workflow. Until then the admin
page's picking CSV is the workflow, so the feature works on day one.

## Volume pricing

`VOLUME_TIERS` in `src/lib/corporate/types.ts`: standard to 24, 5% from
25, 7.5% from 50, 10% from 100, quoted from 250. Configuration, not
code; discounts apply to the invoice we raise and never to a price a
recipient sees.

## Setup

```
CORPORATE_ADMIN_KEY=   # gates /admin/corporate and campaign activation
```

On Vercel: project → **Storage** → create or connect an **Upstash for
Redis** database to this project. That sets `KV_REST_API_URL` and
`KV_REST_API_TOKEN` (the `UPSTASH_REDIS_REST_URL` / `_TOKEN` pair also
works). Redeploy so the functions see them. Netlify Blobs needs nothing.
Reminders are copy-to-send from the
dashboard (they land better from the HR manager's own address); automated
deadline reminders arrive with the email infrastructure.
