'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addToCartAction } from '@/app/actions/cart'
import { Button } from '@/components/ui/Button'
import { trackAddToCart, toAnalyticsItem } from '@/lib/analytics/events'
import { formatMinor } from '@/lib/commerce/money'
import type { ProductCard } from '@/lib/commerce/types'

/**
 * "Add a greeting card", offered once a hamper is in the cart.
 *
 * Shown under the add-to-cart button straight after a hamper goes in, and
 * in the cart while it holds no card. One click adds the card; the gift
 * message the buyer writes in the cart is what goes inside it.
 *
 * It can render inside the add-to-cart form, so every button here is
 * type="button" and never submits it.
 */
export function CardUpsell({
  cards,
  title = 'Add a greeting card',
  lede = 'Pick a card and we will hand write your gift message inside it, in place of our postcard.',
}: {
  cards: ProductCard[]
  title?: string
  lede?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [added, setAdded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (cards.length === 0) return null

  function add(card: ProductCard) {
    if (!card.defaultVariantId) return
    const variantId = card.defaultVariantId
    setError(null)
    startTransition(async () => {
      const result = await addToCartAction({ lines: [{ variantId, quantity: 1 }], bottlesAdded: 0 })
      if (result.ok) {
        setAdded(card.id)
        const priceMinor = card.defaultVariantPriceMinor ?? card.priceRange.min.amountMinor
        trackAddToCart([toAnalyticsItem(card, 1)], { ...card.priceRange.min, amountMinor: priceMinor })
      } else {
        setError(result.message)
      }
      router.refresh()
    })
  }

  return (
    <section className="mt-8 border-t border-rule pt-6" aria-labelledby="card-upsell-title">
      <h2 id="card-upsell-title" className="font-serif text-xl text-navy">
        {title}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{lede}</p>

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <li key={card.id} className="flex flex-col">
            {card.image ? (
              <Image
                src={card.image.url}
                alt={card.image.alt}
                width={200}
                height={200}
                className="aspect-square w-full bg-white object-contain"
              />
            ) : null}
            <p className="mt-2 line-clamp-2 text-sm text-navy">{card.title}</p>
            <p className="text-sm text-ink-muted">
              {formatMinor(card.defaultVariantPriceMinor ?? card.priceRange.min.amountMinor)}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="small"
              className="mt-2"
              disabled={pending || added === card.id}
              onClick={() => add(card)}
            >
              {added === card.id ? 'Added' : 'Add card'}
            </Button>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red">
          {error}
        </p>
      ) : null}
    </section>
  )
}
