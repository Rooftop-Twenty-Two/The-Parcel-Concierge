'use client'

import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addBuiltHamperAction } from '@/app/actions/hamper-builder'
import { AgeGateDialog } from '@/components/commerce/AgeGateDialog'
import { Button } from '@/components/ui/Button'
import { InkWaves, StampFrame } from '@/components/ui/Stamp'
import { trackHamperBuilderStep } from '@/lib/analytics/events'
import { formatMinor } from '@/lib/commerce/money'
import type { Product, ProductCard } from '@/lib/commerce/types'
import { BOX_OPTIONS, RIBBON_COLOURS } from '@/lib/hamper-builder'
import { AGE_GATE } from '@/lib/site-config'

/**
 * The builder.
 *
 * One page, three steps, no wizard. A wizard hides the running total, and
 * the running total is the thing people are actually watching.
 *
 * The summary is sticky on desktop and pinned to the bottom on mobile, so
 * the price and the "add to cart" button are never off screen. Most gift
 * buying happens on a phone.
 */

type Category = {
  id: string
  label: string
  alcohol: boolean
  items: ProductCard[]
}

export function HamperBuilder({
  parent,
  categories,
}: {
  parent: Product
  categories: Category[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [boxId, setBoxId] = useState(BOX_OPTIONS[1]?.id ?? BOX_OPTIONS[0]!.id)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [giftMessage, setGiftMessage] = useState('')
  const [ribbonColour, setRibbonColour] = useState('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)
  const [showAgeGate, setShowAgeGate] = useState(false)

  const box = BOX_OPTIONS.find((b) => b.id === boxId) ?? BOX_OPTIONS[0]!
  const boxVariant =
    parent.variants.find((v) => v.title === box.variantTitle) ?? parent.variants[0]

  const allItems = useMemo(
    () => new Map(categories.flatMap((c) => c.items.map((item) => [item.id, item]))),
    [categories],
  )

  const chosen = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .flatMap(([id, qty]) => {
          const item = allItems.get(id)
          // A component with no variant id cannot be added to a cart. That
          // is a catalogue problem, so it is dropped here rather than being
          // allowed to fail silently at add-to-cart.
          return item?.defaultVariantId ? [{ item, quantity: qty }] : []
        }),
    [quantities, allItems],
  )

  const itemCount = chosen.reduce((sum, c) => sum + c.quantity, 0)
  const overCapacity = itemCount > box.capacity

  const contentsMinor = chosen.reduce(
    (sum, c) => sum + c.item.priceRange.min.amountMinor * c.quantity,
    0,
  )
  const totalMinor = contentsMinor + (boxVariant?.price.amountMinor ?? 0)

  const containsAlcohol = chosen.some(
    (c) => c.item.kind === 'wine' || c.item.kind === 'spirit',
  )

  function adjust(item: ProductCard, delta: number) {
    setStatus(null)
    setQuantities((current) => {
      const next = Math.max(0, (current[item.id] ?? 0) + delta)
      trackHamperBuilderStep('adjust_component', { handle: item.handle, quantity: next })
      if (next === 0) {
        const { [item.id]: _removed, ...rest } = current
        return rest
      }
      return { ...current, [item.id]: next }
    })
  }

  function addToCart() {
    if (!boxVariant) return

    if (containsAlcohol && !hasAgeCookie()) {
      setShowAgeGate(true)
      return
    }

    startTransition(async () => {
      const result = await addBuiltHamperAction({
        boxVariantId: boxVariant.id,
        boxId: box.id,
        components: chosen.map((c) => ({
          // Non-null by construction: `chosen` drops anything without one.
          variantId: c.item.defaultVariantId!,
          quantity: c.quantity,
        })),
        giftMessage,
        ribbonColour,
      })

      if (result.ok) {
        setStatus({ kind: 'ok', message: 'Added to cart' })
        trackHamperBuilderStep('added_to_cart', { itemCount, totalMinor })
        router.refresh()
      } else {
        setStatus({ kind: 'error', message: result.message })
        router.refresh()
      }
    })
  }

  return (
    <>
      {showAgeGate ? <AgeGateDialog minimumAge={AGE_GATE.minimumAge} context="cart" /> : null}

      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">Made to order</p>
          <h1 className="font-display text-[length:var(--text-hero)] leading-[0.92]">
            Build your own hamper
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/85">
            Pick the box, pick what goes in it, write the card. We pack it by hand here and send it
            out the same way we send everything else. Nothing is added until you say so, and you can
            see the running total the whole way through.
          </p>
        </div>
        <InkWaves className="h-14 w-full text-cream/25" lines={4} />
      </section>

      <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            {/* Step 1 */}
            <section aria-labelledby="step-box">
              <StepHeading number={1} id="step-box" title="Pick the box" />
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {BOX_OPTIONS.map((option) => {
                  const variant = parent.variants.find((v) => v.title === option.variantTitle)
                  const selected = option.id === boxId
                  return (
                    <li key={option.id}>
                      <label
                        className={`flex h-full cursor-pointer flex-col border p-5 transition-colors ${
                          selected ? 'border-navy bg-beige' : 'border-rule hover:border-navy/50'
                        }`}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="flex items-center gap-2 font-serif text-lg text-navy">
                            <input
                              type="radio"
                              name="box"
                              value={option.id}
                              checked={selected}
                              onChange={() => {
                                setBoxId(option.id)
                                trackHamperBuilderStep('choose_box', { box: option.id })
                              }}
                            />
                            {option.variantTitle}
                          </span>
                          <span className="font-serif text-lg text-navy">
                            {variant ? formatMinor(variant.price.amountMinor) : ''}
                          </span>
                        </span>
                        <span className="mt-2 text-sm text-ink-muted">{option.description}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Step 2 */}
            <section aria-labelledby="step-contents" className="mt-14">
              <StepHeading
                number={2}
                id="step-contents"
                title="Fill it"
                note={`${itemCount} of ${box.capacity} spaces used`}
              />

              {overCapacity ? (
                <p role="alert" className="mt-3 border border-red bg-red/5 px-4 py-3 text-sm text-red">
                  That is {itemCount - box.capacity} too many for {option(box.variantTitle)}. Take
                  something out, or move up a box size.
                </p>
              ) : null}

              <div className="mt-6 space-y-12">
                {categories.map((category) => (
                  <div key={category.id}>
                    <h3 className="font-display text-2xl text-navy">{category.label}</h3>
                    {category.alcohol ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        Adding any of these means we can only deliver to somebody over{' '}
                        {AGE_GATE.minimumAge}.
                      </p>
                    ) : null}
                    <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                      {category.items.map((item) => (
                        <li key={item.id}>
                          <ComponentTile
                            item={item}
                            quantity={quantities[item.id] ?? 0}
                            disabled={overCapacity && !quantities[item.id]}
                            onAdjust={(delta) => adjust(item, delta)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 3 */}
            <section aria-labelledby="step-finish" className="mt-14">
              <StepHeading number={3} id="step-finish" title="Finish it" />

              <div className="mt-5 max-w-xl space-y-6">
                <div>
                  <label htmlFor="builder-message" className="block text-sm font-medium text-navy">
                    Gift message
                  </label>
                  <p className="mt-1 text-xs text-ink-muted">
                    We write this by hand on a card inside the lid. Whatever you type is exactly
                    what we write.
                  </p>
                  <textarea
                    id="builder-message"
                    rows={3}
                    maxLength={250}
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="mt-2 w-full border border-rule bg-white px-3 py-2 text-base"
                  />
                  <p className="mt-1 text-xs text-ink-muted" aria-live="polite">
                    {250 - giftMessage.length} characters left
                  </p>
                </div>

                <div>
                  <label htmlFor="builder-ribbon" className="block text-sm font-medium text-navy">
                    Ribbon colour
                  </label>
                  <select
                    id="builder-ribbon"
                    value={ribbonColour}
                    onChange={(e) => setRibbonColour(e.target.value)}
                    className="mt-2 w-full border border-rule bg-white px-3 py-2 text-base sm:w-64"
                  >
                    <option value="">Whatever suits the box</option>
                    {RIBBON_COLOURS.map((colour) => (
                      <option key={colour} value={colour}>
                        {colour}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </div>

          <Summary
            box={box}
            boxPriceMinor={boxVariant?.price.amountMinor ?? 0}
            chosen={chosen}
            totalMinor={totalMinor}
            itemCount={itemCount}
            overCapacity={overCapacity}
            pending={pending}
            status={status}
            containsAlcohol={containsAlcohol}
            onRemove={(item) => adjust(item, -(quantities[item.id] ?? 0))}
            onAddToCart={addToCart}
          />
        </div>
      </div>
    </>
  )
}

function option(title: string): string {
  return title.charAt(0).toLowerCase() + title.slice(1)
}

function hasAgeCookie(): boolean {
  if (typeof document === 'undefined') return false
  // The real cookie is httpOnly and cannot be read here, so this is only a
  // fast path. The server action and the page-level gate are what actually
  // enforce it.
  return document.cookie.includes(`${AGE_GATE.cookieName}=true`)
}

function StepHeading({
  number,
  id,
  title,
  note,
}: {
  number: number
  id: string
  title: string
  note?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-3">
      <h2 id={id} className="flex items-baseline gap-3 font-display text-3xl text-navy">
        <span className="text-green">{number}</span>
        {title}
      </h2>
      {note ? (
        <p className="text-sm text-ink-muted" aria-live="polite">
          {note}
        </p>
      ) : null}
    </div>
  )
}

function ComponentTile({
  item,
  quantity,
  disabled,
  onAdjust,
}: {
  item: ProductCard
  quantity: number
  disabled: boolean
  onAdjust: (delta: number) => void
}) {
  return (
    <div className={`border p-3 ${quantity ? 'border-navy bg-beige' : 'border-rule'}`}>
      <StampFrame size="small" className="bg-cream">
        {item.image ? (
          <Image
            src={item.image.url}
            alt={item.image.alt}
            width={item.image.width}
            height={item.image.height}
            sizes="(min-width: 768px) 18vw, 40vw"
            className="aspect-4/3 w-full object-cover"
          />
        ) : null}
      </StampFrame>

      <h4 className="mt-2 text-sm leading-snug text-navy">{item.title}</h4>
      <p className="text-sm text-ink-muted">{formatMinor(item.priceRange.min.amountMinor)}</p>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAdjust(-1)}
          disabled={quantity === 0}
          className="h-8 w-8 border border-rule text-navy disabled:opacity-40"
          aria-label={`Remove one ${item.title}`}
        >
          −
        </button>
        <span className="w-6 text-center text-sm" aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => onAdjust(1)}
          disabled={disabled}
          className="h-8 w-8 border border-rule text-navy disabled:opacity-40"
          aria-label={`Add one ${item.title}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function Summary({
  box,
  boxPriceMinor,
  chosen,
  totalMinor,
  itemCount,
  overCapacity,
  pending,
  status,
  containsAlcohol,
  onRemove,
  onAddToCart,
}: {
  box: (typeof BOX_OPTIONS)[number]
  boxPriceMinor: number
  chosen: { item: ProductCard; quantity: number }[]
  totalMinor: number
  itemCount: number
  overCapacity: boolean
  pending: boolean
  status: { kind: 'ok' | 'error'; message: string } | null
  containsAlcohol: boolean
  onRemove: (item: ProductCard) => void
  onAddToCart: () => void
}) {
  return (
    <aside className="lg:sticky lg:top-40 lg:self-start">
      <div className="border border-navy/20 bg-beige p-6">
        <h2 className="font-display text-2xl text-navy">Your hamper</h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3 border-b border-rule pb-2">
            <dt className="text-navy">{box.variantTitle}</dt>
            <dd className="text-ink-muted">{formatMinor(boxPriceMinor)}</dd>
          </div>

          {chosen.length ? (
            chosen.map(({ item, quantity }) => (
              <div key={item.id} className="flex justify-between gap-3">
                <dt className="min-w-0 text-navy">
                  {quantity > 1 ? `${quantity} × ` : ''}
                  {item.title}
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    className="ml-2 text-xs text-ink-muted underline underline-offset-2 hover:text-red"
                  >
                    remove
                  </button>
                </dt>
                <dd className="shrink-0 text-ink-muted">
                  {formatMinor(item.priceRange.min.amountMinor * quantity)}
                </dd>
              </div>
            ))
          ) : (
            <p className="pt-1 text-ink-muted">Nothing in it yet.</p>
          )}
        </dl>

        <div className="mt-5 flex items-baseline justify-between border-t border-rule pt-4">
          <span className="font-serif text-lg text-navy">Total</span>
          <span className="font-serif text-2xl text-navy">{formatMinor(totalMinor)}</span>
        </div>

        <Button
          type="button"
          size="large"
          className="mt-5 w-full"
          disabled={pending || itemCount === 0 || overCapacity}
          onClick={onAddToCart}
        >
          {pending ? 'One moment' : 'Add to cart'}
        </Button>

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

        {containsAlcohol ? (
          <p className="mt-3 text-xs text-ink-muted">
            This box contains alcohol, so we can only deliver it to somebody over{' '}
            {AGE_GATE.minimumAge}.
          </p>
        ) : null}

        <p className="mt-4 border-t border-rule pt-4 text-xs text-ink-muted">
          Free hand delivery in our local area, €7.95 anywhere else in Ireland. We pack this one to
          order, so allow an extra working day.
        </p>
      </div>
    </aside>
  )
}
