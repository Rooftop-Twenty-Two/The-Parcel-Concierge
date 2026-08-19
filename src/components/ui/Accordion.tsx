import type { ReactNode } from 'react'

/**
 * Accordion.
 *
 * Built on details/summary, so it opens without JavaScript, works from the
 * keyboard for free and is announced correctly by screen readers. There is
 * no reason to reimplement this one.
 */
export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className="group border-b border-rule">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-serif text-lg text-navy marker:content-none">
        {title}
        <span
          aria-hidden="true"
          className="ml-4 text-xl leading-none text-green transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="prose-tpc pb-5 text-ink-muted">{children}</div>
    </details>
  )
}
