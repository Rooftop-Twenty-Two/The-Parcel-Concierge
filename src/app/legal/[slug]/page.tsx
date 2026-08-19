import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

/**
 * Legal pages.
 *
 * The policy text has to be written and approved by the client, not by us:
 * terms, privacy, returns and cookies all make binding statements about a
 * business we do not run. Inventing them would be worse than the blank
 * shipping page the June review found.
 *
 * So these routes exist, are linked from the footer, and say honestly that
 * the text is being finalised, rather than shipping filler that reads as
 * real policy. Replacing each one is a CMS document, not a code change:
 * see docs/build-status.md.
 */
const LEGAL_PAGES: Record<string, { title: string; summary: string }> = {
  terms: {
    title: 'Terms of service',
    summary: 'The terms you agree to when you buy from us.',
  },
  privacy: {
    title: 'Privacy policy',
    summary: 'What we collect, why, and how long we keep it.',
  },
  returns: {
    title: 'Returns and refunds',
    summary: 'What happens if something arrives damaged, or is not what you expected.',
  },
  cookies: {
    title: 'Cookies',
    summary: 'The cookies this site sets and what each one does.',
  },
}

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = LEGAL_PAGES[slug]
  if (!page) return {}
  return {
    title: page.title,
    description: page.summary,
    alternates: { canonical: `/legal/${slug}` },
    // Not indexable while the text is a placeholder.
    robots: { index: false, follow: true },
  }
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params
  const page = LEGAL_PAGES[slug]
  if (!page) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">{page.title}</h1>
      <p className="mt-4 text-lg text-ink-muted">{page.summary}</p>

      <div className="mt-8 border border-gold bg-beige px-6 py-6">
        <h2 className="font-serif text-xl font-semibold text-navy">
          This text is still being finalised
        </h2>
        <p className="mt-2 text-ink-muted">
          We would rather leave this page honest than fill it with something that looks like a
          policy and is not one. If you need the answer to something covered here before we publish
          it,{' '}
          <Link href="/contact" className="underline underline-offset-4">
            ask us
          </Link>{' '}
          and we will tell you in writing.
        </p>
      </div>
    </div>
  )
}
