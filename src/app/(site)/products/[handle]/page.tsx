import { notFound, permanentRedirect } from 'next/navigation'
import { legacyProductPath } from '@/lib/legacy-product-path'

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ variant?: string | string[] }>
}

/**
 * Old Shopify product URLs. Never renders: it permanently redirects to the
 * product's new address, or 404s if the product is no longer in the shop.
 * See src/lib/legacy-product-path.ts.
 */
export default async function LegacyProduct({ params, searchParams }: Props) {
  const { handle } = await params
  const { variant } = await searchParams
  const path = await legacyProductPath(handle, Array.isArray(variant) ? variant[0] : variant)
  if (!path) notFound()
  permanentRedirect(path)
}
