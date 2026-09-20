/**
 * The search box. A plain GET form to /search, so it works with
 * JavaScript off and the query lands in the URL where it can be shared
 * and where the back button returns to it.
 *
 * Used in the header (dark text on cream) and on the results page (light
 * text on the green band).
 */
export function SearchForm({
  defaultValue = '',
  variant = 'dark',
  autoFocus = false,
}: {
  defaultValue?: string
  variant?: 'dark' | 'light'
  autoFocus?: boolean
}) {
  const light = variant === 'light'
  return (
    <form action="/search" method="get" role="search" className="flex gap-2">
      <label htmlFor="site-search" className="sr-only">
        Search the shop
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search wines, hampers, makers"
        autoComplete="off"
        autoFocus={autoFocus}
        className={`min-w-0 flex-1 border px-4 py-3 text-base outline-none ${
          light
            ? 'border-cream/40 bg-cream/10 text-cream placeholder:text-cream/60 focus:border-gold'
            : 'border-navy/30 bg-cream text-navy placeholder:text-ink-muted focus:border-navy'
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 px-5 py-3 text-sm font-medium transition-colors ${
          light
            ? 'bg-cream text-navy hover:bg-gold'
            : 'bg-navy text-cream hover:bg-green'
        }`}
      >
        Search
      </button>
    </form>
  )
}
