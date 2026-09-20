import type { Metadata } from 'next'
import Link from 'next/link'
import { AgeGate } from '@/components/commerce/AgeGate'
import { SearchForm } from '@/components/layout/SearchForm'
import { ProductGrid } from '@/components/product/ProductCard'
import { searchProducts } from '@/lib/commerce'

/**
 * Site search results.
 *
 * Reads ?q= so it renders on demand, and is noindex: a results page is
 * not a page worth ranking, and letting crawlers index every query
 * somebody types is how a site ends up with ten thousand thin URLs.
 */
export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
}

const RESULT_COUNT = 48

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const raw = (await searchParams).q
  const term = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
  const { items, total } = term ? await searchProducts(term, RESULT_COUNT) : { items: [], total: 0 }
  // Wine can turn up for any query, so the gate arms whenever it does.
  const alcohol = items.some((item) => item.kind === 'wine' || item.kind === 'spirit')

  return (
    <>
      {alcohol ? <AgeGate context="listing" /> : null}

      <section className="bg-green text-cream">
        <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
          <h1 className="font-display text-[length:var(--text-display)] leading-[0.92]">
            {term ? `Search results for “${term}”` : 'Search the shop'}
          </h1>
          <div className="mt-6 max-w-xl">
            <SearchForm defaultValue={term} variant="light" autoFocus={!term} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
        {!term ? (
          <p className="text-lg text-ink-muted">
            Type a wine, a hamper or a maker. Search covers everything in the shop, whether or not
            it is on a listing page.
          </p>
        ) : items.length ? (
          <>
            <p className="mb-8 text-sm text-ink-muted">
              {total > items.length
                ? `Showing the first ${items.length} of ${total} matches`
                : `${items.length} ${items.length === 1 ? 'match' : 'matches'}`}
            </p>
            <ProductGrid products={items} priorityCount={6} />
          </>
        ) : (
          <NoResults term={term} />
        )}
      </section>
    </>
  )
}

function NoResults({ term }: { term: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-serif text-2xl text-navy">Nothing in the shop matches “{term}”</h2>
      <p className="mt-3 text-ink-muted">
        Try fewer words, or the producer&apos;s name on its own. If it is something we stock and
        it is not here, it may be sold out for the moment.
      </p>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          { href: '/hampers', label: 'All hampers' },
          { href: '/wine', label: 'The Wine Vault' },
          { href: '/build-your-own-hamper', label: 'Build your own hamper' },
          { href: '/contact', label: 'Ask us' },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block border border-navy/20 bg-beige px-5 py-4 font-serif text-lg text-navy transition-colors hover:bg-navy hover:text-cream"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
