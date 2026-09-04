/**
 * The bottom-left way in, for the team, while the holding page is up.
 *
 * A plain form posting to a route handler, with no client JavaScript: this
 * is the one page that has to work for everybody, and a password box that
 * needs hydration to submit is a password box that sometimes does not.
 *
 * Understated on purpose. It is not a customer account, and it should not
 * look like one, so it sits at half opacity until you touch it.
 *
 * Fixed to the viewport rather than the foot of the page: the holding page
 * is taller than one screen, and a login you have to go looking for is one
 * the team will ask about every time.
 */
export function PreviewUnlock({ wrong }: { wrong: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 p-4 lg:p-6">
      <form
        action="/api/preview-unlock"
        method="post"
        className="pointer-events-auto flex w-fit flex-wrap items-center gap-2 opacity-60 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100"
      >
        <label htmlFor="preview-password" className="sr-only">
          Team preview password
        </label>
        <input
          id="preview-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Team preview"
          aria-invalid={wrong || undefined}
          aria-describedby={wrong ? 'preview-error' : undefined}
          className={`w-40 border bg-transparent px-3 py-2 text-sm text-cream placeholder:text-cream/45 focus:outline-none focus:ring-1 focus:ring-gold ${
            wrong ? 'border-red' : 'border-cream/30'
          }`}
        />
        <button
          type="submit"
          className="border border-cream/30 px-3 py-2 text-sm text-cream/80 transition-colors hover:border-gold hover:text-gold"
        >
          Enter
        </button>
        {wrong ? (
          <p id="preview-error" role="alert" className="text-sm text-red">
            Not that one.
          </p>
        ) : null}
      </form>
    </div>
  )
}
