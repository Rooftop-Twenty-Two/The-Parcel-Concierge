import { notFound } from 'next/navigation'

/**
 * Any URL nothing else matches.
 *
 * Without this, an unmatched path fell through to the bare root 404, which
 * renders outside the (site) layout: no header, no footer, no search, just a
 * line about gift links. Most dead URLs here are old Shopify paths, and the
 * person landing on one needs the shop's navigation to find their way. This
 * route sends them to the shop's own 404 instead, still with a 404 status.
 */
export default function Missing(): never {
  notFound()
}
