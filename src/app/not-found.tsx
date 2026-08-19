import Link from 'next/link'
import { PostmarkRoundel } from '@/components/ui/Stamp'

/**
 * 404.
 *
 * A dead URL on this site is most likely an old collection or product URL
 * that has not been redirected yet, so the page points at the four places
 * somebody is most likely to have been heading rather than dumping them on
 * the homepage.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center lg:px-8">
      <PostmarkRoundel className="mx-auto h-24 w-24 text-green" />
      <h1 className="mt-8 font-display text-[length:var(--text-hero)] text-navy">
        We could not find that
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        The page has either moved or stopped existing. Here is where most people are heading.
      </p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          { href: '/hampers', label: 'All hampers' },
          { href: '/build-your-own-hamper', label: 'Build your own hamper' },
          { href: '/wine', label: 'The Wine Vault' },
          { href: '/gifts-by-budget/50-100', label: 'Shop by budget' },
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
