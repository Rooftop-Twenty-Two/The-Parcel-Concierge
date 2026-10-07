'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useVariantSelectionOptional } from '@/components/product/VariantSelector'
import { StampFrame } from '@/components/ui/Stamp'
import type { ProductImage } from '@/lib/commerce/types'

/**
 * Product gallery.
 *
 * A hamper needs at least four shots: styled, contents flat-lay, packaging
 * and something for scale. The ingest tool blocks a hamper with fewer, so
 * this component can assume they exist and does not build a "one image"
 * fallback layout that would only ever hide a data problem.
 *
 * The thumbnails are buttons rather than a carousel: no autoplay, no swipe
 * hijacking, and the whole thing works from the keyboard.
 */
export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0)

  // Follow the selected variant: choosing a variant that has its own image
  // jumps the gallery to it (variant images are part of `images`). Thumbnail
  // clicks still work independently for browsing the rest of the shots.
  const selectedVariantImageUrl = useVariantSelectionOptional()?.selectedVariant?.image?.url
  useEffect(() => {
    if (!selectedVariantImageUrl) return
    const index = images.findIndex((image) => image.url === selectedVariantImageUrl)
    if (index >= 0) setActive(index)
  }, [selectedVariantImageUrl, images])

  const current = images[active] ?? images[0]

  if (!current) {
    // min-w-0: as a grid item, an empty aspect-ratio box takes its minimum
    // width from its own ratio, and at 1024px it grew to ~1000px and pushed
    // the title and price off the right of the screen.
    return <div className="aspect-3/2 w-full min-w-0 bg-beige" role="presentation" />
  }

  return (
    <div>
      <StampFrame className="bg-beige">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt}
          width={current.width}
          height={current.height}
          priority
          sizes="(min-width: 1024px) 52vw, 92vw"
          className="aspect-3/2 w-full object-cover"
        />
      </StampFrame>

      {images.length > 1 ? (
        <ul className="mt-4 grid grid-cols-4 gap-3" aria-label={`More images of ${title}`}>
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-current={index === active}
                className={`block w-full border-2 transition-colors ${
                  index === active ? 'border-navy' : 'border-transparent hover:border-rule'
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={300}
                  height={200}
                  sizes="14vw"
                  className="aspect-3/2 w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
