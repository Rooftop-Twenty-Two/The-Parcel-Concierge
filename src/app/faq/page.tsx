import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Accordion } from '@/components/ui/Accordion'
import { formatMinor } from '@/lib/commerce/money'
import { faqJsonLd } from '@/lib/seo/structured-data'
import { AGE_GATE, DELIVERY } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description:
    'Delivery, gift messages, allergens, corporate orders, alcohol and returns. The questions we actually get asked.',
  alternates: { canonical: '/faq' },
}

/**
 * FAQ.
 *
 * Answers are written once here and marked up as FAQPage. Nothing is
 * asserted in the structured data that is not on the page, and nothing is
 * answered that we do not actually know: where a fact is outstanding the
 * answer says so and points at a person.
 */
const FAQS = [
  {
    question: 'How much is delivery?',
    answer: `Free hand delivery in our local area, ${formatMinor(DELIVERY.national.priceMinor)} anywhere else in the Republic of Ireland. We do not deliver outside Ireland. Full details are on the delivery page.`,
  },
  {
    question: 'Can I send a hamper straight to the person it is for?',
    answer:
      'Yes. Put their address as the delivery address and yours as the billing address. We never put a price or an invoice in the box.',
  },
  {
    question: 'Do you write the gift message by hand?',
    answer:
      'Yes, on a card inside the lid. Whatever you type is exactly what we write, so check the spelling of names before you order.',
  },
  {
    question: 'Where do I find the allergens?',
    answer:
      'On every hamper page, in the allergens section. We list them for every box, and if a box does not have allergen information we do not publish it.',
  },
  {
    question: 'Do you deliver alcohol?',
    answer: `Yes, to anyone over ${AGE_GATE.minimumAge}. We may ask for proof of age on delivery, and the courier will not leave alcohol with a neighbour or in a safe place.`,
  },
  {
    question: 'Can you do a hamper that is not on the site?',
    answer:
      'Yes. Use the hamper builder to put together exactly what you want, or contact us if you need something we do not stock. For corporate orders there is a separate enquiry form.',
  },
  {
    question: 'Do you do corporate orders?',
    answer:
      'Yes, and it is a large part of what we do in December. We handle branding, individual addresses and volume pricing. Start with the corporate gifting enquiry form.',
  },
  {
    question: 'What if something arrives damaged?',
    answer:
      'Email us a photo within 48 hours and we will replace it or refund it. We pack glass and bottles in fitted boxes, but couriers are couriers.',
  },
  {
    question: 'Are you actually Irish?',
    answer:
      'Yes. We are based in Dunshaughlin, Co. Meath, we pack every box here ourselves, and we are members of Guaranteed Irish. Where something in a hamper is not Irish, and some of the wine is not, the product page says where it is from.',
  },
]

export default function FaqPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
        <h1 className="font-display text-[length:var(--text-hero)] text-navy">
          Frequently asked questions
        </h1>
        <p className="mt-4 text-lg text-ink-muted">
          The ones we actually get asked. If yours is not here,{' '}
          <Link href="/contact" className="underline underline-offset-4">
            ask us
          </Link>
          .
        </p>

        <div className="mt-10">
          {FAQS.map((faq) => (
            <Accordion key={faq.question} title={faq.question}>
              <p>{faq.answer}</p>
            </Accordion>
          ))}
        </div>
      </div>

      <JsonLd data={faqJsonLd(FAQS)} />
    </>
  )
}
