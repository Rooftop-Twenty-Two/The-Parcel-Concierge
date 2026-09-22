import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Accordion } from '@/components/ui/Accordion'
import { PostmarkRoundel } from '@/components/ui/Stamp'
import { formatMinor } from '@/lib/commerce/money'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/structured-data'
import { DELIVERY, handDeliveryZone, ukDeliveryPrice } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Delivery',
  description:
    'Free local delivery in the A85 eircode area, €8.95 elsewhere in Ireland and free over €100. Cut-off times, alcohol rules and UK delivery from €40.',
  alternates: { canonical: '/delivery' },
}

/**
 * The delivery page.
 *
 * This page was blank on the old site, which the June review flagged as one
 * of the two cheapest, highest-impact fixes available: the delivery offer is
 * one of the strongest things about this business and it was invisible.
 *
 * The rule for this page is that it states only what has been confirmed.
 * Where a fact is outstanding (cut-off times) the page says plainly that
 * it is not published yet and routes the shopper to a person, rather than
 * inventing a number that somebody will later have to honour.
 *
 * We do not use a courier. Everything outside the hand-delivery area goes
 * with An Post, and this page names them, because "our courier" is both
 * wrong and vaguer than the truth.
 */
export default function DeliveryPage() {
  const zone = handDeliveryZone()
  const carrier = DELIVERY.carrier
  const uk = DELIVERY.uk
  const cutOff = DELIVERY.cutOff
  const threshold = DELIVERY.freeDeliveryThresholdMinor

  const faqs = [
    {
      question: 'How much is delivery in Ireland?',
      answer: `${formatMinor(DELIVERY.national.priceMinor)} anywhere in the Republic of Ireland${
        threshold === null ? '' : `, and free on orders over ${formatMinor(threshold)}`
      }. Local delivery${zone ? ` within ${zone}` : ''} is free and we do it ourselves.`,
    },
    ...(uk
      ? [
          {
            question: 'Do you deliver to the UK?',
            answer: `Yes, ${ukDeliveryPrice(formatMinor)}. ${uk.note}`,
          },
        ]
      : []),
    {
      question: 'Do you deliver alcohol?',
      answer: `Yes, to anyone over 18. We may ask for proof of age on delivery, and ${carrier} will not leave alcohol with a neighbour or in a safe place.`,
    },
    {
      question: 'What happens if nobody is home?',
      answer: `For a standard delivery ${carrier} leave a card and try again the next working day, or leave it with a neighbour if you have said that is fine. Anything containing alcohol has to be handed to somebody over 18, so it will come back to the depot instead.`,
    },
    {
      question: 'Can I send a hamper straight to the person it is for?',
      answer:
        'Yes. Put their address as the delivery address and yours as the billing address. We never include a price or an invoice in the box.',
    },
  ]

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_240px]">
          <div>
            <h1 className="font-display text-[length:var(--text-hero)] text-navy">
              Delivery information
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-muted">
              At The Parcel Concierge we want to make sending the perfect gift as easy as possible.
              Every order is prepared with care, beautifully presented and packaged securely before
              it begins its journey to you or someone special.
            </p>
          </div>
          <PostmarkRoundel className="hidden h-40 w-40 text-green lg:block" />
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <RateCard
            title="Local hand delivery"
            price="Free"
            body={
              zone
                ? `Free local delivery within ${zone} only, personally delivered by The Parcel Concierge team.`
                : 'We deliver by hand around Dunshaughlin ourselves. The exact area is not published yet, so contact us with your eircode and we will confirm the same day.'
            }
          />
          <RateCard
            title="Nationwide"
            price={formatMinor(DELIVERY.national.priceMinor)}
            body={`For deliveries throughout Ireland outside ${
              zone ?? 'our local area'
            }, your order is carefully packaged and sent with ${carrier}.${
              threshold === null ? '' : ` Free on orders over ${formatMinor(threshold)}.`
            }`}
          />
          {uk ? (
            <RateCard
              title="United Kingdom"
              price={ukDeliveryPrice(formatMinor) ?? ''}
              body={`We deliver to the UK as well. ${uk.note}`}
            />
          ) : (
            <RateCard
              title="Outside Ireland"
              price="Not available"
              body="We deliver within the Republic of Ireland only. If you are abroad and sending to an Irish address, that works perfectly: order as normal and put their address on it."
            />
          )}
        </div>

        <div className="mt-14 max-w-3xl">
          <h2 className="font-display text-[length:var(--text-display)] text-navy">
            The details
          </h2>

          <div className="mt-6">
            <Accordion title="Cut-off times" defaultOpen>
              {cutOff.dailyOrderCutOff ? (
                <p>Order before {cutOff.dailyOrderCutOff} and we dispatch the same working day.</p>
              ) : (
                <p>
                  Our daily cut-off is not published yet. If your order is urgent, ring us before
                  you place it and we will tell you honestly whether it will make today&apos;s
                  collection.
                </p>
              )}
              {cutOff.christmas ? (
                <p>Christmas cut-off: {cutOff.christmas}.</p>
              ) : (
                <p>
                  Christmas last posting dates go up on this page as soon as {carrier} confirm
                  them, usually in early November. Order ahead of the date rather than on it. The
                  last week before Christmas is the week things go wrong.
                </p>
              )}
              <p>
                Hampers marked &quot;packed to order&quot; carry their own lead time on the product
                page. That lead time is on top of the delivery time.
              </p>
            </Accordion>

            <Accordion title="Alcohol deliveries">
              <p>
                You must be over 18 to buy alcohol from us. We may ask for proof of age on delivery,
                and {carrier} cannot leave anything containing alcohol with a neighbour or in a
                safe place.
              </p>
              <p>
                There are addresses and countries we cannot send alcohol to at all. If we cannot
                deliver what you have ordered, we will contact you before we charge you, not after.
              </p>
            </Accordion>

            <Accordion title="If nobody is home">
              <p>
                For a standard delivery {carrier} leave a card and try again the next working
                day. If you have told us it is fine to leave the box with a neighbour, they will.
              </p>
              <p>
                Anything containing alcohol has to be handed to somebody over 18, so it goes back to
                the depot instead and you will get a card telling you where.
              </p>
              <p>
                Add a phone number for the recipient at checkout. It is the single biggest
                difference between a delivery and a redelivery.
              </p>
            </Accordion>

            <Accordion title="Sending a gift straight to somebody else">
              <p>
                Put their address as the delivery address and yours as the billing address. We never
                put a price or an invoice in the box.
              </p>
              <p>
                Your gift message is written by hand on a card inside the lid. Tell us exactly what
                you want it to say and that is exactly what it will say.
              </p>
            </Accordion>

            <Accordion title="Something arrived damaged">
              <p>
                Email us a photo within 48 hours and we will replace it or refund it. We pack glass
                and bottles carefully so they travel well, and if something arrives damaged we will
                put it right.
              </p>
              <p>
                Full details are in our{' '}
                <Link href="/legal/returns" className="underline underline-offset-2">
                  refund policy
                </Link>
                .
              </p>
            </Accordion>
          </div>

          <p className="mt-10 text-ink-muted">
            Still not sure?{' '}
            <Link href="/contact" className="underline underline-offset-4">
              Contact us
            </Link>{' '}
            with your eircode and the date it needs to arrive, and we will tell you what is
            possible.
          </p>
        </div>
      </div>

      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Delivery', path: '/delivery' },
        ])}
      />
    </>
  )
}

function RateCard({ title, price, body }: { title: string; price: string; body: string }) {
  return (
    <div className="border border-navy/20 bg-beige p-6">
      <h2 className="text-xs uppercase tracking-[0.18em] text-green">{title}</h2>
      <p className="mt-2 font-display text-4xl text-navy">{price}</p>
      <p className="mt-3 text-sm text-ink-muted">{body}</p>
    </div>
  )
}
