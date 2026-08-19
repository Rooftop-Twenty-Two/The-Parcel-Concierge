import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/Button'
import { BRANDING_OPTIONS } from '@/lib/corporate'

export const metadata: Metadata = {
  title: 'Branding and personalisation',
  description:
    'Printed cards with your logo, ribbon in your colours, handwritten notes and bespoke hamper contents for corporate orders.',
  alternates: { canonical: '/corporate-gifting/branding-personalisation' },
}

export default function BrandingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <p className="text-xs uppercase tracking-[0.24em] text-green">Corporate gifting</p>
      <h1 className="mt-2 font-display text-[length:var(--text-hero)] text-navy">
        Branding and personalisation
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        Our view on this is simple. A logo across the outside of a box makes it look like swag. A
        printed card inside the lid makes it look like a gift from a person. We do the second, and
        we will tell you if we think an option is a mistake.
      </p>

      <ul className="mt-12 space-y-8">
        {BRANDING_OPTIONS.map((option) => (
          <li key={option.title} className="border-l-2 border-gold pl-6">
            <h2 className="font-serif text-2xl font-semibold text-navy">{option.title}</h2>
            <p className="mt-2 text-ink-muted">{option.body}</p>
            <p className="mt-2 text-sm text-green">{option.leadTime}</p>
          </li>
        ))}
      </ul>

      <section className="mt-14 border-t border-rule pt-8">
        <h2 className="font-display text-3xl text-navy">Artwork</h2>
        <p className="mt-3 text-ink-muted">
          Send a vector file where you have one, or a PNG at 300dpi and at least 1000 pixels wide.
          We will send you a proof before anything is printed, and nothing goes to print until you
          have signed it off.
        </p>
      </section>

      <ButtonLink href="/corporate-gifting/enquiry" size="large" className="mt-10">
        Start an enquiry
      </ButtonLink>
    </div>
  )
}
