/**
 * Renders a JSON-LD block.
 *
 * JSON.stringify escapes nothing that matters inside a script tag except the
 * closing sequence, so that is the one thing we escape. Everything here is
 * built from our own data, never from user input.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
