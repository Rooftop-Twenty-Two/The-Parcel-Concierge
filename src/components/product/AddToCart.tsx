'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { addToCartAction } from '@/app/actions/cart'
import { useVariantSelection } from '@/components/product/VariantSelector'
import { Button } from '@/components/ui/Button'
import { trackAddToCart, toAnalyticsItem } from '@/lib/analytics/events'
import { formatMoney } from '@/lib/commerce/money'
import { DELIVERY } from '@/lib/site-config'
import type { CartLineAttribute, PersonalisationOption, Product } from '@/lib/commerce/types'

/**
 * How high the quantity menu counts. Ten is the cart's own ceiling, so the
 * two agree; a bottle stops at the per-order limit instead, because picking
 * a number the order can never carry is a rejection waiting to happen.
 *
 * This is a courtesy, not the enforcement. addToCartAction re-checks the
 * bottle limit against the whole cart and the stock against Shopify, and it
 * is the one that decides — a menu cannot know what is already in the cart.
 */
function maxQuantity(isBottle: boolean): number {
  const bottles = DELIVERY.maxBottlesPerOrder
  return isBottle && bottles !== null ? Math.min(10, bottles) : 10
}

/**
 * Add to cart, with personalisation.
 *
 * Personalisation travels as cart line attributes so it survives into the
 * Shopify order and reaches the packing bench. It is not stored in a
 * separate system that somebody has to remember to check.
 *
 * The button says "Add to hamper" on an add-on and "Add to cart" elsewhere,
 * and the confirmation matches the button word for word.
 */
export function AddToCart({
  product,
  label = 'Add to cart',
  confirmation = 'Added to cart',
  afterAdded,
}: {
  product: Product
  label?: string
  confirmation?: string
  /**
   * Shown once this product is in the cart, e.g. the greeting card offer.
   * Its buttons must be type="button": it renders inside this form.
   */
  afterAdded?: React.ReactNode
}) {
  const router = useRouter()
  const quantityId = useId()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)

  // The variant comes from the shared selection so the button always adds the
  // variant the shopper picked, at the price it shows.
  const { selectedVariant: variant } = useVariantSelection()
  const options = product.hamper?.personalisation ?? []
  const isBottle = product.kind === 'wine' || product.kind === 'spirit'

  function attributesFromValues(): CartLineAttribute[] {
    return Object.entries(values)
      .filter(([, value]) => value.trim().length > 0)
      .map(([key, value]) => ({ key, value: value.trim() }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!variant) return

    startTransition(async () => {
      const result = await addToCartAction({
        lines: [{ variantId: variant.id, quantity, attributes: attributesFromValues() }],
        // The page knows what it is selling; the cart only learns once the
        // line is written. See DELIVERY.maxBottlesPerOrder. Three bottles
        // is three against the limit, so this counts the quantity rather
        // than the line.
        bottlesAdded: isBottle ? quantity : 0,
      })

      if (result.ok) {
        setStatus({ kind: 'ok', message: confirmation })
        trackAddToCart([toAnalyticsItem(product, quantity)], {
          ...variant.price,
          amountMinor: variant.price.amountMinor * quantity,
        })
        // Back to one. Otherwise a second click on a page that still reads
        // "3" quietly adds three more, and the first thing the shopper
        // knows about it is the cart.
        setQuantity(1)
        router.refresh()
      } else {
        setStatus({ kind: 'error', message: result.message })
        // The listing the shopper came from is now wrong. Refresh so they
        // are not looking at a page that still says it is in stock.
        router.refresh()
      }
    })
  }

  if (!variant) return null

  const soldOut = !variant.availableForSale
  const max = maxQuantity(isBottle)

  return (
    <form onSubmit={onSubmit} className="mt-8">
      {options.length ? (
        <fieldset className="mb-6 space-y-5 border-t border-rule pt-6">
          <legend className="sr-only">Personalise this gift</legend>
          {options.map((option) => (
            <PersonalisationField
              key={option.label}
              option={option}
              value={values[option.label] ?? ''}
              onChange={(value) => setValues((v) => ({ ...v, [option.label]: value }))}
            />
          ))}
        </fieldset>
      ) : null}

      {/* Quantity sits beside the button rather than above it, so the two
          decisions — how many, and buy — read as one action. items-end
          lines the button up with the foot of the select, since the select
          carries a label and the button does not. */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={quantityId} className="mb-2 block text-sm font-medium text-navy">
            Quantity
          </label>
          <select
            id={quantityId}
            value={quantity}
            disabled={pending || soldOut}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="border border-rule bg-white px-4 py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Array.from({ length: max }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          size="large"
          disabled={pending || soldOut}
          className="min-w-0 flex-1 sm:flex-none"
        >
          {soldOut
            ? 'Sold out'
            : pending
              ? 'One moment'
              : `${label}, ${formatMoney({
                  ...variant.price,
                  amountMinor: variant.price.amountMinor * quantity,
                })}`}
        </Button>
      </div>

      {status ? (
        <p
          role="status"
          className={`mt-3 text-sm ${status.kind === 'error' ? 'text-red' : 'text-green'}`}
        >
          {status.message}
          {status.kind === 'ok' ? (
            <>
              {' '}
              <a href="/cart" className="underline underline-offset-4">
                Go to your cart
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {status?.kind === 'ok' ? afterAdded : null}
    </form>
  )
}

function PersonalisationField({
  option,
  value,
  onChange,
}: {
  option: PersonalisationOption
  value: string
  onChange: (value: string) => void
}) {
  const id = `personalisation-${option.kind}`

  if (option.kind === 'gift-message') {
    const remaining = option.maxLength - value.length
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-navy">
          {option.label}
        </label>
        <p className="mt-1 text-xs text-ink-muted">
          We write this by hand on a card inside the lid. Leave it blank if you would rather not.
        </p>
        <textarea
          id={id}
          rows={3}
          maxLength={option.maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-rule bg-white px-3 py-2 text-base"
        />
        <p className="mt-1 text-xs text-ink-muted" aria-live="polite">
          {remaining} characters left
        </p>
      </div>
    )
  }

  if (option.kind === 'ribbon-colour') {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-navy">
          {option.label}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-rule bg-white px-3 py-2 text-base sm:w-64"
        >
          <option value="">Whatever suits the box</option>
          {option.choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={value === 'Yes'}
        onChange={(e) => onChange(e.target.checked ? 'Yes' : '')}
        className="mt-1 h-4 w-4"
      />
      <label htmlFor={id} className="text-sm text-navy">
        {option.label}
        <span className="block text-xs text-ink-muted">
          We will be in touch about artwork after you order.
        </span>
      </label>
    </div>
  )
}
