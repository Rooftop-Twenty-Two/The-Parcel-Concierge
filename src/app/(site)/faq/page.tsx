import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { Accordion } from '@/components/ui/Accordion'
import { faqJsonLd } from '@/lib/seo/structured-data'
import { AGE_GATE, DELIVERY } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description:
    'Delivery, gift messages, corporate orders, alcohol and returns. The questions we actually get asked.',
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
    answer:
      'It depends where it is going: free locally, a flat rate elsewhere in Ireland, free over a certain order value, and a separate rate for the UK. The delivery page has the rates in full.',
    link: { href: '/delivery', label: 'See our delivery information' },
  },
  {
    question: 'Can I send a hamper straight to the person it is for?',
    answer:
      'Yes. Put their address as the delivery address and yours as the billing address. We never put a price or an invoice in the box.',
  },
  {
    question: 'Do you write the gift message by hand?',
    answer:
      'Yes, on a card inside the package. Whatever you type is exactly what we write, so check the spelling of names before you order.',
  },
  {
    question: 'Do you deliver alcohol?',
    answer: `Yes, to anyone over ${AGE_GATE.minimumAge}. We may ask for proof of age on delivery, and ${DELIVERY.carrier} will not leave alcohol with a neighbour or in a safe place.`,
  },
  {
    question: 'Can you do a hamper that is not on the site?',
    answer:
      'Yes. Use the hamper builder to put together exactly what you want, or contact us if you need something we do not stock. For corporate orders there is a separate enquiry form.',
  },
  {
    question: 'Do you do corporate orders?',
    answer:
      'Yes, and it is a large part of what we do all year round. We handle branding, individual addresses and volume pricing. Start with the corporate gifting enquiry form.',
  },
  {
    question: 'What if something arrives damaged?',
    answer:
      'Email us a photo within 48 hours and we will replace it or refund it.',
  },
  {
    question: 'Are you actually Irish?',
    answer:
      'Yes. We are based in Dunshaughlin, Co. Meath, we pack every box here ourselves, and we are members of Guaranteed Irish.',
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
              {/* The link is deliberately outside `answer`: that string is
                  what goes into the FAQPage structured data, which takes
                  plain text. */}
              {'link' in faq && faq.link ? (
                <p>
                  <Link href={faq.link.href} className="underline underline-offset-4">
                    {faq.link.label}
                  </Link>
                </p>
              ) : null}
            </Accordion>
          ))}
        </div>
      </div>

      <JsonLd data={faqJsonLd(FAQS)} />
    </>
  )
}
