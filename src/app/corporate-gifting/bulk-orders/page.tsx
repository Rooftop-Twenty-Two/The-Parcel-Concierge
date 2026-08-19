import type { Metadata } from 'next'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { BULK_ORDER_MINIMUM, VOLUME_TIERS } from '@/lib/corporate'

export const metadata: Metadata = {
  title: 'Bulk orders',
  description:
    'Volume pricing, lead times and what we need from you. Corporate hamper orders from ten units up, packed by hand in Co. Meath.',
  alternates: { canonical: '/corporate-gifting/bulk-orders' },
}

export default function BulkOrdersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <p className="text-xs uppercase tracking-[0.24em] text-green">Corporate gifting</p>
      <h1 className="mt-2 font-display text-[length:var(--text-hero)] text-navy">Bulk orders</h1>
      <p className="mt-4 text-lg text-ink-muted">
        Volume pricing starts at {BULK_ORDER_MINIMUM} units. Below that, order through the site as
        normal and email us if you need the boxes branded.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-3xl text-navy">Volume pricing</h2>
        {VOLUME_TIERS.length ? (
          <table className="mt-4 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-rule text-xs uppercase tracking-[0.16em] text-ink-muted">
                <th scope="col" className="py-3">
                  Units
                </th>
                <th scope="col" className="py-3">
                  Off list price
                </th>
                <th scope="col" className="py-3">
                  Lead time
                </th>
              </tr>
            </thead>
            <tbody>
              {VOLUME_TIERS.map((tier) => (
                <tr key={tier.minUnits} className="border-b border-rule">
                  <td className="py-3 text-navy">
                    {tier.minUnits}
                    {tier.maxUnits ? ` to ${tier.maxUnits}` : ' and over'}
                  </td>
                  <td className="py-3 text-navy">{tier.discountPercent}%</td>
                  <td className="py-3 text-ink-muted">
                    {tier.leadTimeWorkingDays} working days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /*
            Outstanding client item 5. We do not print a discount table the
            client has not agreed to, so until the tiers land the page says
            what actually happens: you send the numbers and we quote.
          */
          <p className="mt-4 text-ink-muted">
            We quote volume pricing on the enquiry rather than publishing a table, because the price
            depends on which box you pick as much as on how many you order. Send us the quantity and
            your budget per unit and you will have a figure back the same day.
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl text-navy">What we need from you</h2>
        <div className="mt-4">
          <Accordion title="The address list" defaultOpen>
            <p>
              A spreadsheet with one row per recipient and a column for each of name, address line
              one, address line two, town, county, eircode and phone number.
            </p>
            <p>
              The phone number is the one people leave out, and it is the difference between a
              delivery and a redelivery.
            </p>
          </Accordion>

          <Accordion title="Artwork, if you are branding the box">
            <p>
              A vector file of your logo, or a PNG at 300dpi and at least 1000 pixels wide. Send it
              at least five working days before dispatch.
            </p>
            <p>
              We print onto a card that sits inside the lid. We do not print on the outside of the
              box.
            </p>
          </Accordion>

          <Accordion title="Anything we need to avoid">
            <p>
              Tell us about allergies, and tell us if any of the list should not be sent alcohol. We
              have alcohol free versions of every corporate box for exactly this.
            </p>
          </Accordion>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl text-navy">December</h2>
        <p className="mt-4 text-ink-muted">
          Book the slot in October and confirm the address list in November. In the first two weeks
          of December our lead times are a floor rather than a promise, and by the third week we are
          usually closed to new bulk orders. This is not a sales tactic, it is how many boxes two
          people can pack in a day.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-4">
        <ButtonLink href="/corporate-gifting/enquiry" size="large">
          Send us your numbers
        </ButtonLink>
        <Link
          href="/corporate-gifting/branding-personalisation"
          className="self-center text-navy underline underline-offset-4"
        >
          Branding options
        </Link>
      </div>
    </div>
  )
}
