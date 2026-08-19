import Link from 'next/link'
import { TRUSTPILOT } from '@/lib/site-config'

/**
 * Trustpilot stars.
 *
 * Server-rendered from the last known rating so the stars are in the HTML
 * for the crawler and for the first paint, then the official widget
 * hydrates over it where a business unit id is configured. The June review
 * found a 5-star rating across 81 reviews that appeared nowhere on the site
 * at all, which is the single cheapest trust fix available.
 *
 * The numbers come from src/lib/site-config.ts and are refreshed from the
 * Trustpilot API by src/lib/trustpilot.ts. They are never typed into a
 * component.
 */
export function TrustpilotStars({
  rating = TRUSTPILOT.fallbackRating,
  reviewCount = TRUSTPILOT.fallbackReviewCount,
  variant = 'dark',
  showCount = true,
  className = '',
}: {
  rating?: number
  reviewCount?: number
  variant?: 'dark' | 'light'
  showCount?: boolean
  className?: string
}) {
  const filled = Math.round(rating)
  const colour = variant === 'light' ? 'text-gold' : 'text-green'
  const textColour = variant === 'light' ? 'text-cream/85' : 'text-ink-muted'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className={`flex gap-0.5 ${colour}`} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} filled={i < filled} />
        ))}
      </span>
      <span className={`text-sm ${textColour}`}>
        <span className="sr-only">Rated </span>
        {rating.toFixed(1)} out of 5
        {showCount ? (
          <>
            {' '}
            from{' '}
            <Link
              href={`https://www.trustpilot.com/review/${TRUSTPILOT.businessUnitDomain}`}
              className="underline"
              rel="nofollow noopener"
              target="_blank"
            >
              {reviewCount} reviews
            </Link>{' '}
            on Trustpilot
          </>
        ) : null}
      </span>
    </div>
  )
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" focusable="false">
      <path
        d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.6 7.7l5.8-.8z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}
