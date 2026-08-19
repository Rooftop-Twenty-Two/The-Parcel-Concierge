'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { removeLineAction, setGiftMessageAction, updateLineAction } from '@/app/actions/cart'
import { Button } from '@/components/ui/Button'
import {
  toAnalyticsItem,
  trackCheckoutHandoff,
  trackViewCart,
} from '@/lib/analytics/events'
import { formatMoney, formatMinor } from '@/lib/commerce/money'
import type { Cart } from '@/lib/commerce/types'
import { DELIVERY } from '@/lib/site-config'

/**
 * Cart contents, the free-delivery nudge, the gift message and the handoff.
 *
 * The handoff is a plain link to Shopify's checkoutUrl. We do not build a
 * checkout, and we do not try to keep the shopper on our domain through it.
 * What we do instead is fire the handoff event here and leave the purchase
 * event to Shopify, so revenue is counted once rather than twice across the
 * domain change.
 */
export function CartView({ cart }: { cart: Cart }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState(
    cart.lines.flatMap((l) => l.attributes).find((a) => a.key === 'Gift message')?.value ?? '',
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    trackViewCart(
      cart.lines.map((line) =>
        toAnalyticsItem(
          {
            handle: line.productHandle,
            title: line.productTitle,
            kind: 'hamper',
            priceRange: { min: line.unitPrice, max: line.unitPrice },
          },
          line.quantity,
        ),
      ),
      cart.subtotal,
    )
    // Fires once per cart state, which is what GA4 expects for view_cart.
  }, [cart])

  function onCheckout() {
    trackCheckoutHandoff(
      cart.lines.map((line) =>
        toAnalyticsItem(
          {
            handle: line.productHandle,
            title: line.productTitle,
            kind: 'hamper',
            priceRange: { min: line.unitPrice, max: line.unitPrice },
          },
          line.quantity,
        ),
      ),
      cart.subtotal,
    )
  }

  return (
    <div>
      <FreeDeliveryNudge subtotalMinor={cart.subtotal.amountMinor} />

      <ul className="divide-y divide-rule border-y border-rule">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex gap-4 py-5">
            {line.image ? (
              <Link href={`/hampers/${line.productHandle}`} className="shrink-0">
                <Image
                  src={line.image.url}
                  alt={line.image.alt}
                  width={120}
                  height={150}
                  className="h-24 w-20 object-cover"
                />
              </Link>
            ) : null}

            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg text-navy">{line.productTitle}</h2>
              {line.variantTitle ? (
                <p className="text-sm text-ink-muted">{line.variantTitle}</p>
              ) : null}

              {/*
                Personalisation is shown back to the shopper here, because
                it travels to the packing bench on the order and this is
                their last chance to notice a typo in it.
              */}
              {line.attributes.length ? (
                <dl className="mt-2 space-y-0.5 text-sm text-ink-muted">
                  {line.attributes.map((attribute) => (
                    <div key={attribute.key} className="flex gap-2">
                      <dt className="text-navy">{attribute.key}:</dt>
                      <dd className="min-w-0 break-words">{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-ink-muted">
                  <span className="sr-only">Quantity of {line.productTitle}</span>
                  <select
                    value={line.quantity}
                    disabled={pending}
                    onChange={(event) =>
                      startTransition(async () => {
                        await updateLineAction(line.id, Number(event.target.value))
                      })
                    }
                    className="border border-rule bg-white px-2 py-1"
                  >
                    {Array.from({ length: 10 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await removeLineAction(line.id)
                    })
                  }
                  className="text-sm text-ink-muted underline underline-offset-4 hover:text-red"
                >
                  Remove
                </button>
              </div>
            </div>

            <p className="shrink-0 font-serif text-lg text-navy">{formatMoney(line.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <label htmlFor="cart-gift-message" className="block font-serif text-lg text-navy">
          Gift message
        </label>
        <p className="mt-1 text-sm text-ink-muted">
          We write this by hand on a card inside the lid. Whatever you type is exactly what we
          write.
        </p>
        <textarea
          id="cart-gift-message"
          rows={3}
          maxLength={250}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value)
            setSaved(false)
          }}
          className="mt-2 w-full border border-rule bg-white px-3 py-2 text-base"
        />
        <div className="mt-2 flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setGiftMessageAction(message)
                setSaved(true)
              })
            }
          >
            Save message
          </Button>
          {saved ? (
            <span role="status" className="text-sm text-green">
              Saved
            </span>
          ) : null}
        </div>
      </section>

      <div className="mt-10 border-t border-rule pt-6">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-xl text-navy">Subtotal</span>
          <span className="font-serif text-2xl text-navy">{formatMoney(cart.subtotal)}</span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Delivery is worked out at checkout, once we know where it is going.
        </p>

        <a
          href={cart.checkoutUrl}
          onClick={onCheckout}
          className="mt-6 block bg-red px-6 py-4 text-center text-lg text-cream transition-colors hover:bg-wine"
        >
          Go to checkout
        </a>

        <p className="mt-3 text-center text-xs text-ink-muted">
          Checkout is handled by Shopify. Your card details never touch our servers.
        </p>
      </div>
    </div>
  )
}

/**
 * The free-delivery progress nudge.
 *
 * Renders only when a threshold has been set. There is no threshold
 * configured yet (see site-config), and a nudge towards a number nobody has
 * agreed to is worse than no nudge, so this returns null rather than
 * guessing one.
 */
function FreeDeliveryNudge({ subtotalMinor }: { subtotalMinor: number }) {
  const threshold = DELIVERY.freeDeliveryThresholdMinor
  if (threshold === null) return null

  const remaining = threshold - subtotalMinor
  const progress = Math.min(100, Math.round((subtotalMinor / threshold) * 100))

  return (
    <div className="mb-6 border border-green/30 bg-green/5 px-4 py-3">
      <p className="text-sm text-navy">
        {remaining > 0
          ? `Spend ${formatMinor(remaining)} more and delivery is on us.`
          : 'Delivery is on us.'}
      </p>
      <div
        className="mt-2 h-1.5 w-full bg-green/15"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress towards free delivery"
      >
        <div className="h-full bg-green transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
