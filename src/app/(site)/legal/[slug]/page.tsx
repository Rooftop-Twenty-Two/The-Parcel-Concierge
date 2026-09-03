import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPage } from '@/lib/cms'
import { CONTACT, SITE, postalAddress } from '@/lib/site-config'

export const revalidate = 3600

/**
 * Legal pages.
 *
 * The text lives in the CMS as `legal-<slug>` documents, like every other
 * page on the site, so amending a policy is a content change rather than a
 * deploy. These used to be placeholders saying the text was being
 * finalised.
 *
 * Returns came off briefly in September 2026 and went back when the client
 * supplied their refund policy. The returns window is stated in ONE place,
 * on the refund policy page: the terms link to it rather than restating a
 * number, because a site that says 14 days in one place and 30 in another
 * is a site that says the wrong thing somewhere.
 *
 * NEEDS A SOLICITOR. These are a careful draft against Irish and EU
 * consumer and data protection law, written from what this codebase
 * actually does, and they are not a substitute for review by somebody
 * qualified. See docs/build-status.md.
 */
const LEGAL_SLUGS = ['terms', 'privacy', 'returns', 'cookies'] as const

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }))
}

function isLegalSlug(slug: string): slug is (typeof LEGAL_SLUGS)[number] {
  return (LEGAL_SLUGS as readonly string[]).includes(slug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (!isLegalSlug(slug)) return {}
  const page = await getPage(`legal-${slug}`)
  if (!page) return {}
  return {
    title: page.title,
    description: page.intro,
    alternates: { canonical: `/legal/${slug}` },
  }
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params
  if (!isLegalSlug(slug)) notFound()

  const page = await getPage(`legal-${slug}`)
  if (!page) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">{page.title}</h1>
      {page.intro ? <p className="mt-4 text-lg text-ink-muted">{page.intro}</p> : null}
      <p className="mt-3 text-sm text-ink-muted">
        Last updated{' '}
        <time dateTime={page.updatedAt}>
          {new Date(`${page.updatedAt}T12:00:00`).toLocaleDateString('en-IE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
      </p>

      <div
        className="prose-tpc mt-10 text-ink-muted"
        dangerouslySetInnerHTML={{ __html: page.body }}
      />

      <div className="mt-12 border-t border-rule pt-8 text-sm text-ink-muted">
        <h2 className="font-serif text-xl text-navy">Contact us</h2>
        <p className="mt-2">
          {SITE.name}, {postalAddress()}.
        </p>
        <p className="mt-1">
          <a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4">
            {CONTACT.email}
          </a>{' '}
          or {CONTACT.phone}.
        </p>
        {CONTACT.companyNumber ? (
          <p className="mt-1">Company registration number {CONTACT.companyNumber}.</p>
        ) : null}
        {CONTACT.vatNumber ? <p className="mt-1">VAT number {CONTACT.vatNumber}.</p> : null}
        <p className="mt-4">
          <Link href="/contact" className="underline underline-offset-4">
            Get in touch
          </Link>{' '}
          if anything here is unclear and we will answer in writing.
        </p>
      </div>
    </div>
  )
}
