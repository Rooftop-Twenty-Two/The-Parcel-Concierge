import type { Metadata } from 'next'
import Link from 'next/link'
import { collectionsInHub } from '@/lib/commerce/collections'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Shop gifts by budget',
  description:
    'Hampers, wine and gifts grouped by what you want to spend. Under €50, €50 to €100, €100 to €150, and €150 and over.',
  alternates: { canonical: '/gifts-by-budget' },
}

export default function BudgetHub() {
  const bands = collectionsInHub('gifts-by-budget')

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">Shop by budget</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        Buying to a ceiling is the most common way people shop for a gift and the hardest thing to
        do on most websites. Each of these is a real page you can send to whoever set the budget.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bands.map((band) => (
          <li key={band.path}>
            <Link
              href={band.path}
              className="group flex h-full flex-col justify-between border border-navy/20 bg-beige p-8 transition-colors hover:bg-navy"
            >
              <span className="font-display text-5xl text-navy group-hover:text-cream">
                {band.title.replace('Gifts ', '')}
              </span>
              <span className="mt-8 text-sm text-ink-muted group-hover:text-cream/80">
                Shop this band →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
