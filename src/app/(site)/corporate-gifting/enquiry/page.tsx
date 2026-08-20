import type { Metadata } from 'next'
import { CorporateEnquiryForm } from '@/components/corporate/CorporateEnquiryForm'

export const metadata: Metadata = {
  title: 'Corporate gifting enquiry',
  description:
    'Tell us the quantity, the budget per box, where they are going and when they need to land. We come back the same day.',
  alternates: { canonical: '/corporate-gifting/enquiry' },
  robots: { index: true, follow: true },
}

export default function EnquiryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <p className="text-xs uppercase tracking-[0.24em] text-green">Corporate gifting</p>
      <h1 className="mt-2 font-display text-[length:var(--text-hero)] text-navy">
        Tell us what you need
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        Four fields matter: how many, roughly what per box, where they are going and when they have
        to land. Everything else we can work out on a call.
      </p>

      <CorporateEnquiryForm />
    </div>
  )
}
