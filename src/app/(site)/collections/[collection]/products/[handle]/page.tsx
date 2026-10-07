import { notFound, permanentRedirect } from 'next/navigation'
import { legacyProductPath } from '@/lib/legacy-product-path'

type Props = {
  params: Promise<{ collection: string; handle: string }>
  searchParams: Promise<{ variant?: string | string[] }>
}

/**
 * Shopify also served every product inside each collection it belonged to
 * (/collections/<collection>/products/<handle>), and links in that form are
 * still out there. The collection part says nothing about where the product
 * lives now, so it resolves exactly like /products/<handle>.
 */
export default async function LegacyCollectionProduct({ params, searchParams }: Props) {
  const { handle } = await params
  const { variant } = await searchParams
  const path = await legacyProductPath(handle, Array.isArray(variant) ? variant[0] : variant)
  if (!path) notFound()
  permanentRedirect(path)
}
