import type { Metadata } from 'next'
import Link from 'next/link'
import { collectionsInHub } from '@/lib/commerce/collections'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Gifts by recipient',
  description: 'Gifts for her, for him, for couples and for clients. Filter each by budget or occasion.',
  alternates: { canonical: '/gifts-for' },
}

export default function RecipientHub() {
  const recipients = collectionsInHub('gifts-for')

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">Who is it for?</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        These pages are a starting point rather than an answer. If you know the person well, the
        hamper builder will get you somewhere better than any of them.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recipients.map((recipient) => (
          <li key={recipient.path}>
            <Link
              href={recipient.path}
              className="flex h-full items-center justify-between border border-navy/20 bg-beige px-6 py-8 font-serif text-xl text-navy transition-colors hover:bg-navy hover:text-cream"
            >
              {recipient.title}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10">
        <Link href="/build-your-own-hamper" className="text-navy underline underline-offset-4">
          Build a hamper around what they actually like
        </Link>
      </p>
    </div>
  )
}
