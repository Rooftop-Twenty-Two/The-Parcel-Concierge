import Image from 'next/image'
import Link from 'next/link'
import { formatPriceRange } from '@/lib/commerce/money'
import { TAG_LABELS } from '@/lib/commerce/taxonomy'
import type { ProductCard as ProductCardModel } from '@/lib/commerce/types'
import { productPath } from '@/lib/routes'
import { StampFrame } from '@/components/ui/Stamp'

/**
 * The product card.
 *
 * Hover state is the only motion on it, per the design direction. The badge
 * row renders only badges we hold evidence for: there is no "bestseller" or
 * "most popular" here, because no sales data exists to support one.
 */
export function ProductCardTile({
  product,
  priority = false,
}: {
  product: ProductCardModel
  priority?: boolean
}) {
  const href = productPath(product)
  const badge = product.badges[0]

  return (
    <article className="group">
      <Link href={href} className="block focus-visible:outline-offset-4">
        <StampFrame className="relative bg-beige">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt}
              width={product.image.width}
              height={product.image.height}
              sizes="(min-width: 1280px) 30vw, (min-width: 768px) 30vw, 45vw"
              priority={priority}
              className="aspect-square w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
            />
          ) : (
            <div className="aspect-square w-full bg-beige" />
          )}

          {badge ? (
            <span className="absolute left-3 top-3 bg-navy px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-cream">
              {TAG_LABELS[badge] ?? badge}
            </span>
          ) : null}
        </StampFrame>

        <h3 className="mt-3 font-serif text-lg leading-snug font-semibold text-navy group-hover:underline">
          {product.title}
        </h3>
      </Link>

      <p className="mt-1 text-sm text-ink-muted">{formatPriceRange(product.priceRange)}</p>
    </article>
  )
}

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: ProductCardModel[]
  priorityCount?: number
}) {
  return (
    // Three across at desktop, not four. The photography is the sell, and
    // a quarter-width tile undersold it.
    <ul className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCardTile product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  )
}
